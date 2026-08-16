import type { FormError } from "@nuxt/ui";

/**
 * Converts API errors into Nuxt UI `FormError[]` so forms can show
 * field-level validation messages.
 *
 * Handles the three shapes ofetch/h3 can produce: a bare array of Zod issues,
 * issues nested under `data.issues`, or an h3 validation error object.
 */
export const useFormErrors = () => {
  const transformToIssue = (error: unknown): FormError[] => {
    const errors: FormError[] = [];

    const errorData: any =
      (error as any)?.response?._data || (error as any)?.data || error;

    // Direct array of issues: [{ path: ["name"], message: "Name is required" }]
    if (Array.isArray(errorData)) {
      errorData.forEach((issue: any) => {
        errors.push({
          message: issue.message,
          name: issue.path?.join(".") || "",
        });
      });
      return errors;
    }

    // Issues nested under `data` — either `{ issues: [...] }` or a bare array.
    if (errorData?.data?.issues) {
      errorData.data.issues.forEach((issue: any) => {
        errors.push({
          message: issue.message,
          name: issue.path.join("."),
        });
      });
    } else if (Array.isArray(errorData?.data)) {
      errorData.data.forEach((issue: any) => {
        errors.push({
          message: issue.message,
          name: issue.path?.join(".") || "",
        });
      });
    }

    return errors;
  };

  return {
    transformToIssue,
  };
};
