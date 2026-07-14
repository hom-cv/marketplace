/**
 * Image upload client — direct-to-storage via presigned URLs.
 *
 * Flow: ask the API for a presigned PUT URL, upload the file bytes straight to
 * object storage, then use the returned public CDN URL when creating/updating a
 * listing. File bytes never pass through our API server.
 */

import { jsonRequest } from "@/api/api";

export interface PresignResponse {
  url: string;
  fields: Record<string, string>;
  file_url: string;
}

const MAX_BYTES = 600 * 1024;
const MAX_DIMENSION = 2000; // px longest edge — large enough to view/zoom
const QUALITY_STOPS = [0.8, 0.6, 0.45];

function drawScaled(bitmap: ImageBitmap, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

async function downscale(file: File): Promise<Blob> {
  if (file.size <= MAX_BYTES) return file;

  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  }).catch(() => null);

  if (!bitmap) return file;

  const canvas = drawScaled(bitmap, MAX_DIMENSION);
  bitmap.close();

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STOPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) continue;
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= MAX_BYTES) return blob;
  }

  return smallest && smallest.size < file.size ? smallest : file;
}

/** Request a presigned upload target for a given image MIME type. */
export async function presignUpload(
  contentType: string,
): Promise<PresignResponse> {
  return jsonRequest<PresignResponse>("/posts/uploads/presign", "POST", {
    content_type: contentType,
  });
}

/**
 * Upload a single image directly to storage and return its public URL.
 *
 * Uses a presigned POST whose signed policy caps the size and pins the
 * content type. The `fields` from the presign must be appended first and the
 * file bytes last, or the policy rejects the upload.
 */
export async function uploadImage(file: File): Promise<string> {
  const blob = await downscale(file);
  const contentType = blob.type || file.type;
  const { url, fields, file_url } = await presignUpload(contentType);

  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", blob); // must be last

  const response = await fetch(url, { method: "POST", body: form });

  if (!response.ok) {
    throw new Error(`Image upload failed (HTTP ${response.status})`);
  }

  return file_url;
}

/** Upload several images concurrently, preserving order. */
export async function uploadImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map(uploadImage));
}
