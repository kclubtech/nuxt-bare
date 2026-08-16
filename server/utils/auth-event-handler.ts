import { createError, defineEventHandler } from "h3";
import type { H3Event } from "h3";
import { permissionRepository } from "./permission/service";

interface User {
  id: number;
  email: string;
  name?: string;
  role: string;
}

interface AccessControl {
  /** Roles allowed to access this endpoint (e.g. ["admin"]) */
  role?: string[];
  /**
   * Permission check in "feature:action" or "feature" format.
   * "blog:create" → user must have `create` in their `blog` permissions.
   * "blog"        → user must have any permissions for `blog`.
   */
  permissions?: string | string[];
}

/**
 * A helper to define authenticated API handlers with optional role-based and
 * permission-based access control.
 *
 * @param handler - The main logic of the API endpoint.
 * @param access  - Role list (string[]) for backward compat, or AccessControl object.
 */
export const defineAuthHandler = <T>(
  handler: (
    event: H3Event,
    context: { user: User; language: string },
  ) => T | Promise<T>,
  access?: string[] | AccessControl,
) => {
  return defineEventHandler(async (event) => {
    const { user } = await getUserSession(event);

    const language = getRequestLanguage(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Normalize backward-compat string[] → { role: [...] }
    const ac: AccessControl = Array.isArray(access)
      ? { role: access }
      : (access ?? {});

    // Role check
    if (ac.role && !ac.role.includes(user.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }

    // Permission check
    if (ac.permissions) {
      const checks = Array.isArray(ac.permissions)
        ? ac.permissions
        : [ac.permissions];

      const userPerms = await permissionRepository.findByUserId(user.id);
      const permMap = new Map(
        userPerms.map((p) => [p.feature, p.permissions as string[]]),
      );

      for (const check of checks) {
        const [feature, action] = check.split(":");
        if (!feature) continue;

        const featurePerms = permMap.get(feature);

        if (!featurePerms || featurePerms.length === 0) {
          throw createError({
            statusCode: 403,
            statusMessage: `You do not have access to the '${feature}' feature`,
          });
        }

        if (action && !featurePerms.includes(action)) {
          throw createError({
            statusCode: 403,
            statusMessage: `You do not have '${action}' permission for the '${feature}' feature`,
          });
        }
      }
    }

    return handler(event, { user, language });
  });
};
