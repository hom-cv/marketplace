/**
 * Image upload client — direct-to-storage via presigned URLs.
 *
 * Flow: ask the API for a presigned PUT URL, upload the file bytes straight to
 * object storage, then use the returned public CDN URL when creating/updating a
 * listing. File bytes never pass through our API server.
 */

import { jsonRequest } from "@/api/api";

export interface PresignResponse {
  /** Signed PUT URL to upload the raw bytes to. */
  upload_url: string;
  /** Public CDN URL to reference once the upload succeeds. */
  file_url: string;
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
 * The presigned URL is signed for this exact Content-Type and a public-read
 * ACL, so the PUT must send matching `Content-Type` and `x-amz-acl` headers or
 * the signature is rejected.
 */
export async function uploadImage(file: File): Promise<string> {
  const { upload_url, file_url } = await presignUpload(file.type);

  const response = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "x-amz-acl": "public-read",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed (HTTP ${response.status})`);
  }

  return file_url;
}

/** Upload several images concurrently, preserving order. */
export async function uploadImages(files: File[]): Promise<string[]> {
  return Promise.all(files.map(uploadImage));
}
