<template>
  <Teleport to="body">
    <div class="fixed top-6 right-6 z-[70] space-y-3">
      <TransitionGroup
        name="toast"
        tag="div"
      >
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="min-w-96 max-w-xl w-auto backdrop-blur-sm shadow-xl rounded-lg pointer-events-auto overflow-hidden bg-surface-modal border-theme"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <component
                  :is="getIcon(toast.type)"
                  :class="getIconClass(toast.type)"
                  class="h-6 w-6"
                />
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-theme">
                  {{ toast.title }}
                </p>
                <p class="mt-1 text-sm text-theme-muted">
                  {{ toast.message }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  class="bg-transparent rounded-md inline-flex text-theme-muted hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-meshtastic-300 transition-colors duration-200"
                  @click="toastStore.removeToast(toast.id)"
                >
                  <span class="sr-only">{{ $t('actions.close') }}</span>
                  <X class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <!-- Error toast with dismiss and reload buttons -->
          <div
            v-if="toast.type === 'error'"
            class="px-4 py-3 bg-surface-secondary border-theme-top"
          >
            <div class="flex">
              <button
                class="text-sm font-medium text-theme-muted hover:opacity-80 transition-colors duration-200"
                @click="toastStore.removeToast(toast.id)"
              >
                {{ $t('actions.dismiss') }}
              </button>
              <button
                class="ml-2 text-sm font-medium text-error-dark dark:text-error hover:opacity-80 transition-colors duration-200"
                @click="reloadPage"
              >
                {{ $t('actions.reload') }}
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toastStore'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const toastStore = useToastStore()

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return XCircle
    case 'warning':
      return AlertTriangle
    case 'info':
    default:
      return Info
  }
}

const getIconClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-meshtastic-400 dark:text-meshtastic-300'
    case 'error':
      return 'text-error-dark dark:text-error'
    case 'warning':
      return 'text-warning-dark dark:text-warning'
    case 'info':
    default:
      return 'text-info-dark dark:text-info'
  }
}

function reloadPage() {
  window.location.reload()
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Ensure proper font family */
.max-w-sm {
  font-family: 'Atkinson Hyperlegible', 'Lato', 'Inter', sans-serif;
}
</style>
