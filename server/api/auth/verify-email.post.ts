import { z } from "zod";

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, verifyEmailSchema.parse);

  // Use AuthService
  const user = await authService.verifyEmail(body.token);

  // Fetch profile for welcome email
  const profile = await userRepository.findProfileByUserId(user.id);

  // Send welcome email
  if (profile?.firstName) {
    try {
      await sendWelcomeEmail(user.email, profile.firstName);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't fail verification if welcome email fails
    }
  }

  return jsonResponse(
    undefined,
    "Email verified successfully! Welcome to the platform.",
  );
});
