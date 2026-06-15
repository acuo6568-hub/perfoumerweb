import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionIdentity,
} from "@/lib/admin-auth";
import { getSupabaseServiceConfigFromServer } from "@/lib/supabase/env.server";

export type AdminAuditChange = {
  path: string;
  before: string;
  after: string;
};

export type AdminAuditEntry = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  section: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  summary: string;
  changes: AdminAuditChange[];
  metadata?: Record<string, string | number | boolean>;
  ip?: string;
  userAgent?: string;
};

type AuditInput = Omit<AdminAuditEntry, "id" | "createdAt" | "actor" | "ip" | "userAgent"> & {
  actor?: string;
  createdAt?: string;
  ip?: string;
  userAgent?: string;
};

type AdminDataSnapshot = {
  perfumes?: unknown;
  notes?: unknown;
  settings?: unknown;
};

const ADMIN_DATA_DIR = path.join(process.cwd(), "data", "admin");
const ADMIN_AUDIT_PATH = path.join(ADMIN_DATA_DIR, "audit-log.json");
const SUPABASE_AUDIT_ID = "admin_audit_log";
const MAX_AUDIT_ENTRIES = 1000;
const MAX_CHANGES_PER_ENTRY = 80;

function stringifyValue(value: unknown) {
  if (value === undefined) return "(empty)";
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 497)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 500 ? `${serialized.slice(0, 497)}...` : serialized;
  } catch {
    return String(value);
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function normalizedList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isPlainRecord) : [];
}

function itemKey(item: Record<string, unknown>, fallbackIndex: number) {
  return stringifyValue(item.slug || item.id || item.email || fallbackIndex);
}

function itemLabel(item: Record<string, unknown>, fallback: string) {
  return stringifyValue(item.name || item.title || item.email || item.slug || item.id || fallback);
}

function collectChanges(before: unknown, after: unknown, basePath = ""): AdminAuditChange[] {
  if (stableJson(before) === stableJson(after)) return [];

  if (Array.isArray(before) || Array.isArray(after)) {
    return [{
      path: basePath || "value",
      before: stringifyValue(before),
      after: stringifyValue(after),
    }];
  }

  if (isPlainRecord(before) && isPlainRecord(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    return keys.flatMap((key) => collectChanges(before[key], after[key], basePath ? `${basePath}.${key}` : key));
  }

  return [{
    path: basePath || "value",
    before: stringifyValue(before),
    after: stringifyValue(after),
  }];
}

function countChangedItems(before: unknown, after: unknown) {
  const beforeList = normalizedList(before);
  const afterList = normalizedList(after);
  const beforeMap = new Map(beforeList.map((item, index) => [itemKey(item, index), item]));
  const afterMap = new Map(afterList.map((item, index) => [itemKey(item, index), item]));
  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const [key, item] of afterMap) {
    if (!beforeMap.has(key)) added += 1;
    else if (stableJson(beforeMap.get(key)) !== stableJson(item)) updated += 1;
  }

  for (const key of beforeMap.keys()) {
    if (!afterMap.has(key)) removed += 1;
  }

  return { added, updated, removed };
}

function buildListEntries(input: {
  before: unknown;
  after: unknown;
  action: string;
  section: string;
  targetType: string;
}): AuditInput[] {
  const beforeList = normalizedList(input.before);
  const afterList = normalizedList(input.after);
  const beforeMap = new Map(beforeList.map((item, index) => [itemKey(item, index), item]));
  const afterMap = new Map(afterList.map((item, index) => [itemKey(item, index), item]));
  const entries: AuditInput[] = [];

  for (const [key, item] of afterMap) {
    const previous = beforeMap.get(key);
    if (!previous) {
      entries.push({
        action: input.action,
        section: input.section,
        targetType: input.targetType,
        targetId: key,
        targetLabel: itemLabel(item, key),
        summary: `Created ${input.targetType} "${itemLabel(item, key)}".`,
        changes: [{ path: input.targetType, before: "(empty)", after: stringifyValue(item) }],
      });
      continue;
    }

    const changes = collectChanges(previous, item).slice(0, MAX_CHANGES_PER_ENTRY);
    if (changes.length) {
      entries.push({
        action: input.action,
        section: input.section,
        targetType: input.targetType,
        targetId: key,
        targetLabel: itemLabel(item, key),
        summary: `Updated ${input.targetType} "${itemLabel(item, key)}" (${changes.length} change${changes.length === 1 ? "" : "s"}).`,
        changes,
      });
    }
  }

  for (const [key, item] of beforeMap) {
    if (afterMap.has(key)) continue;
    entries.push({
      action: input.action,
      section: input.section,
      targetType: input.targetType,
      targetId: key,
      targetLabel: itemLabel(item, key),
      summary: `Deleted ${input.targetType} "${itemLabel(item, key)}".`,
      changes: [{ path: input.targetType, before: stringifyValue(item), after: "(empty)" }],
    });
  }

  return entries;
}

