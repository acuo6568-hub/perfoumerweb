import { cookies } from "next/headers";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigured,
  validateAdminSessionToken,
} from "@/lib/admin-auth";

const execAsync = promisify(exec);

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
  if (authError) return authError;

  let body: { message?: string } | null = null;
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    // ignore
  }

  const message = (body && body.message) ? String(body.message).trim() : `admin: update ${new Date().toISOString()}`;

  try {
    // Stage admin data and csv
    await execAsync("git add data/admin data/perfm77.csv || true");
    // Commit if changes
    const { stdout: statusOut } = await execAsync("git status --porcelain");
    if (!statusOut.trim()) {
      return Response.json({ ok: true, message: "No changes to commit." });
    }

    await execAsync(`git commit -m "${message.replace(/\"/g, '\\"')}"`);
    // Push
    const { stdout: pushOut } = await execAsync("git push --no-verify");

    return Response.json({ ok: true, commitMessage: message, pushOutput: pushOut });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Git operation failed.", details: errMsg }, { status: 500 });
  }
}
