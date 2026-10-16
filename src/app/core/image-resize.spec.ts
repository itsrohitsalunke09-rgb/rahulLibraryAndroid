import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_DECODE_ERROR, fitWithin, resizePhoto } from './image-resize';

describe('fitWithin', () => {
  it('scales a landscape photo down to the long side', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it('scales a portrait photo down to the long side', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('resizePhoto', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects with a friendly message when the file cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad image')));
    await expect(resizePhoto(new Blob(['%PDF']))).rejects.toThrow(PHOTO_DECODE_ERROR);
  });

  it('retries without options when the WebView rejects them with a TypeError', async () => {
    const stub = vi.fn().mockRejectedValueOnce(new TypeError('bad option')).mockRejectedValueOnce(new Error('bad image'));
    vi.stubGlobal('createImageBitmap', stub);
    await expect(resizePhoto(new Blob(['x']))).rejects.toThrow(PHOTO_DECODE_ERROR);
    expect(stub).toHaveBeenCalledTimes(2);
    expect(stub.mock.calls[1].length).toBe(1);
  });

  it('rejects with the same message when createImageBitmap is unavailable', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    await expect(resizePhoto(new Blob(['%PDF']))).rejects.toThrow(PHOTO_DECODE_ERROR);
  });
});
