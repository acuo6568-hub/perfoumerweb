import { cookies } from "next/headers";

import {
  STAFF_SESSION_COOKIE,
  isStaffConfigured,
  validateStaffSessionToken,
} from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;

  return Response.json({
    configured: isStaffConfigured(),
    authenticated: validateStaffSessionToken(token),
  });
}
