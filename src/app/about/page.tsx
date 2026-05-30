import { redirect } from "next/navigation";

export default function AboutRedirectPage() {
  // Redirect /about to the localized /haqqimizda page
  redirect("/haqqimizda");
}
