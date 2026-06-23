export type SignupFallbackPayload = {
  email: string;
  password: string;
  redirectTo: string;
  data?: Record<string, unknown>;
};

export function isEmailProviderNotConfiguredError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("email provider is not configured") ||
    normalized.includes("smtp") ||
    normalized.includes("email provider")
  );
}

export async function sendFallbackSignupEmail(payload: SignupFallbackPayload) {
  const response = await fetch("/api/auth/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error || "Failed to send signup email.");
  }

  return body;
}
