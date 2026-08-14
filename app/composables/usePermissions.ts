import { useQuery } from "@pinia/colada";
import type { APIResponseSuccess } from "@/types/response";
import type { PermissionEntry } from "~~/shared/types/permission";

export const usePermissionsQuery = () => {
  // useRequestFetch forwards cookies/headers on SSR so authenticated pages
  // (e.g. /profile) don't 401 when this query runs server-side.
  const requestFetch = useRequestFetch();

  return useQuery({
    key: () => ["permissions", "me"],
    query: () =>
      requestFetch<APIResponseSuccess<PermissionEntry[]>>(
        "/api/user/permissions",
      ),
    staleTime: 5 * 60 * 1000,
  });
};

export const useHasFeature = (feature: string) => {
  const { data } = usePermissionsQuery();
  return computed(
    () =>
      !feature || (data.value?.data ?? []).some((p) => p.feature === feature),
  );
};