async function getSupabaseAuditLog() {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) return null;

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("admin_data")
    .select("data")
    .eq("id", SUPABASE_AUDIT_ID)
    .single();

  if (error || !data) return null;
  const value = (data as { data?: unknown }).data;
  return Array.isArray(value) ? (value as AdminAuditEntry[]) : null;
}

async function saveSupabaseAuditLog(entries: AdminAuditEntry[]) {
  const config = getSupabaseServiceConfigFromServer();
  if (!config) return false;

  const supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase
    .from("admin_data")
    .upsert({ id: SUPABASE_AUDIT_ID, data: entries, updated_at: new Date().toISOString() }, { onConflict: "id" });

  return !error;
}

async function getLocalAuditLog() {
  const writableDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
  const writablePath = path.join(writableDir, "audit-log.json");

  try {
    const raw = await readFile(writablePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminAuditEntry[]) : [];
  } catch {
    try {
      const raw = await readFile(ADMIN_AUDIT_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AdminAuditEntry[]) : [];
    } catch {
      return [];
    }
  }
}

async function saveLocalAuditLog(entries: AdminAuditEntry[]) {
  const writableDir = process.env.WRITABLE_DATA_DIR || os.tmpdir();
  const writablePath = path.join(writableDir, "audit-log.json");

  await mkdir(path.dirname(writablePath), { recursive: true });
  await writeFile(writablePath, `${JSON.stringify(entries, null, 2)}\n`, "utf-8");
}

export async function getAdminAuditLog(limit = 250) {
  const supabaseEntries = await getSupabaseAuditLog();
  const entries = supabaseEntries ?? (await getLocalAuditLog());

  return entries
    .filter((entry) => entry && typeof entry.id === "string")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function getAdminAuditContext(request?: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const identity = getAdminSessionIdentity(token);
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") || "";

  return {
    actor: identity?.username || "admin",
    ip: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || forwardedFor.split(",")[0]?.trim() || "",
    userAgent: request?.headers.get("user-agent") || headerStore.get("user-agent") || "",
  };
}

export async function appendAdminAuditLog(inputs: AuditInput | AuditInput[]) {
  const list = Array.isArray(inputs) ? inputs : [inputs];
  const cleanInputs = list.filter((entry) => entry.summary && entry.action);
  if (!cleanInputs.length) return;

  const existing = await getAdminAuditLog(MAX_AUDIT_ENTRIES);
  const now = new Date().toISOString();
  const entries = cleanInputs.map((entry) => ({
    id: crypto.randomUUID(),
    createdAt: entry.createdAt || now,
    actor: entry.actor || "admin",
    action: entry.action,
    section: entry.section,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetLabel: entry.targetLabel,
    summary: entry.summary,
    changes: entry.changes.slice(0, MAX_CHANGES_PER_ENTRY),
    metadata: entry.metadata,
    ip: entry.ip,
    userAgent: entry.userAgent,
  }));
  const nextEntries = [...entries, ...existing].slice(0, MAX_AUDIT_ENTRIES);

  const savedToSupabase = await saveSupabaseAuditLog(nextEntries);
  if (!savedToSupabase) {
    await saveLocalAuditLog(nextEntries);
  }
}

export function buildAdminDataAuditEntries(
  before: AdminDataSnapshot,
  after: AdminDataSnapshot,
  options: { action: string; actor?: string; ip?: string; userAgent?: string },
) {
  const perfumeCounts = countChangedItems(before.perfumes, after.perfumes);
  const noteCounts = countChangedItems(before.notes, after.notes);
  const entries: AuditInput[] = [
    ...buildListEntries({
      before: before.perfumes,
      after: after.perfumes,
      action: options.action,
      section: "perfumes",
      targetType: "perfume",
    }),
    ...buildListEntries({
      before: before.notes,
      after: after.notes,
      action: options.action,
      section: "notes",
      targetType: "note",
    }),
  ];

  const settingChanges = collectChanges(before.settings, after.settings).slice(0, MAX_CHANGES_PER_ENTRY);
  if (settingChanges.length) {
    entries.push({
      action: options.action,
      section: "settings",
      targetType: "site_settings",
      targetId: "site-settings",
      targetLabel: "Site settings",
      summary: `Updated site settings (${settingChanges.length} change${settingChanges.length === 1 ? "" : "s"}).`,
      changes: settingChanges,
    });
  }

  return entries.map((entry) => ({
    ...entry,
    actor: options.actor,
    ip: options.ip,
    userAgent: options.userAgent,
    metadata: {
      ...(entry.metadata ?? {}),
      perfumeAdded: perfumeCounts.added,
      perfumeUpdated: perfumeCounts.updated,
      perfumeRemoved: perfumeCounts.removed,
      noteAdded: noteCounts.added,
      noteUpdated: noteCounts.updated,
      noteRemoved: noteCounts.removed,
    },
  }));
}
