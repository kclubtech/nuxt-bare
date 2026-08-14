import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, resetPasswordSchema.parse);

  // Use AuthService
  await authService.resetPassword(body.token, body.password);

  return jsonResponse(
    undefined,
    "Password reset successful. You can now log in with your new password.",
  );
});
