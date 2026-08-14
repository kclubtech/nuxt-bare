import type { FormError } from "@nuxt/ui";

export const useValidateHelper = () => {
  /**
   * Transform API validation errors to Nuxt UI form errors
   * Handles FetchError extraction from ofetch, h3 validation errors, and Zod issues
   */
  const transformToIssue = (error: any): FormError[] => {
    const errors: FormError[] = [];

    // First, extract the actual error data from FetchError structure
    // FetchError from ofetch has: error.response._data, error.data, or error itself
    const errorData = error?.response?._data || error?.data || error;

    // Handle direct array of validation issues (from h3 validation)
    // Format: errorData = [{ path: ["name"], message: "Name is required", ... }]
    if (Array.isArray(errorData)) {
      errorData.forEach((issue: any) => {
        errors.push({
          message: issue.message,
          name: issue.path?.join(".") || "",
        });
      });
      return errors;
    }

    // Handle validation issues nested under `data` (both `{ issues: [...] }`
    // and a bare array of Zod issues)
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
