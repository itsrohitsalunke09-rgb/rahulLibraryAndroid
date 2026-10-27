import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

/** Folder inside the phone's Documents where exported files go. */
export const SAVE_FOLDER = 'Rahul Library';

/**
 * Saves a generated file where the user can find it: on the phone in Documents › Rahul Library
 * (visible in the Files app), in a browser as a normal download. Returns where it went, for a message.
 */
export async function saveFile(bytes: Uint8Array, fileName: string, mimeType: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return `Downloads › ${fileName}`;
  }
  // Android 10 and older ask for storage access; newer versions allow it without asking.
  const { publicStorage } = await Filesystem.requestPermissions();
  if (publicStorage !== 'granted') {
    throw new Error('Allow storage access to save the PDF.');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const data = btoa(binary);
  const write = (name: string) =>
    Filesystem.writeFile({ path: `${SAVE_FOLDER}/${name}`, data, directory: Directory.Documents, recursive: true });
  try {
    await write(fileName);
    return `Documents › ${SAVE_FOLDER} › ${fileName}`;
  } catch {
    // Android won't let a reinstalled app overwrite a file an earlier install saved; keep both.
    const stamped = fileName.replace(/(\.[^.]+)$/, `-${Date.now().toString(36)}$1`);
    await write(stamped);
    return `Documents › ${SAVE_FOLDER} › ${stamped}`;
  }
}
