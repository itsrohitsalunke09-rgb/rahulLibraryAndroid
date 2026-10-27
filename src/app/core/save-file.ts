import { Capacitor, registerPlugin } from '@capacitor/core';

/** The app's own Android plugin (android/…/DownloadsPlugin.java). */
interface DownloadsPlugin {
  /** Saves into Download › Rahul Library and shows a "Download complete" notification that opens it. */
  save(options: { fileName: string; data: string; mimeType: string }): Promise<{ path: string; uri: string; notified: boolean }>;
}

const Downloads = registerPlugin<DownloadsPlugin>('Downloads');

/**
 * Saves a generated file to the phone's Download › Rahul Library folder with a notification,
 * or downloads it in a browser. Returns where it went, for a message.
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
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const { path } = await Downloads.save({ fileName, data: btoa(binary), mimeType });
  return path;
}
