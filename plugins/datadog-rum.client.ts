// Datadog RUM initialization for Nuxt/Vue
import { datadogRum } from '@datadog/browser-rum';

export default defineNuxtPlugin(() => {
  // Only initialize in browser environment
  if (false && import.meta.client) {
    const config = useRuntimeConfig();
    
    // Initialize Datadog RUM
    datadogRum.init({
      applicationId: config.public.datadogApplicationId || 'YOUR_APPLICATION_ID',
      clientToken: config.public.datadogClientToken || 'YOUR_CLIENT_TOKEN',
      site: 'us5.datadoghq.com',
      service: 'meshtastic-web-flasher',
      env: config.public.datadogEnv || 'production',
      // Specify a version number to identify the deployed version of your application in Datadog
      // version: '1.0.0',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      defaultPrivacyLevel: 'allow',
    });
    
    // Start session replay recording
    datadogRum.startSessionReplayRecording();
    
    console.log('Datadog RUM initialized');
  }
});
