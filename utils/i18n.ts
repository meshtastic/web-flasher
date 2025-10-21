// Global i18n instance for use in Pinia stores
// This provides access to translations outside of Vue component context

let globalI18n: any = null

export function setGlobalI18n(i18nInstance: any) {
  globalI18n = i18nInstance
}

export function getGlobalI18n() {
  return globalI18n
}

export function t(key: string, params?: any): string {
  if (!globalI18n) {
    console.warn('Global i18n instance not set, returning key:', key)
    return key
  }

  try {
    console.log('Translating key:', key, 'with i18n instance:', globalI18n)
    const result = globalI18n.t(key, params)
    console.log('Translation result:', result)
    return result
  }
  catch (error) {
    console.warn('Translation error for key:', key, error)
    return key
  }
}
