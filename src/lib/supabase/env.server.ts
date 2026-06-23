import path from "node:path";
import { readFileSync } from "node:fs";

import type { SupabasePublicConfig } from "@/lib/supabase/client";

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
    return direct.trim();
  }

  const fromFile = getFileEnv()[key];
  return typeof fromFile === "string" ? fromFile.trim() : "";
}

export function getSupabasePublicConfigFromServer(): SupabasePublicConfig | null {
  const url = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export type SupabaseServiceConfig = {
  url: string;
  serviceRoleKey: string;
};

export type SupabaseServiceConfigResult = {
  config: SupabaseServiceConfig | null;
  missingKeys: string[];
};

export function getSupabaseServiceConfigFromServerResult(): SupabaseServiceConfigResult {
  const url = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  const missingKeys: string[] = [];

  if (!url) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingKeys.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missingKeys.length) {
    return { config: null, missingKeys };
  }

  return {
    config: { url, serviceRoleKey },
    missingKeys: [],
  };
}

export function getSupabaseServiceConfigFromServer(): SupabaseServiceConfig | null {
  return getSupabaseServiceConfigFromServerResult().config;
}
