// Datadog RUM initialization for Nuxt/Vue
import { datadogRum } from '@datadog/browser-rum';

export default defineNuxtPlugin(() => {
  // Only initialize in browser environment
  if (import.meta.client) {
    const config = useRuntimeConfig();
    
    // Initialize Datadog RUM
    datadogRum.init({
      applicationId: config.public.datadogApplicationId || 'YOUR_APPLICATION_ID',
      clientToken: config.public.datadogClientToken || 'YOUR_CLIENT_TOKEN',
      site: 'us5.datadoghq.com',
      service: 'web-flasher',
      env: config.public.datadogEnv || 'production',
      version: '1.0.0',
      sessionSampleRate: 100,
      trackInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input',
    });
    
    // Start session replay recording
    datadogRum.startSessionReplayRecording();
    
    console.log('Datadog RUM initialized');
  }
});
