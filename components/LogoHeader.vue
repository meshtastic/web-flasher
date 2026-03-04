<template>
  <div class="logo-header mx-auto">
    <!-- RAK co-branding variant -->
    <div
      v-if="vendorCobrandingTag === 'RAK'"
      class="logo-header-content"
    >
      <div class="logo-container">
        <img
          v-if="themeStore.isDark"
          src="@/assets/img/logo.svg"
          class="logo-icon"
          alt="Meshtastic Logo"
        >
        <img
          v-else
          src="@/assets/img/logo-dark.svg"
          class="logo-icon"
          alt="Meshtastic Logo"
        >
        <span class="logo-separator">×</span>
        <img
          src="@/public/img/icon_rak-cropped.svg"
          class="logo-icon-partner"
          alt="RAK Logo"
        >
      </div>
      <h1 class="logo-title">
        {{ $t('header_title') }}
      </h1>
    </div>

    <!-- Hamcation event branding variant -->
    <div
      v-else-if="eventMode.enabled && eventMode.eventTag === 'Hamcation'"
      class="logo-header-content"
    >
      <div class="logo-container">
        <div class="logo-glow">
          <div class="logo-glow-animation" />
          <img
            v-if="themeStore.isDark"
            src="@/assets/img/logo.svg"
            class="logo-icon"
            alt="Meshtastic Logo"
          >
          <img
            v-else
            src="@/assets/img/logo-dark.svg"
            class="logo-icon"
            alt="Meshtastic Logo"
          >
        </div>
        <span class="logo-separator">×</span>
        <img
          src="@/assets/img/hamcation.svg"
          class="logo-icon-event"
          alt="Hamcation Logo"
        >
      </div>
      <h1 class="logo-title">
        <span class="logo-title-gradient">{{ $t('header_title') }}</span>
      </h1>
      <p class="logo-tagline">
        {{ eventMode.eventName }}
      </p>
    </div>

    <!-- Standard variant -->
    <div
      v-else
      class="logo-header-content"
    >
      <div class="logo-container">
        <div class="logo-glow">
          <div class="logo-glow-animation" />
          <img
            v-if="themeStore.isDark"
            src="@/assets/img/logo.svg"
            class="logo-icon"
            alt="Meshtastic Logo"
          >
          <img
            v-else
            src="@/assets/img/logo-dark.svg"
            class="logo-icon"
            alt="Meshtastic Logo"
          >
        </div>
      </div>
      <h1 class="logo-title">
        <span class="logo-title-gradient">{{ $t('header_title') }}</span>
      </h1>
      <p class="logo-tagline">
        {{ $t('description') }}
      </p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { vendorCobrandingTag } from '~/types/resources'
import { useThemeStore } from '~/stores/themeStore'
import { useEventMode } from '~/composables/useEventMode'

const themeStore = useThemeStore()
const { eventMode } = useEventMode()
</script>

<style scoped>
.logo-header {
  text-align: center;
  padding: 1rem 0;
}

.logo-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-glow {
  position: relative;
  display: inline-block;
}

.logo-glow-animation {
  position: absolute;
  inset: -4px;
  background: var(--accent-glow);
  opacity: 0.3;
  filter: blur(32px);
  border-radius: 50%;
  pointer-events: none;
  animation: logo-pulse 3s ease-in-out infinite;
  will-change: transform, opacity;
  transform: translateZ(0);
}

[data-theme="light"] .logo-glow-animation {
  animation: none;
  background: none;
  box-shadow: 0 0 32px var(--accent-glow);
  inset: 4px;
  border-radius: 12.5%;
}

@keyframes logo-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1) translateZ(0); }
  50% { opacity: 0.8; transform: scale(1.05) translateZ(0); }
}

.logo-icon {
  position: relative;
  height: 4rem;
  width: 4rem;
  object-fit: contain;
  filter: drop-shadow(0 0 20px var(--accent-glow));
  transition: transform 0.3s ease, filter 0.3s ease;
}

.logo-icon:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 0 30px var(--accent-subtle));
}

@media (min-width: 640px) {
  .logo-icon {
    height: 5rem;
    width: 5rem;
  }
}

@media (min-width: 768px) {
  .logo-icon {
    height: 6rem;
    width: 6rem;
  }
}

.logo-icon-partner {
  height: 6rem;
  width: 6rem;
}

@media (min-width: 640px) {
  .logo-icon-partner {
    height: 8rem;
    width: 8rem;
  }
}

.logo-icon-event {
  height: 5rem;
  width: auto;
  object-fit: contain;
  border-radius: 0.5rem;
}

@media (min-width: 640px) {
  .logo-icon-event {
    height: 6rem;
  }
}

@media (min-width: 768px) {
  .logo-icon-event {
    height: 7rem;
  }
}
.logo-separator {
  font-size: 2rem;
  color: var(--text-muted);
  font-weight: 200;
}

.logo-title {
  font-family: 'Doto', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
  color: var(--text-default);
}

@media (min-width: 640px) {
  .logo-title {
    font-size: 3rem;
  }
}

@media (min-width: 768px) {
  .logo-title {
    font-size: 3.75rem;
  }
}

.logo-title-gradient {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent) 40%, var(--accent-dark) 70%, var(--accent-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 2px 10px var(--accent-glow));
}

:root[data-theme="light"] .logo-title-gradient {
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
  background-clip: unset;
  color: #1a1a1a;
  filter: none;
}

.logo-tagline {
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 80%;
  text-align: center;
  margin-top: 0.25rem;
}

@media (min-width: 640px) {
  .logo-tagline {
    font-size: 1rem;
  }
}
</style>
