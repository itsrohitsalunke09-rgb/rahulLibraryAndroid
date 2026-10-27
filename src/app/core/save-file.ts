import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Hands a generated file to the user. On the phone it opens Android's share sheet, from which
 * it can be saved to Files/Drive, printed, or sent on WhatsApp; in a browser it downloads.
 */
export async function saveFile(bytes: Uint8Array, fileName: string, mimeType: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const { uri } = await Filesystem.writeFile({ path: fileName, data: btoa(binary), directory: Directory.Cache });
  await Share.share({ title: fileName, files: [uri] });
}
