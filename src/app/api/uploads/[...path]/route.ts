import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function contentTypeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function streamToBuffer(stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream | null | undefined) {
  if (!stream) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  const reader = (stream as ReadableStream<Uint8Array>).getReader?.();
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  for await (const chunk of stream as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const relativePath = segments.join("/");

  if (!relativePath) {
    return new Response("Not found", { status: 404 });
  }

  const localPath = path.join(process.cwd(), "public", "uploads", relativePath);

  try {
    const file = await fs.readFile(localPath);
    return new Response(file, {
      headers: {
        "Content-Type": contentTypeFromPath(localPath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // Fall through to Supabase Storage
  }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "admin-images").trim();
    if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response("Not found", { status: 404 });
  }

  try {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      const key = path.posix.join("uploads", relativePath.replace(/^\/+/, ""));
      const result = await supabase.storage.from(bucket).download(key);

      if (result.error) {
        throw result.error;
      }

      const body = await result.data.arrayBuffer();
    return new Response(body, {
      headers: {
          "Content-Type": contentTypeFromPath(key),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
