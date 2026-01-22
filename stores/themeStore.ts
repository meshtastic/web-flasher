import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', {
  state: () => {
    return {
      theme: useLocalStorage<Theme>('theme', 'system'),
    }
  },
  getters: {
    /**
     * Get the effective theme (resolves 'system' to actual preference)
     */
    effectiveTheme(): 'light' | 'dark' {
      if (this.theme === 'system') {
        if (typeof window !== 'undefined') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return 'dark' // Default to dark if we can't detect
      }
      return this.theme
    },
    isDark(): boolean {
      return this.effectiveTheme === 'dark'
    },
  },
  actions: {
    setTheme(theme: Theme) {
      this.theme = theme
      this.applyTheme()
    },
    toggleTheme() {
      // Cycle through: light -> dark -> light (skip system)
      if (this.theme === 'dark') {
        this.setTheme('light')
      }
      else {
        this.setTheme('dark')
      }
    },
    applyTheme() {
      if (typeof document === 'undefined') return

      const root = document.documentElement
      const effectiveTheme = this.effectiveTheme

      if (effectiveTheme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
        root.setAttribute('data-theme', 'dark')
      }
      else {
        root.classList.add('light')
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    },
    initTheme() {
      this.applyTheme()

      // Listen for system theme changes
      if (typeof window !== 'undefined') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (this.theme === 'system') {
            this.applyTheme()
          }
        })
      }
    },
  },
})
