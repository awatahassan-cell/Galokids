import { apiFetch } from '../config/api';

/**
 * Image uploads for the admin panel.
 *
 * Everything goes through the backend's `/products/upload-images` endpoint,
 * which stores the file and returns a public URL. If the API cannot be reached
 * the image is inlined as a data: URL so the admin can still finish their work
 * offline — the caller decides whether that fallback is acceptable.
 */

/**
 * Shrink an image in the browser before uploading it: a 6 MB phone photo
 * becomes a few hundred KB, which matters a lot on Iraqi mobile connections.
 */
export const compressImage = (file: File, maxSize = 1600, quality = 0.85): Promise<Blob> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxSize || height > maxSize) {
        if (width >= height) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unsupported'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image'));
    };

    img.src = url;
  });

export const fileToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export interface UploadResult {
  urls: string[];
  /** True when the server stored the files; false when we fell back to data URLs. */
  uploaded: boolean;
  message?: string;
}

/**
 * Upload one or more images and return their URLs.
 *
 * `compress` can be turned off for artwork such as a logo with transparency,
 * where re-encoding to JPEG would paint a black background behind it.
 */
export const uploadImages = async (
  files: File[],
  options: { compress?: boolean; maxSize?: number } = {}
): Promise<UploadResult> => {
  const { compress = true, maxSize = 1600 } = options;

  if (!files.length) {
    return { urls: [], uploaded: false };
  }

  const formData = new FormData();

  for (const file of files) {
    if (compress) {
      try {
        const blob = await compressImage(file, maxSize);
        formData.append('images[]', blob, (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg');
        continue;
      } catch {
        // fall through and send the original file
      }
    }
    formData.append('images[]', file);
  }

  const token = localStorage.getItem('kidskart_auth_token');

  try {
    const res = await apiFetch('/products/upload-images', {
      method: 'POST',
      // Note: no Content-Type header — the browser must set the multipart boundary.
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const urls: string[] = Array.isArray(data?.urls) ? data.urls : data?.url ? [data.url] : [];
      if (urls.length > 0) {
        return { urls, uploaded: true };
      }
    } else {
      const body = await res.json().catch(() => ({} as any));
      return { urls: [], uploaded: false, message: body?.message };
    }
  } catch (err) {
    console.warn('Image upload request failed:', err);
  }

  // Offline fallback: keep the image as a data URL so nothing is lost.
  const urls: string[] = [];
  for (const file of files) {
    try {
      urls.push(await fileToDataUrl(compress ? await compressImage(file, maxSize) : file));
    } catch {
      try {
        urls.push(await fileToDataUrl(file));
      } catch {
        /* skip unreadable file */
      }
    }
  }

  return { urls, uploaded: false };
};
