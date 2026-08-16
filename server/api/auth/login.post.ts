export default defineEventHandler(async (event) => {
  const clientIP = getClientIP(event);

  // Rate limiting
  await checkRateLimit(`login:${clientIP}`, RATE_LIMITS.LOGIN);

  const body = await readValidatedBody(event, loginSchema.parse);

  // Use AuthService (Application Layer)
  const user = await authService.login(body);

  // Set user session (using nuxt-auth-utils)
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "user" | "moderator",
      emailVerified: user.emailVerified,
    },
  });

  return jsonResponse(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "user" | "moderator",
      emailVerified: user.emailVerified,
    },
    "Login successful",
  );
});
