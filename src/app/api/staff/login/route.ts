import { cookies } from "next/headers";

import {
  STAFF_SESSION_COOKIE,
  createStaffSessionToken,
  getStaffSessionCookieOptions,
  isStaffConfigured,
  verifyStaffCredentials,
} from "@/lib/admin-auth";

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!isStaffConfigured()) {
    return Response.json(
      { error: "Staff login is not configured. Set STAFF_PASSWORD (or ADMIN_PASSWORD) in env." },
      { status: 500 },
    );
  }

  let payload: LoginPayload;

  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const username = payload.username?.trim() || "";
  const password = payload.password || "";

  if (!verifyStaffCredentials(username, password)) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = createStaffSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, getStaffSessionCookieOptions());

  return Response.json({ ok: true });
}
