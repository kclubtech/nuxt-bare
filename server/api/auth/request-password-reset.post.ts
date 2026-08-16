import { z } from "zod";

const resetRequestSchema = z.object({
  email: z.email(),
});

export default defineEventHandler(async (event) => {
  const clientIP = getClientIP(event);

  // Rate limiting
  await checkRateLimit(
    `password-reset:${clientIP}`,
    RATE_LIMITS.PASSWORD_RESET,
  );

  const body = await readValidatedBody(event, resetRequestSchema.parse);

  // Use AuthService
  const result = await authService.requestPasswordReset(body.email);

  if (typeof result !== "boolean") {
    // Send reset email
    try {
      await sendPasswordResetEmail(body.email, result?.token ?? "");
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }
  }

  // Always return success to prevent email enumeration
  return jsonResponse(
    undefined,
    "If an account with this email exists, you will receive a password reset link shortly.",
  );
});
