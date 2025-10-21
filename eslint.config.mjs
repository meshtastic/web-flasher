// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Vue rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/attributes-order': 'warn',
      'vue/first-attribute-linebreak': 'warn',
      'vue/require-v-for-key': 'warn',
      'vue/return-in-computed-property': 'warn',
      // TypeScript rules - warn instead of error
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['types/resources.ts'],
  },
)
