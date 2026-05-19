import fs from "node:fs/promises";
import path from "node:path";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function GET(_: Request, context: { params: { path: string[] } }) {
  const { path: segments } = context.params;
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
    // Fall through to S3
  }

  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || process.env.S3_REGION;
  if (!bucket) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const s3Client = new S3Client({ region });
    const key = path.posix.join("uploads", relativePath.replace(/^\/+/, ""));
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const body = await streamToBuffer(result.Body as any);
    return new Response(body, {
      headers: {
        "Content-Type": result.ContentType || contentTypeFromPath(key),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
