import { defineStore } from 'pinia';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as Toast[],
    recentToasts: new Set<string>(), // Track recent toast content to prevent duplicates
  }),
  actions: {
    addToast(toast: Omit<Toast, 'id'>) {
      // Create a unique key for this toast based on type, title, and message
      const toastKey = `${toast.type}-${toast.title}-${toast.message}`;
      
      // Check if we recently showed this exact toast (within 2 seconds)
      if (this.recentToasts.has(toastKey)) {
        console.log('Duplicate toast prevented:', toastKey);
        return;
      }
      
      // Add to recent toasts and remove after 2 seconds
      this.recentToasts.add(toastKey);
      setTimeout(() => {
        this.recentToasts.delete(toastKey);
      }, 10000);
      
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
      const newToast: Toast = {
        id,
        duration: toast.duration || 5000,
        persistent: toast.persistent || false,
        ...toast,
      };
      
      console.log('Toast added:', {
        id,
        type: toast.type,
        title: toast.title
      });
      
      this.toasts.push(newToast);
      
      // Auto-remove toast after duration unless it's persistent
      if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          this.removeToast(id);
        }, newToast.duration);
      }
      
      return id;
    },
    
    removeToast(id: string) {
      // On dismiss or expire, clear all toasts
      this.toasts = [];
    },
    
    clearAll() {
      this.toasts = [];
      this.recentToasts.clear();
    },
    
    // Convenience methods for different toast types
    success(title: string, message: string, options?: Partial<Toast>) {
      if (this.toasts.length > 0) return;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
      this.toasts.push({ type: 'success', title, message, id, ...options });
    },
    error(title: string, message: string, options?: Partial<Toast>) {
      if (this.toasts.length > 0) return;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
      this.toasts.push({ type: 'error', title, message, id, ...options });
    },
    warning(title: string, message: string, options?: Partial<Toast>) {
      if (this.toasts.length > 0) return;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
      this.toasts.push({ type: 'warning', title, message, id, ...options });
    },
    info(title: string, message: string, options?: Partial<Toast>) {
      if (this.toasts.length > 0) return;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
      this.toasts.push({ type: 'info', title, message, id, ...options });
    },
    dismiss(id: string) {
      // On dismiss, clear all toasts
      this.toasts = [];
    },
  },
});
