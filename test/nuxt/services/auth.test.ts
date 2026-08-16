import { expect, it, describe, beforeEach, beforeAll, vi } from "vitest";

// Use relative import to server/utils/auth.service (renamed)
import { authService } from "../../../server/utils/auth/service";
import { userRepository } from "../../../server/utils/user/repository";
import { tokenRepository } from "../../../server/utils/auth/token.repository";
import { passwordService } from "../../../server/utils/auth/password";
import { setupTestDb, clearDb } from "../../helpers";

// Stub globals for auto-imports used in auth.service.ts because they are not automatically injected in test environment
vi.stubGlobal("userRepository", userRepository);
vi.stubGlobal("tokenRepository", tokenRepository);
vi.stubGlobal("passwordService", passwordService);

// Stub nuxt-auth-utils functions
vi.stubGlobal("hashPassword", async (password: string) => `hashed:${password}`);
vi.stubGlobal(
  "verifyPassword",
  async (hash: string, password: string) => hash === `hashed:${password}`,
);

describe("Auth Service", () => {
  beforeAll(() => {
    // Ensure test db is set up
    process.env.NODE_ENV = "test";
    setupTestDb();
  });

  beforeEach(async () => {
    await clearDb();
  });

  it("registers a user successfully", async () => {
    const data = {
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    };

    const { user, token } = await authService.register(data);

    expect(user).toBeDefined();
    expect(user.email).toBe(data.email);
    expect(user.name).toBe("Test User");
    expect(token).toBeDefined();
    expect(token?.token).toBeDefined();

    // Check profile
    const profile = await userRepository.findProfileByUserId(user.id);
    expect(profile).toBeDefined();
    expect(profile!.firstName).toBe("Test");
    expect(profile!.lastName).toBe("User");
  });

  it("fails registration with duplicate email", async () => {
    const data = {
      email: "dup@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "Dup",
    };

    await authService.register(data);

    try {
      await authService.register(data);
    } catch (e: any) {
      expect(e.statusMessage || e.message).toBe(
        "Unable to create account. Please try again.",
      );
    }
  });

  it("logs in successfully", async () => {
    await authService.register({
      email: "login@example.com",
      password: "password123",
      firstName: "Login",
      lastName: "User",
    });

    const user = await authService.login({
      email: "login@example.com",
      password: "password123",
    });

    expect(user).toBeDefined();
    expect(user.email).toBe("login@example.com");
  });

  it("fails login with wrong password", async () => {
    await authService.register({
      email: "wrong@example.com",
      password: "password123",
      firstName: "Wrong",
      lastName: "Pass",
    });

    try {
      await authService.login({
        email: "wrong@example.com",
        password: "wrongpassword",
      });
    } catch (e: any) {
      expect(e.statusMessage || e.message).toBe("Invalid email or password");
    }
  });

  // Mirrors the flow of PUT /api/user/password (see server/api/user/password.put.ts):
  // verify current password → hash new password → update the user record.
  it("changes password when current password is correct", async () => {
    const { user } = await authService.register({
      email: "pwchange@example.com",
      password: "password123",
      firstName: "Pw",
      lastName: "Change",
    });

    // Current password verifies against the stored hash
    expect(await passwordService.verify("password123", user.password!)).toBe(
      true,
    );

    const hashedPassword = await passwordService.hash("newpassword456");
    await userRepository.update(user.id, { password: hashedPassword });

    const updated = await userRepository.findById(user.id);
    expect(updated).toBeDefined();
    expect(
      await passwordService.verify("newpassword456", updated!.password!),
    ).toBe(true);
    expect(
      await passwordService.verify("password123", updated!.password!),
    ).toBe(false);
  });
});
