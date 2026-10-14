import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import { Platform, type ImageSourcePropType } from 'react-native';

/** What the user picked: a photo, nothing (they cancelled), or a problem to explain. */
export type PickResult = { uri: string } | { error: string } | null;

const CANNOT_OPEN = 'The camera or photos could not be opened. Check that ITER is allowed to use them.';

/** Opens the camera. In a phone browser the browser asks for camera access itself. */
export async function takePhoto(): Promise<PickResult> {
  try {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { error: 'ITER needs the camera for this. You can allow it in your phone’s settings, or choose a photo instead.' };
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    return result.canceled || !result.assets[0] ? null : { uri: result.assets[0].uri };
  } catch {
    return { error: CANNOT_OPEN };
  }
}

export async function choosePhoto(): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    return result.canceled || !result.assets[0] ? null : { uri: result.assets[0].uri };
  } catch {
    return { error: CANNOT_OPEN };
  }
}

/** A photo bundled with the app (the demo samples), as a file the image tools can open. */
export async function bundledPhoto(image: ImageSourcePropType): Promise<PickResult> {
  try {
    const asset = await Asset.fromModule(image as number).downloadAsync();
    return { uri: asset.localUri ?? asset.uri };
  } catch {
    return { error: 'The sample could not be opened.' };
  }
}
