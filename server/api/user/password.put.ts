import { z } from "zod";

// Server-side schema: the client form also validates confirmPassword,
// but only current + new are needed here (confirm is a UI-only check).
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8, "Must be at least 8 characters").max(128),
});

export default defineEventHandler(async (event) => {
  // Require authentication
  const session = await getUserSession(event);
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  const body = await readValidatedBody(event, changePasswordSchema.parse);

  const user = await userRepository.findById(session.user.id);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  // OAuth-only accounts have no local password to change
  if (!user.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password change is not available for this account",
    });
  }

  // Verify the current password before allowing the change
  const isValid = await passwordService.verify(
    body.currentPassword,
    user.password,
  );
  if (!isValid) {
    throw createError({
      statusCode: 400,
      statusMessage: "Current password is incorrect",
    });
  }

  const hashedPassword = await passwordService.hash(body.newPassword);
  await userRepository.update(session.user.id, { password: hashedPassword });

  return jsonResponse(undefined, "Password changed successfully");
});
