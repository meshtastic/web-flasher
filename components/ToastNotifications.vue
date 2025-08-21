<template>
  <Teleport to="body">
    <div class="fixed top-6 right-6 z-50 space-y-3">
      <TransitionGroup name="toast" tag="div">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="min-w-96 max-w-xl w-auto bg-zinc-700 backdrop-blur-sm shadow-xl rounded-lg pointer-events-auto ring-1 ring-gray-600 overflow-hidden border border-gray-600"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <component :is="getIcon(toast.type)" :class="getIconClass(toast.type)" class="h-6 w-6" />
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p class="text-sm font-medium text-gray-100">{{ toast.title }}</p>
                <p class="mt-1 text-sm text-gray-300">{{ toast.message }}</p>
                <div v-if="!toast.persistent" class="mt-3 flex space-x-2">
                  <button
                    @click="toastStore.removeToast(toast.id)"
                    class="text-sm font-medium text-meshtastic hover:text-green-300 transition-colors duration-200"
                  >
                    {{ $t('actions.dismiss') }}
                  </button>
                </div>
              </div>
              <div class="ml-4 flex-shrink-0 flex">
                <button
                  @click="toastStore.removeToast(toast.id)"
                  class="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-meshtastic focus:ring-offset-zinc-700 transition-colors duration-200"
                >
                  <span class="sr-only">{{ $t('actions.close') }}</span>
                  <X class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <!-- Error toast with dismiss button -->
          <div v-if="toast.type === 'error' && toast.persistent" class="bg-zinc-800 px-4 py-3 border-t border-gray-600">
            <div class="flex">
              <button
                @click="toastStore.removeToast(toast.id)"
                class="text-sm font-medium text-gray-300 hover:text-gray-100 transition-colors duration-200"
              >
                {{ $t('actions.dismiss') }}
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '~/stores/toastStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next';

const toastStore = useToastStore();

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

const getIconClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'info':
    default:
      return 'text-blue-400';
  }
};
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

/* Custom focus ring for meshtastic theme */
.focus\:ring-meshtastic:focus {
  --tw-ring-color: #67EA94;
}

/* Meshtastic text color */
.text-meshtastic {
  color: #67EA94;
}
</style>
