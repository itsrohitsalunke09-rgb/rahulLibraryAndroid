export const PHOTO_DECODE_ERROR = "This file isn't a photo the app can read.";

/** Scales a size down so its long side is at most maxSide; never enlarges. */
export function fitWithin(width: number, height: number, maxSide = 1280): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Shrinks a photo to a JPEG whose long side is at most maxSide, so uploads stay small. */
export async function resizePhoto(file: Blob, maxSide = 1280, quality = 0.8): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(PHOTO_DECODE_ERROR);
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(PHOTO_DECODE_ERROR);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error(PHOTO_DECODE_ERROR))), 'image/jpeg', quality));
  } finally {
    bitmap.close();
  }
}
