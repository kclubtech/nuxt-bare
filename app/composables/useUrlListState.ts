import type { Ref } from "vue";

type ListStateRefs<TKeys extends string> = {
  page: Ref<number>;
} & Record<TKeys, Ref<string>>;

// VueUse types the debounced ref as `Readonly<Ref<T>> | undefined`; here we
// always pass a literal delay, so it is defined and still assignable to Ref.
function debouncedFilter(source: Ref<string>): Ref<string> {
  return refDebounced(source, 300) as Ref<string>;
}

/**
 * Shared state for paginated list pages: a page number plus any number of
 * filter values, kept in sync with the URL query string in both directions
 * (so the browser back button works).
 *
 * Replaces the old per-feature `useBlogListState` / `useUserListState` /
 * `useMediaListState` composables.
 *
 * @example
 * ```ts
 * const { search, page, params } = useUrlListState({
 *   filters: ["search"],
 *   debounce: ["search"],
 *   params: ({ page, search }) => ({
 *     page: page.value,
 *     search: search.value,
 *     limit: 10,
 *   }),
 * });
 * ```
 */
export function useUrlListState<
  TParams,
  TKeys extends string = string,
>(options: {
  /** Filter keys synced to the URL, in addition to `page`. */
  filters?: TKeys[];
  /** Subset of `filters` that debounce before syncing (e.g. `["search"]`). */
  debounce?: TKeys[];
  /** Build the fetch params from the current filter values. */
  params: (state: ListStateRefs<TKeys>) => TParams;
}) {
  const route = useRoute();
  const router = useRouter();

  const filterKeys = options.filters ?? [];
  const debounceKeys = new Set(options.debounce ?? []);

  const page = ref(Number(route.query.page) || 1);

  // Raw filter state, initialized from the URL (bound to v-model inputs).
  const raw = {} as Record<TKeys, Ref<string>>;
  // Settled copies: debounced where configured. The URL and `params` read these.
  const settled = {} as Record<TKeys, Ref<string>>;
  for (const key of filterKeys) {
    raw[key] = ref((route.query[key] as string) ?? "");
    settled[key] = debounceKeys.has(key) ? debouncedFilter(raw[key]) : raw[key];
  }

  // A filter change invalidates the previous results → back to page 1.
  watch(
    filterKeys.map((key) => raw[key]),
    () => {
      page.value = 1;
    },
  );

  // State → URL
  watch(
    [page, ...filterKeys.map((key) => settled[key])],
    async () => {
      const query: Record<string, string> = {};
      for (const key of filterKeys) {
        const value = settled[key].value;
        if (value) query[key] = value;
      }
      if (page.value > 1) query.page = String(page.value);
      await router.replace({ query });
    },
    { deep: true },
  );

  // URL → state (browser back/forward)
  watch(
    () => route.query,
    (query) => {
      const qPage = Number(query.page) || 1;
      if (qPage !== page.value) page.value = qPage;
      for (const key of filterKeys) {
        const value = (query[key] as string) ?? "";
        if (value !== raw[key].value) raw[key].value = value;
      }
    },
  );

  const params = computed<TParams>(() =>
    options.params({ page, ...settled } as ListStateRefs<TKeys>),
  );

  return { page, ...raw, params };
}
