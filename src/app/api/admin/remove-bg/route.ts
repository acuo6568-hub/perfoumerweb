import { cookies } from "next/headers";
import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";
import { appendAdminAuditLog, getAdminAuditContext } from "@/lib/admin-audit";
import {
  checkPythonSetup,
  removeBackground,
  getSetupInstructions,
} from "@/lib/bg-remover";

/**
 * POST /api/admin/remove-bg
 * Removes background from perfume images using local Python (no API required)
 * 
 * Request body:
 * - imageUrl: string (URL of the image to process, can be local /uploads/... or remote http://...)
 * - itemSlug: string (perfume or note slug for naming)
 * - itemType: 'perfume' | 'note'
 * 
 * Returns:
 * - newImageUrl: string (URL of the processed image with transparent background)
 * - size: number (file size in bytes)
 * 
 * Requires: Python 3.7+ with rembg library (pip install rembg)
 */

async function ensureAuthorized() {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Admin login is not configured. Set ADMIN_PASSWORD in env." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!validateAdminSessionToken(token)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const authError = await ensureAuthorized();
  if (authError) {
    return authError;
  }

  let payload: {
    imageUrl?: unknown;
    itemSlug?: unknown;
    itemType?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { imageUrl, itemSlug, itemType } = payload;

  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return Response.json({ error: "imageUrl is required and must be a non-empty string." }, { status: 400 });
  }

  if (typeof itemSlug !== "string" || !itemSlug.trim()) {
    return Response.json({ error: "itemSlug is required." }, { status: 400 });
  }

  if (itemType !== "perfume" && itemType !== "note") {
    return Response.json({ error: 'itemType must be either "perfume" or "note".' }, { status: 400 });
  }

  try {
    // Fetch the image
    let imageBuffer: Buffer;
    let mimeType = "image/png";

    try {
      // Check if this is a local path or remote URL
      if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("./")) {
        // Read from local filesystem
        const localPath = path.join(process.cwd(), "public", imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl);
        
        try {
          imageBuffer = await fs.readFile(localPath);
          // Detect MIME type from file extension
          const ext = path.extname(localPath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
          };
          mimeType = mimeTypes[ext] || "image/jpeg";
        } catch (readError) {
          const readMsg = readError instanceof Error ? readError.message : "Unknown error";
          return Response.json(
            { error: `Failed to read local image: ${readMsg}. Path: ${localPath}` },
            { status: 400 },
          );
        }
      } else {
        // Fetch remote URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Perfoumer Admin Panel",
          },
        });

        clearTimeout(timeout);

        if (!response.ok) {
          return Response.json(
            { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
            { status: 400 },
          );
        }

        const contentType = response.headers.get("content-type");
        if (contentType) {
          mimeType = contentType.split(";")[0] || "image/png";
        }

        const buffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(buffer);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error fetching image";
      return Response.json(
        { error: `Failed to fetch image from URL: ${message}` },
        { status: 400 },
      );
    }

    // Use local background remover (no API needed)
    try {
      const response = await removeBackgroundLocally(
        imageUrl,
        itemSlug,
        itemType as "perfume" | "note",
      );
      if (response.ok) {
        const auditContext = await getAdminAuditContext(request);
        await appendAdminAuditLog({
          action: "admin_remove_background",
          section: itemType as "perfume" | "note",
          targetType: itemType as "perfume" | "note",
          targetId: itemSlug,
          targetLabel: itemSlug,
          summary: `Removed background for ${itemType} "${itemSlug}".`,
          changes: [{ path: "image.background", before: "original", after: "removed" }],
          metadata: {
            sourceImage: imageUrl,
          },
          ...auditContext,
        });
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Background removal failed";
      return Response.json(
        { error: `Background removal failed: ${message}` },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Internal server error: ${message}` }, { status: 500 });
  }
}

/**
 * Removes background from an image locally using Python rembg
 */
async function removeBackgroundLocally(
  imageUrl: string,
  itemSlug: string,
  itemType: "perfume" | "note",
): Promise<Response> {
  try {
    // First, check if rembg is available locally or via REMBG_API_URL
    const setup = await checkPythonSetup();
    // If a remote API is configured, allow proceeding (we'll use it)
    const canUseRemote = Boolean(setup.apiUrl);
    if (!setup.rembgAvailable && !canUseRemote) {
      return Response.json(
        {
          error: "rembg is not available locally or via REMBG_API_URL",
          setup: getSetupInstructions(),
          details: setup.errorMessage,
        },
        { status: 503 },
      );
    }

    // Prepare temporary directory for processing
    const tempDir = path.join(process.cwd(), ".tmp", "bg-removal");
    await fs.mkdir(tempDir, { recursive: true });

    // Determine input file path
    let inputPath: string;
    if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("./")) {
      inputPath = path.join(
        process.cwd(),
        "public",
        imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl,
      );
    } else {
      // For remote URLs, we need to download them first (handled earlier, use imageUrl as-is for now)
      return Response.json(
        {
          error:
            "Image must be from local uploads. Please ensure imageUrl starts with /uploads/",
        },
        { status: 400 },
      );
    }

    // Verify input file exists
    try {
      await fs.access(inputPath);
    } catch {
      return Response.json(
        {
          error: `Input image file not found: ${inputPath}`,
        },
        { status: 400 },
      );
    }

    // Generate output filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const tempOutputFilename = `${itemSlug}-nobg-${timestamp}-${random}-temp.png`;
    const tempOutputPath = path.join(tempDir, tempOutputFilename);

    // Process the image
    await removeBackground({
      inputPath,
      outputPath: tempOutputPath,
      model: "u2net",
      alpha_matting: true,
    });

    // Verify output was created
    try {
      await fs.access(tempOutputPath);
    } catch {
      return Response.json(
        {
          error: "Background removal completed but output file was not created",
        },
        { status: 500 },
      );
    }

    // Move to final location
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "admin", itemType);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (mkdirError) {
      const mkMsg = mkdirError instanceof Error ? mkdirError.message : "Unknown error";
      return Response.json(
        {
          error: `Cannot create uploads directory: ${mkMsg}`,
          hint: `Check permissions on ${uploadsDir}. Try: chmod 755 ${uploadsDir}`,
        },
        { status: 500 },
      );
    }

    const finalFilename = `${itemSlug}-nobg-${timestamp}-${random}.png`;
    const finalPath = path.join(uploadsDir, finalFilename);

    try {
      await fs.rename(tempOutputPath, finalPath);
    } catch (renameError) {
      const renameMsg = renameError instanceof Error ? renameError.message : "Unknown error";
      const isPermissionError =
        renameMsg.includes("EACCES") || renameMsg.includes("EPERM") || renameMsg.includes("EROFS") || renameMsg.includes("read-only file system");

      if (isPermissionError) {
        // Attempt to upload to S3 if configured, otherwise return base64 for manual download
        try {
          const buffer = await fs.readFile(tempOutputPath);

          const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
          const s3Region = process.env.AWS_REGION || process.env.S3_REGION;

          if (s3Bucket) {
            try {
              const s3Client = new S3Client({ region: s3Region });
              const key = `uploads/admin/${itemType}/${finalFilename}`;

              await s3Client.send(
                new PutObjectCommand({
                  Bucket: s3Bucket,
                  Key: key,
                  Body: buffer,
                  ContentType: "image/png",
                }),
              );

              // Construct a public URL (assumes public bucket). If a custom CDN/endpoint is used, set S3_PUBLIC_URL env var.
              const publicBase = process.env.S3_PUBLIC_URL || `https://${s3Bucket}.s3.${s3Region}.amazonaws.com`;
              const s3Url = `${publicBase}/${key}`;

              return Response.json({ success: true, newImageUrl: `/api/uploads/admin/${itemType}/${finalFilename}`, uploadedTo: "s3", storageUrl: s3Url }, { status: 200 });
            } catch (s3Err) {
              // If S3 upload fails, fall back to base64
              console.warn("S3 upload failed:", s3Err);
            }
          }

          const base64 = buffer.toString("base64");
          const filename = finalFilename;
          return Response.json(
            {
              success: false,
              warning: `Cannot write to uploads directory (permission/read-only). Returning image as base64.`,
              download: {
                filename,
                contentType: "image/png",
                base64,
              },
            },
            { status: 200 },
          );
        } catch (readErr) {
          const readMsg = readErr instanceof Error ? readErr.message : "Unknown error";
          return Response.json(
            {
              error: `Failed to move processed image and failed to read temp output: ${readMsg}`,
            },
            { status: 500 },
          );
        }
      }

      return Response.json(
        {
          error: `Failed to move processed image: ${renameMsg}`,
        },
        { status: 500 },
      );
    }

    // Get file size
    let fileSize = 0;
    try {
      const stats = await fs.stat(finalPath);
      fileSize = stats.size;
    } catch {
      // Continue even if we can't get file size
    }

    const imageUrlResponse = `/api/uploads/admin/${itemType}/${finalFilename}`;

    return Response.json({
      success: true,
      newImageUrl: imageUrlResponse,
      size: fileSize,
      message: "Background removed successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        error: `Background removal failed: ${message}`,
        setup: getSetupInstructions(),
      },
      { status: 500 },
    );
  }
}
