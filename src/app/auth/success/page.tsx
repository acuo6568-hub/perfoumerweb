import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Auth Success",
  robots: {
    index: false,
    follow: false,
  },
};

type AuthSuccessPageProps = {
  searchParams: Promise<{ next?: string; email?: string; pending?: string }>;
};

export default async function AuthSuccessPage({ searchParams }: AuthSuccessPageProps) {
  const params = await searchParams;
  const next = params.next || "/wishlist";
  const email = params.email || "";
  const pending = params.pending || "";

  redirect(
    `/login/success?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}&pending=${encodeURIComponent(pending)}`,
  );
}
