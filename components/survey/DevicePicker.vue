<template>
  <div class="device-picker">
    <div class="device-controls">
      <input
        v-model="query"
        type="search"
        class="device-search"
        :placeholder="`Search ${DEVICE_OPTIONS.length} devices…`"
        aria-label="Search devices"
      >
      <span
        v-if="selected.length"
        class="device-count"
      >{{ selected.length }} selected</span>
    </div>

    <div
      class="device-vendors"
      role="group"
      aria-label="Filter by manufacturer"
    >
      <button
        type="button"
        class="device-chip"
        :class="{ 'device-chip-active': vendor === null }"
        @click="vendor = null"
      >
        All
      </button>
      <button
        v-for="name in DEVICE_VENDORS"
        :key="name"
        type="button"
        class="device-chip"
        :class="{ 'device-chip-active': vendor === name }"
        @click="vendor = vendor === name ? null : name"
      >
        {{ name }}
      </button>
    </div>

    <p
      v-if="filtered.length === 0"
      class="device-empty"
    >
      No devices match “{{ query }}”. Try the manufacturer name, or pick
      “Something else” below.
    </p>

    <ul class="device-grid">
      <li
        v-for="device in filtered"
        :key="device.code"
      >
        <label
          class="device-tile"
          :class="{ 'device-tile-active': selected.includes(device.code) }"
        >
          <input
            type="checkbox"
            class="device-input"
            :value="device.code"
            :checked="selected.includes(device.code)"
            @change="emit('toggle', device.code)"
          >
          <img
            :src="imageFor(device)"
            class="device-image"
            alt=""
            loading="lazy"
            decoding="async"
          >
          <span class="device-label">{{ device.label }}</span>
        </label>
      </li>
    </ul>

    <label
      class="device-other"
      :class="{ 'device-tile-active': selected.includes(OTHER_CODE) }"
    >
      <input
        type="checkbox"
        class="device-input"
        :value="OTHER_CODE"
        :checked="selected.includes(OTHER_CODE)"
        @change="emit('toggle', OTHER_CODE)"
      >
      <span>Something else, or I'm not sure</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { DEVICE_OPTIONS, DEVICE_VENDORS, type DeviceOption } from './devices.generated'
import { useThemeStore } from '../../stores/themeStore'

const props = defineProps<{
  selected: string[]
}>()

const emit = defineEmits<{
  toggle: [code: string]
}>()

/** Must match the `other` option code declared for q_devices in schema.ts. */
const OTHER_CODE = 'other'

const themeStore = useThemeStore()
const query = ref('')
const vendor = ref<string | null>(null)

/**
 * Devices matching the current search and vendor filter, plus anything already
 * selected. Without that union a respondent who picks a device and then types a
 * new query loses sight of the selection while it is still in their answer,
 * which reads as the click not having registered.
 */
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return DEVICE_OPTIONS.filter((device) => {
    if (props.selected.includes(device.code)) return true
    if (vendor.value && device.vendor !== vendor.value) return false
    if (!needle) return true
    return (
      device.label.toLowerCase().includes(needle)
      || device.vendor.toLowerCase().includes(needle)
      || device.slug.toLowerCase().includes(needle)
    )
  })
})

// Some boards ship no artwork; fall back to the same placeholder the
// flasher uses, which has a light-mode variant.
function imageFor(device: DeviceOption): string {
  if (device.image) return `/img/devices/${device.image}`
  return themeStore.isDark
    ? '/img/devices/unknown-new.svg'
    : '/img/devices/unknown-new-light.svg'
}

const selected = computed(() => props.selected)
</script>

<style scoped>
.device-picker {
  margin-top: 0.75rem;
}

.device-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.device-search {
  flex: 1;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  background: var(--surface-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-default);
  font: inherit;
}

.device-search:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.device-count {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: var(--accent);
}

.device-vendors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
}

.device-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  cursor: pointer;
  background: var(--tag-inactive-bg);
  border: 1px solid var(--tag-inactive-border);
  color: var(--tag-inactive-text);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.device-chip:hover {
  border-color: var(--tag-inactive-border-hover);
  color: var(--tag-inactive-text-hover);
}

.device-chip-active {
  background: var(--tag-active-bg);
  border-color: var(--tag-active-border);
  color: var(--text-default);
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
  /* The full list is too tall to scroll past on the way to the next question. */
  max-height: 26rem;
  overflow-y: auto;
}

.device-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  padding: 0.75rem 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  text-align: center;
  background: var(--device-card-bg);
  border: 1px solid var(--device-card-border);
  color: var(--text-muted);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.device-tile:hover {
  background: var(--device-card-bg-hover);
  border-color: var(--device-card-border-hover);
  color: var(--text-default);
}

.device-tile-active {
  background: var(--tag-active-bg);
  border-color: var(--tag-active-border);
  color: var(--text-default);
}

.device-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.device-input:focus-visible + .device-image {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 0.25rem;
}

.device-image {
  width: 3.5rem;
  height: 3.5rem;
  object-fit: contain;
}

.device-label {
  font-size: 0.75rem;
  line-height: 1.35;
}

.device-empty {
  font-size: 0.875rem;
  color: var(--text-muted);
  padding: 1rem 0;
}

.device-other {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  background: var(--tag-inactive-bg);
  border: 1px solid var(--tag-inactive-border);
  color: var(--tag-inactive-text);
}

.device-other:hover {
  border-color: var(--tag-inactive-border-hover);
  color: var(--tag-inactive-text-hover);
}
</style>
