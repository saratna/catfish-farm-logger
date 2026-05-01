import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import type { DriveExport, FishPhoto } from "@/lib/farm-store";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID ?? "";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_STORAGE_KEY = "catfish-farm-google-drive-token-v1";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";

export type GoogleDriveTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

export type GoogleDriveSyncResult = {
  rootFolderId: string;
  uploadedFileCount: number;
  uploadedPhotoCount: number;
};

function getPlatformGoogleOAuthClientId() {
  if (Platform.OS === "android") return GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID;
  return GOOGLE_IOS_CLIENT_ID;
}

function assertClientId() {
  const clientId = getPlatformGoogleOAuthClientId();
  if (!clientId) {
    throw new Error("Google OAuth client ID is not configured. Set VITE_GOOGLE_ANDROID_OAUTH_CLIENT_ID for Android or VITE_GOOGLE_OAUTH_CLIENT_ID for iOS before building the app.");
  }
}

export function getGoogleOAuthClientId() {
  return getPlatformGoogleOAuthClientId();
}

export function getGoogleReversedClientId(clientId = getPlatformGoogleOAuthClientId()) {
  assertClientId();
  return clientId.replace(/\.apps\.googleusercontent\.com$/, "").split(".").reverse().join(".");
}

export function getGoogleRedirectUri() {
  return `${getGoogleReversedClientId()}:/oauth2redirect/google`;
}

function base64Url(value: string) {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createPkcePair() {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = bytesToHex(randomBytes);
  const challengeBase64 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  return { verifier, challenge: base64Url(challengeBase64) };
}

async function saveTokenSet(tokenSet: GoogleDriveTokenSet) {
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, JSON.stringify(tokenSet));
}

export async function getStoredGoogleDriveTokenSet() {
  const raw = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as GoogleDriveTokenSet) : null;
}

export async function clearGoogleDriveTokens() {
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}

async function exchangeCodeForTokens(code: string, verifier: string) {
  const body = new URLSearchParams({
    client_id: getGoogleOAuthClientId(),
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: getGoogleRedirectUri(),
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error_description ?? json.error ?? "Failed to exchange Google OAuth code.");
  }

  const tokenSet: GoogleDriveTokenSet = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000 - 60_000,
  };
  await saveTokenSet(tokenSet);
  return tokenSet;
}

