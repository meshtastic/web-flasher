# Copilot Instructions

These guidelines help keep contributions consistent in this project. 
## General
- Stack: Nuxt 3, Vue 3 SFCs, TypeScript, Pinia stores, Tailwind CSS, vue-i18n.
- Prefer composition API with `<script setup lang="ts">`. Use `defineProps`, `defineEmits`, `defineExpose` sparingly.
- Keep files ASCII-only unless the file already uses Unicode for locales.
- Keep logic small and focused; favor composables/util functions in `utils/` or store actions over in-component sprawl.
- Use playwright to test your changes and view the context and outcomes as much as possible. The app is running with `npm run dev` on localhost:3000.


## Vue patterns
- Use template refs and computed values instead of direct DOM manipulation where possible.
- Avoid global document/window listeners unless necessary; clean them up in `onUnmounted`.
- Keep dropdowns/menus simple (`position: absolute` under a relative parent) unless overflow escaping is required.
- Use existing stores: `useDeviceStore`, `useFirmwareStore`, `useSerialMonitorStore`, `useToastStore`, etc. Don’t recreate state in components.

## Styling
- Use Tailwind utility classes; avoid inline styles unless dynamic sizing demands it.
- Reuse existing semantic button classes (`btn-primary`, `btn-icon`, etc.) and text colors.
- Maintain consistent spacing (multiples of 2 or 4 px via Tailwind scales).

## Internationalization
- All user-visible text must go through `useI18n` (`$t('key')`). Do not hardcode strings in templates or scripts.
- Add new locale keys to all files in `i18n/locales/` (at minimum `en.json`) and keep keys flat and descriptive.

## Data & APIs
- Types: prefer existing interfaces in `types/`. If adding, keep them colocated or in `types/`.
- When fetching firmware/device data, use store actions; avoid duplicating fetch logic.

## Testing & quality
- Keep lint-friendly code: no unused imports/vars, consistent `async/await`, and null checks for DOM refs.
- Handle failure paths (API fetch errors, missing device selection) with graceful UI states using existing toast patterns.

## Accessibility
- Maintain keyboard/focus behavior for interactive elements; use semantic buttons/links and ARIA labels when appropriate.
- Avoid triggering animations that block focus or screen readers.

## Commits
- Keep diffs minimal and scoped; avoid reformat-only changes.
