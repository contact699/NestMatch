import * as ImagePicker from 'expo-image-picker'

export interface LiveCapture {
  uri: string
  capturedAt: string
}

/**
 * Launch the camera (no gallery) for a Live Photo capture used to verify a
 * listing. Returns null if permission is denied or the user cancels.
 *
 * `nowIso` is passed in by the caller (e.g. `new Date().toISOString()`) so this
 * helper stays free of ambient time for testability.
 */
export async function captureLivePhoto(nowIso: string): Promise<LiveCapture | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) return null
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7, exif: true })
  if (res.canceled || !res.assets?.[0]) return null
  return { uri: res.assets[0].uri, capturedAt: nowIso }
}