async function refreshAccessToken(tokenSet: GoogleDriveTokenSet) {
  if (!tokenSet.refreshToken) return tokenSet;

  const body = new URLSearchParams({
    client_id: getGoogleOAuthClientId(),
    grant_type: "refresh_token",
    refresh_token: tokenSet.refreshToken,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await response.json();

  if (!response.ok) {
    await clearGoogleDriveTokens();
    throw new Error(json.error_description ?? json.error ?? "Failed to refresh Google Drive access token.");
  }

  const refreshed: GoogleDriveTokenSet = {
    accessToken: json.access_token,
    refreshToken: tokenSet.refreshToken,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000 - 60_000,
  };
  await saveTokenSet(refreshed);
  return refreshed;
}

export async function getValidGoogleDriveAccessToken() {
  assertClientId();
  const tokenSet = await getStoredGoogleDriveTokenSet();
  if (!tokenSet) return null;
  const validSet = tokenSet.expiresAt > Date.now() ? tokenSet : await refreshAccessToken(tokenSet);
  return validSet.accessToken;
}

export async function connectGoogleDrive() {
  assertClientId();
  const { verifier, challenge } = await createPkcePair();
  const state = Crypto.randomUUID();
  const redirectUri = getGoogleRedirectUri();
  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", getGoogleOAuthClientId());
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", DRIVE_SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectUri);
  if (result.type !== "success") {
    throw new Error("Google Drive authorization was cancelled or did not complete.");
  }

  const callbackUrl = new URL(result.url);
  const error = callbackUrl.searchParams.get("error");
  if (error) {
    throw new Error(error);
  }

  const callbackState = callbackUrl.searchParams.get("state");
  if (callbackState !== state) {
    throw new Error("Google OAuth state did not match. Please try connecting again.");
  }

  const code = callbackUrl.searchParams.get("code");
  if (!code) {
    throw new Error("Google OAuth did not return an authorization code.");
  }

  return exchangeCodeForTokens(code, verifier);
}

async function driveFetch<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message ?? "Google Drive API request failed.");
  }
  return json as T;
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFolder(name: string, parentId: string | null, accessToken: string) {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const query = `name = '${escapeDriveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`;
  const url = new URL(DRIVE_FILES_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("spaces", "drive");
  const result = await driveFetch<{ files: Array<{ id: string; name: string }> }>(url.toString(), accessToken);
  return result.files[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string | null, accessToken: string) {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const result = await driveFetch<{ id: string }>(DRIVE_FILES_ENDPOINT, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  return result.id;
}

async function ensureFolder(name: string, parentId: string | null, accessToken: string) {
  return (await findFolder(name, parentId, accessToken)) ?? createFolder(name, parentId, accessToken);
}

async function uploadLocalFile(accessToken: string, parentId: string, name: string, uri: string, mimeType: string) {
  const formData = new FormData();
  formData.append("metadata", new Blob([JSON.stringify({ name, parents: [parentId] })], { type: "application/json" }));
  formData.append("file", { uri, name, type: mimeType } as unknown as Blob);

  const response = await fetch(`${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,name`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message ?? `Failed to upload ${name} to Google Drive.`);
  }
  return json as { id: string; name: string };
}

async function writeJsonExportFile(directory: string, fileName: string, value: unknown) {
  const uri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(value, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}

function getPhotoMimeType(photo: FishPhoto) {
  const lower = photo.uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function getPhotoFileName(photo: FishPhoto, index: number) {
  const lower = photo.uri.toLowerCase();
  const extension = lower.endsWith(".png") ? "png" : lower.endsWith(".heic") ? "heic" : "jpg";
  return `${String(index + 1).padStart(3, "0")}_${photo.id}.${extension}`;
}

export async function uploadFarmExportToGoogleDrive(exportPayload: DriveExport) {
  const accessToken = await getValidGoogleDriveAccessToken();
  if (!accessToken) {
    throw new Error("Google Drive is not connected. Please connect your Google account first.");
  }

  const tempDirectory = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}drive-sync/`;
  await FileSystem.makeDirectoryAsync(tempDirectory, { intermediates: true });

  const rootFolderId = await ensureFolder(exportPayload.rootFolder, null, accessToken);
  const summaryUri = await writeJsonExportFile(tempDirectory, "catfish-farm-export.json", exportPayload);
  await uploadLocalFile(accessToken, rootFolderId, "catfish-farm-export.json", summaryUri, "application/json");

  let uploadedFileCount = 1;
  let uploadedPhotoCount = 0;

  for (const tankExport of exportPayload.tanks) {
    const tankFolderName = tankExport.folder.split("/").pop() ?? tankExport.tank.name;
    const tankFolderId = await ensureFolder(tankFolderName, rootFolderId, accessToken);
    const photoFolderId = await ensureFolder("photos", tankFolderId, accessToken);

    const files = [
      { name: "tank.json", value: tankExport.tank },
      { name: "inspections.json", value: tankExport.inspections },
      { name: "feedings.json", value: tankExport.feedings },
      { name: "photos.json", value: tankExport.photos },
      { name: "sync-log.json", value: { generatedAt: exportPayload.generatedAt, folder: tankExport.folder } },
    ];

    for (const file of files) {
      const uri = await writeJsonExportFile(tempDirectory, `${tankExport.tank.id}-${file.name}`, file.value);
      await uploadLocalFile(accessToken, tankFolderId, file.name, uri, "application/json");
      uploadedFileCount += 1;
    }

    for (let index = 0; index < tankExport.photos.length; index += 1) {
      const photo = tankExport.photos[index];
      await uploadLocalFile(accessToken, photoFolderId, getPhotoFileName(photo, index), photo.uri, getPhotoMimeType(photo));
      uploadedPhotoCount += 1;
    }
  }

  return { rootFolderId, uploadedFileCount, uploadedPhotoCount } satisfies GoogleDriveSyncResult;
}
