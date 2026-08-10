export const VOICE_ENABLED_STORAGE_KEY = "q3js.voice.enabled";
export const VOICE_DEVICE_STORAGE_KEY = "q3js.voice.deviceId";

export function storedVoiceEnabled(): boolean {
  return window.localStorage.getItem(VOICE_ENABLED_STORAGE_KEY) !== "false";
}

export function storedVoiceDeviceId(): string | undefined {
  return window.localStorage.getItem(VOICE_DEVICE_STORAGE_KEY)?.trim() || undefined;
}

export function storeVoicePreferences(enabled: boolean, deviceId?: string): void {
  window.localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(enabled));
  if (deviceId) {
    window.localStorage.setItem(VOICE_DEVICE_STORAGE_KEY, deviceId);
  } else {
    window.localStorage.removeItem(VOICE_DEVICE_STORAGE_KEY);
  }
}
