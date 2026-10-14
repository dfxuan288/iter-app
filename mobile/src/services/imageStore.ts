import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Keeps receipt photos on the phone, as JPEG base64 under an id. Nothing here throws.
 * This is the native version (key-value storage); the web uses IndexedDB (imageStore.web.ts),
 * because a browser's ordinary storage only holds a few megabytes.
 */

const prefix = (id: string) => `iter.image.${id}`;

export const imageStore = {
  /** Returns false when the photo could not be kept. */
  async save(id: string, base64Jpeg: string): Promise<boolean> {
    try {
      await AsyncStorage.setItem(prefix(id), base64Jpeg);
      return true;
    } catch {
      return false;
    }
  },

  /** A data URI ready for an <Image>, or null when the photo is not here. */
  async load(id: string): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(prefix(id));
      return data ? `data:image/jpeg;base64,${data}` : null;
    } catch {
      return null;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(prefix(id));
    } catch {
      // A leftover photo costs a little space and nothing else.
    }
  },
};
