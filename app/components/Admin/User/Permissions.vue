<script setup lang="ts">
import type { PermissionEntry } from "~~/shared/types/permission";

interface Props {
  userId: string | number;
}

const props = defineProps<Props>();

const userId = computed(() => props.userId);

const { data: availableResp, isLoading: isLoadingAvailable } =
  useAvailablePermissionsQuery();

const { data: userPermResp, isLoading: isLoadingUser } =
  useUserPermissionsQuery(userId);

const { mutateAsync: savePermissions, isLoading: isSaving } =
  useUserPermissionsMutation();

// Build a reactive map of selected actions per feature
// shape: { blog: Set<string>, users: Set<string>, ... }
const selected = ref<Record<string, Set<string>>>({});

const available = computed<PermissionEntry[]>(
  () => availableResp.value?.data ?? [],
);

// Initialise / sync selected when user permissions load
watchEffect(() => {
  const userPerms: PermissionEntry[] = userPermResp.value?.data ?? [];
  const map: Record<string, Set<string>> = {};

  for (const entry of available.value) {
    const existing = userPerms.find((p) => p.feature === entry.feature);
    map[entry.feature] = new Set(existing?.permissions ?? []);
  }

  selected.value = map;
});

function toggleAction(feature: string, action: string) {
  const set = selected.value[feature];
  if (!set) return;
  if (set.has(action)) {
    set.delete(action);
  } else {
    set.add(action);
  }
}

function isChecked(feature: string, action: string): boolean {
  return selected.value[feature]?.has(action) ?? false;
}

function toggleAll(feature: string, actions: string[]) {
  const set = selected.value[feature];
  if (!set) return;
  const allChecked = actions.every((a) => set.has(a));
  if (allChecked) {
    for (const a of actions) set.delete(a);
  } else {
    for (const a of actions) set.add(a);
  }
}

function isAllChecked(feature: string, actions: string[]): boolean {
  return actions.every((a) => isChecked(feature, a));
}

function isIndeterminate(feature: string, actions: string[]): boolean {
  const checked = actions.filter((a) => isChecked(feature, a));
  return checked.length > 0 && checked.length < actions.length;
}

async function onSave() {
  const payload: PermissionEntry[] = available.value.map((entry) => ({
    feature: entry.feature,
    permissions: Array.from(selected.value[entry.feature] ?? []),
  }));

  await savePermissions({ id: userId.value, permissions: payload });
}

const isLoading = computed(
  () => isLoadingAvailable.value || isLoadingUser.value,
);

const actionLabel: Record<string, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
};
</script>

<template>
  <div class="space-y-4">
    <template v-if="isLoading">
      <USkeleton v-for="i in 4" :key="i" class="h-20 w-full rounded-lg" />
    </template>

    <template v-else>
      <UCard
        v-for="entry in available"
        :key="entry.feature"
        :ui="{ body: 'p-4' }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UCheckbox
              :model-value="isAllChecked(entry.feature, entry.permissions)"
              :indeterminate="isIndeterminate(entry.feature, entry.permissions)"
              @update:model-value="toggleAll(entry.feature, entry.permissions)"
            />
            <span class="font-medium capitalize">{{ entry.feature }}</span>
          </div>
          <div class="flex items-center gap-4">
            <label
              v-for="action in entry.permissions"
              :key="action"
              class="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <UCheckbox
                :model-value="isChecked(entry.feature, action)"
                @update:model-value="toggleAction(entry.feature, action)"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ actionLabel[action] ?? action }}
              </span>
            </label>
          </div>
        </div>
      </UCard>

      <div class="flex justify-end pt-2">
        <UButton label="Save Permissions" :loading="isSaving" @click="onSave" />
      </div>
    </template>
  </div>
</template>
