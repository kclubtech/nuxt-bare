// server/utils/auth.service.ts
import type { UserRole } from "~/types/db";

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: "Unable to create account. Please try again.",
      });
    }

    const hashedPassword = await passwordService.hash(data.password);
    const fullName = `${data.firstName} ${data.lastName}`;

    // Create new user (using repository)
    const newUser = await userRepository.create({
      name: fullName,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    });

    if (!newUser) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create user",
      });
    }

    // Create user profile
    await userRepository.createProfile({
      userId: newUser.id,
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create token for verification
    const verificationToken = await tokenRepository.create(
      newUser.id,
      "email_verification",
    );

    // Verification email is sent by the register endpoint (I/O stays at the API layer)

    return { user: newUser, token: verificationToken };
  },

  async login(credentials: { email: string; password: string }) {
    const user = await userRepository.findByEmail(credentials.email);
    if (!user || !user.password) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid email or password",
      });
    }

    const isValid = await passwordService.verify(
      credentials.password,
      user.password,
    );
    if (!isValid) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage: "Account is disabled",
      });
    }

    return user;
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return true to prevent enumeration attacks, or throw consistent error
      return true;
    }

    // Create reset token (expires in 1 hour)
    const token = await tokenRepository.create(user.id, "password_reset", 1);

    // Reset email is sent by the request-password-reset endpoint (I/O stays at the API layer)
    return token;
  },

  async resetPassword(tokenString: string, newPassword: string) {
    const tokenRecord = await tokenRepository.findByToken(
      tokenString,
      "password_reset",
    );

    if (!tokenRecord) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid or expired token",
      });
    }

    const hashedPassword = await passwordService.hash(newPassword);

    await userRepository.update(tokenRecord.userId, {
      password: hashedPassword,
    });

    // Ideally delete all password reset tokens for this user or just this one
    await tokenRepository.delete(tokenRecord.id);

    return true;
  },

  async verifyEmail(tokenString: string) {
    const tokenRecord = await tokenRepository.findByToken(
      tokenString,
      "email_verification",
    );

    if (!tokenRecord) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid or expired token",
      });
    }

    await userRepository.update(tokenRecord.userId, {
      emailVerified: true,
    });

    await tokenRepository.delete(tokenRecord.id);

    const user = await userRepository.findById(tokenRecord.userId);
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found",
      });
    }

    return user;
  },
};
