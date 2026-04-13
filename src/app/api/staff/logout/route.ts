import { cookies } from "next/headers";

import { STAFF_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
  return Response.json({ ok: true });
}
