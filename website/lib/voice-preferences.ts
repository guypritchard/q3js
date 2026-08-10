export const VOICE_DEVICE_STORAGE_KEY = "q3js.voice.deviceId";

export function storedVoiceDeviceId(): string | undefined {
  return window.localStorage.getItem(VOICE_DEVICE_STORAGE_KEY)?.trim() || undefined;
}

export function storeVoiceDeviceId(deviceId?: string): void {
  if (deviceId) {
    window.localStorage.setItem(VOICE_DEVICE_STORAGE_KEY, deviceId);
  } else {
    window.localStorage.removeItem(VOICE_DEVICE_STORAGE_KEY);
  }
}
