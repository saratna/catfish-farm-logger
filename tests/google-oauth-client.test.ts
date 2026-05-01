import "../scripts/load-env.js";
import { describe, expect, it } from "vitest";

function buildIosRedirectUri(clientId: string) {
  const reversedClientId = clientId.replace(/\.apps\.googleusercontent\.com$/, "").split(".").reverse().join(".");
  return `${reversedClientId}:/oauth2redirect/google`;
}

describe("Google OAuth client configuration", () => {
  it("has a valid-looking iOS OAuth client ID", () => {
    const clientId = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

    expect(clientId).toBeDefined();
    expect(clientId).toMatch(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
  });

  it("is accepted by the Google OAuth authorization endpoint for Drive scope", async () => {
    const clientId = process.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
    expect(clientId).toBeDefined();

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId ?? "");
    url.searchParams.set("redirect_uri", buildIosRedirectUri(clientId ?? ""));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
    url.searchParams.set("state", "vitest_config_probe");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    const response = await fetch(url, { method: "GET", redirect: "manual" });

    expect([200, 302, 303]).toContain(response.status);
    const body = response.status === 200 ? await response.text() : "";
    expect(body).not.toContain("invalid_client");
    expect(body).not.toContain("unauthorized_client");
  }, 15000);
});
