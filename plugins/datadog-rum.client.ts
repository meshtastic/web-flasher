// Datadog RUM initialization for Nuxt/Vue
import { datadogRum } from '@datadog/browser-rum';

export default defineNuxtPlugin((nuxtApp) => {
  // Only initialize in browser environment
  if (import.meta.client) {
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
    
    // Access stores to track firmware and device selections
    const firmwareStore = useFirmwareStore();
    const deviceStore = useDeviceStore();
    
    // Function to update user context in Datadog RUM
    const updateRumContext = () => {
      const contextData: Record<string, any> = {};
      
      // Add firmware version if selected
      if (firmwareStore.selectedFirmware?.id) {
        contextData.firmwareVersion = firmwareStore.selectedFirmware.id;
      }
      
      // Add hardware model if target is selected
      if (deviceStore.selectedTarget?.hwModel) {
        contextData.hwModel = deviceStore.selectedTarget.hwModel;
      }
      
      // Add platformio target if target is selected
      if (deviceStore.selectedTarget?.platformioTarget) {
        contextData.platformioTarget = deviceStore.selectedTarget.platformioTarget;
      }
      
      // Set user context in Datadog RUM
      if (Object.keys(contextData).length > 0) {
        datadogRum.setUser(contextData);
      }
    };
    
    // Watch for changes in selected firmware and device
    watch(() => firmwareStore.selectedFirmware, updateRumContext, { deep: true });
    watch(() => deviceStore.selectedTarget, updateRumContext, { deep: true });
    
    // Initial context update
    updateRumContext();
    
    console.log('Datadog RUM initialized');
  }
});
