import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { readFileSync } from "node:fs";

import { cookies } from "next/headers";

type SessionPayload = {
  username: string;
  expiresAt: number;
};

export const ADMIN_SESSION_COOKIE = "perfoumer-admin-session";
export const STAFF_SESSION_COOKIE = "perfoumer-staff-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

let cachedFileEnv: Record<string, string> | null = null;

function parseEnvFile(filePath: string) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const result: Record<string, string> = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (!key) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

function getFileEnv() {
  if (cachedFileEnv) {
    return cachedFileEnv;
  }

  const root = process.cwd();
  const fromEnv = parseEnvFile(path.join(root, ".env"));
  const fromEnvLocal = parseEnvFile(path.join(root, ".env.local"));

  cachedFileEnv = { ...fromEnv, ...fromEnvLocal };
  return cachedFileEnv;
}

function getEnvValue(key: string) {
  const direct = process.env[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const fromFile = getFileEnv()[key];
  return typeof fromFile === "string" ? fromFile : "";
}

function getSessionSecret() {
  return getEnvValue("ADMIN_SESSION_SECRET") || getEnvValue("ADMIN_PASSWORD") || "change-this-admin-secret";
}

function getStaffSessionSecret() {
  return getEnvValue("STAFF_SESSION_SECRET") || "change-this-staff-secret";
}

function getStaffPassword() {
  return getEnvValue("STAFF_PASSWORD");
}

export function isAdminConfigured() {
  return Boolean(getEnvValue("ADMIN_PASSWORD").trim());
}

export function isStaffConfigured() {
  return Boolean(getStaffPassword().trim());
}

export function getAdminUsername() {
  return (getEnvValue("ADMIN_USERNAME") || "admin").trim();
}

export function getStaffUsername() {
  return (getEnvValue("STAFF_USERNAME") || "staff").trim();
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function signStaff(value: string) {
  return createHmac("sha256", getStaffSessionSecret()).update(value).digest("hex");
}

function encode(payload: SessionPayload) {
  const raw = `${payload.username}:${payload.expiresAt}`;
  const signature = sign(raw);
  return Buffer.from(`${raw}:${signature}`).toString("base64url");
}

function encodeStaff(payload: SessionPayload) {
  const raw = `${payload.username}:${payload.expiresAt}`;
  const signature = signStaff(raw);
  return Buffer.from(`${raw}:${signature}`).toString("base64url");
}

function decode(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresAtRaw, signature] = decoded.split(":");

    if (!username || !expiresAtRaw || !signature) {
      return null;
    }

    const raw = `${username}:${expiresAtRaw}`;
    const expectedSignature = sign(raw);
    const givenBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (givenBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(givenBuffer, expectedBuffer)) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return { username, expiresAt };
  } catch {
    return null;
  }
}

function decodeStaff(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiresAtRaw, signature] = decoded.split(":");

    if (!username || !expiresAtRaw || !signature) {
      return null;
    }

    const raw = `${username}:${expiresAtRaw}`;
    const expectedSignature = signStaff(raw);
    const givenBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (givenBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(givenBuffer, expectedBuffer)) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    return { username, expiresAt };
  } catch {
    return null;
  }
}

export function verifyAdminCredentials(username: string, password: string) {
  const configuredPassword = getEnvValue("ADMIN_PASSWORD");
  if (!configuredPassword) {
    return false;
  }

  const expectedUsername = getAdminUsername();
  return username.trim() === expectedUsername && password === configuredPassword;
}

export function verifyStaffCredentials(username: string, password: string) {
  const configuredPassword = getStaffPassword();
  if (!configuredPassword) {
    return false;
  }

  const expectedUsername = getStaffUsername();
  return username.trim() === expectedUsername && password === configuredPassword;
}

export function createAdminSessionToken(username: string) {
  return encode({
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

export function createStaffSessionToken(username: string) {
  return encodeStaff({
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  });
}

export function validateAdminSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  return decode(token) !== null;
}

export function validateStaffSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  return decodeStaff(token) !== null;
}

export function getAdminSessionIdentity(token: string | undefined) {
  if (!token) {
    return null;
  }

  return decode(token);
}

export function getStaffSessionIdentity(token: string | undefined) {
  if (!token) {
    return null;
  }

  return decodeStaff(token);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return validateAdminSessionToken(token);
}

export async function isStaffAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  return validateStaffSessionToken(token);
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getStaffSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
