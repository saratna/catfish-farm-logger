import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as Print from "expo-print";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import type { DriveExport, FishPhoto, WeeklyReportExport } from "@/lib/farm-store";

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
  uploadedWeeklyReportCount: number;
  weeklyReportGeneratedAt?: string;
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

async function preparePhotoForUpload(photo: FishPhoto, exportPayload: DriveExport) {
  if (photo.compressedUploadUri) return photo.compressedUploadUri;
  const settings = exportPayload.settings;
  if (!settings.photoCompressionEnabled && !settings.lowBandwidthMode) return photo.uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: settings.photoMaxUploadWidth } }],
      { compress: settings.photoCompressionQuality, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return photo.uri;
  }
}

function peso(value: number) {
  return `PHP ${Math.round(value).toLocaleString()}`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function weeklyReportHtml(report: WeeklyReportExport) {
  const rows = report.tankSummaries.map((tank) => `<tr><td>${escapeHtml(tank.tankName)}</td><td>${tank.inspections}</td><td>${tank.feedKg.toFixed(1)} kg</td><td>${tank.growthRecords}</td><td>${peso(tank.cost)}</td><td>${peso(tank.sales)}</td><td>${peso(tank.grossProfit)}</td></tr>`).join("");
  const alerts = report.alerts.length ? report.alerts.map((alert) => `<li><strong>${escapeHtml(alert.severity.toUpperCase())}: ${escapeHtml(alert.title)}</strong><br/>${escapeHtml(alert.action)}</li>`).join("") : "<li>No active alerts at report generation time.</li>";
  return `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;padding:28px;}h1{color:#075985;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;}th{background:#e0f2fe}.cards{display:flex;flex-wrap:wrap;gap:10px}.card{border:1px solid #cbd5e1;border-radius:12px;padding:10px;min-width:145px}.muted{color:#64748b;font-size:12px}</style></head><body><h1>${escapeHtml(report.title)}</h1><p class="muted">${new Date(report.weekStart).toDateString()} to ${new Date(report.weekEnd).toDateString()} · generated ${new Date(report.generatedAt).toLocaleString()}</p><div class="cards"><div class="card"><b>Inspections</b><br/>${report.summary.inspectionCount}</div><div class="card"><b>Feedings</b><br/>${report.summary.feedingCount}</div><div class="card"><b>Photos</b><br/>${report.summary.photoCount}</div><div class="card"><b>Gross profit</b><br/>${peso(report.summary.grossProfit)}</div><div class="card"><b>Active alerts</b><br/>${report.summary.activeAlertCount}</div></div><h2>Tank summary</h2><table><thead><tr><th>Tank</th><th>Inspections</th><th>Feed</th><th>Growth</th><th>Cost</th><th>Sales</th><th>Profit</th></tr></thead><tbody>${rows}</tbody></table><h2>Current alert actions</h2><ul>${alerts}</ul><p class="muted">This report was generated from records stored locally on the phone. It uploads automatically when Google Drive sync succeeds.</p></body></html>`;
}

async function createWeeklyReportPdf(directory: string, report: WeeklyReportExport) {
  const html = weeklyReportHtml(report);
  const pdf = await Print.printToFileAsync({ html, base64: false });
  const fileName = `weekly-report-${report.weekStart.slice(0, 10)}.pdf`;
  const targetUri = `${directory}${fileName}`;
  await FileSystem.copyAsync({ from: pdf.uri, to: targetUri });
  return { uri: targetUri, fileName };
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
  let uploadedWeeklyReportCount = 0;
  let weeklyReportGeneratedAt: string | undefined;

  if (exportPayload.weeklyReport) {
    const reportFolderId = await ensureFolder("weekly-reports", rootFolderId, accessToken);
    const report = await createWeeklyReportPdf(tempDirectory, exportPayload.weeklyReport);
    await uploadLocalFile(accessToken, reportFolderId, report.fileName, report.uri, "application/pdf");
    uploadedWeeklyReportCount += 1;
    weeklyReportGeneratedAt = exportPayload.weeklyReport.generatedAt;
  }

  for (const tankExport of exportPayload.tanks) {
    const tankFolderName = tankExport.folder.split("/").pop() ?? tankExport.tank.name;
    const tankFolderId = await ensureFolder(tankFolderName, rootFolderId, accessToken);
    const photoFolderId = await ensureFolder("photos", tankFolderId, accessToken);

    const files = [
      { name: "tank.json", value: tankExport.tank },
      { name: "inspections.json", value: tankExport.inspections },
      { name: "feedings.json", value: tankExport.feedings },
      { name: "photos.json", value: tankExport.photos },
      { name: "growth-measurements.json", value: tankExport.growthMeasurements },
      { name: "photo-assessments.json", value: tankExport.photoAssessments },
      { name: "costs.json", value: tankExport.costEntries },
      { name: "sales.json", value: tankExport.saleRecords },
      { name: "economics-summary.json", value: { costCount: tankExport.costEntries.length, saleCount: tankExport.saleRecords.length } },
      { name: "management-alert.json", value: tankExport.managementAlert },
      { name: "monthly-trend.json", value: tankExport.monthlyTrend },
      { name: "improvement-checklist.json", value: tankExport.improvementChecklist },
      { name: "sync-log.json", value: { generatedAt: exportPayload.generatedAt, folder: tankExport.folder } },
    ];

    for (const file of files) {
      const uri = await writeJsonExportFile(tempDirectory, `${tankExport.tank.id}-${file.name}`, file.value);
      await uploadLocalFile(accessToken, tankFolderId, file.name, uri, "application/json");
      uploadedFileCount += 1;
    }

    for (let index = 0; index < tankExport.photos.length; index += 1) {
      const photo = tankExport.photos[index];
      const uploadUri = await preparePhotoForUpload(photo, exportPayload);
      await uploadLocalFile(accessToken, photoFolderId, getPhotoFileName(photo, index), uploadUri, getPhotoMimeType(photo));
      uploadedPhotoCount += 1;
    }
  }

  return { rootFolderId, uploadedFileCount, uploadedPhotoCount, uploadedWeeklyReportCount, weeklyReportGeneratedAt } satisfies GoogleDriveSyncResult;
}
