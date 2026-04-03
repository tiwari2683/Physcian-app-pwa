/**
 * uploadService.ts — Browser adaptation of the RN UploadService.ts
 *
 * Key differences from the React Native version:
 *  • Uses browser fetch() instead of expo-file-system
 *  • File content read via raw browser File object (file.file)
 *  • Batch parallel uploads capped at 3 concurrent
 */

import { apiClient } from './api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A file freshly picked from the browser's <input type="file">.
 * May also represent a previously uploaded S3 file (no .file, has .s3Key).
 */
export interface LocalReportFile {
  id: string;
  file?: File;              // Raw browser File — only present for newly picked files
  name: string;
  size: string;             // Display string, e.g. "0.12 MB"
  type: 'image' | 'document';
  previewUri: string | null;
  // S3 metadata — set after a successful upload
  s3Key?: string;
  key?: string;
  uploadedToS3?: true;
  uploadDate?: string;
  s3Url?: string;           // Presigned GET URL returned by backend enrichPatientFilesWithSignedUrls
  url?: string;             // Alias used by some Lambda responses
}

/** What the Lambda returns after a successful upload confirmation */
export interface UploadedFileRecord {
  key: string;
  s3Key: string;
  name: string;
  type: string;
  category: string;
  size: number;
  uploadedToS3: true;
  uploadDate: string;
}

/** Shape of the Lambda presigned URL response */
interface PresignedUrlResponse {
  success: boolean;
  uploadUrl?: string;
  s3Key?: string;
  key?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseResponse = (data: unknown) => {
  const d = data as Record<string, unknown>;
  if (d?.body) {
    return typeof d.body === 'string' ? JSON.parse(d.body) : d.body;
  }
  return d;
};

/**
 * True when a file has actually been uploaded to S3 and doesn't need re-uploading.
 */
export function fileNeedsUpload(file: LocalReportFile): boolean {
  // Already uploaded — has S3 key metadata
  if (file.uploadedToS3 && (file.key || file.s3Key)) return false;
  // Must have a real browser File/Blob — NOT a JSON-deserialized empty object {}
  // JSON.stringify(file) → { file: {} } → file.file becomes {} (truthy!)
  // Without instanceof check, fetch(url, { body: {} }) sends "[object Object]" (15 bytes)
  const raw = file.file as unknown;
  if (!(raw instanceof File) && !(raw instanceof Blob)) return false;
  return true;
}

// ─── Step 1 — Request presigned upload URL ────────────────────────────────────

async function getPresignedUploadUrl(
  patientId: string,
  file: LocalReportFile
): Promise<PresignedUrlResponse> {
  try {
    const response = await apiClient.post('/patient-data', {
      action: 'getPresignedUploadUrl',
      patientId,
      fileName: file.name,
      fileType: file.file?.type || 'application/octet-stream',
      fileSize: file.file?.size ?? 0,
      category: file.type === 'image' ? 'Image' : 'Document',
    });
    return parseResponse(response.data) as PresignedUrlResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[UploadService] getPresignedUploadUrl failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// ─── Step 2 — PUT file binary directly to S3 ─────────────────────────────────

async function putToS3(
  presignedUrl: string,
  file: LocalReportFile
): Promise<{ success: boolean; error?: string }> {
  // Strict check — a JSON-deserialized File becomes {} and must be rejected
  const raw = file.file as unknown;
  if (!(raw instanceof File) && !(raw instanceof Blob)) {
    return { success: false, error: 'file.file is not a real File/Blob (may have been lost to JSON serialization)' };
  }

  try {
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      body: raw as File,
      headers: { 'Content-Type': (raw as File).type || 'application/octet-stream' },
    });

    if (res.ok) return { success: true };
    return { success: false, error: `S3 PUT responded ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Step 3 — Confirm upload (Lambda records metadata in DynamoDB) ────────────

async function confirmFileUpload(
  patientId: string,
  s3Key: string,
  file: LocalReportFile
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.post('/patient-data', {
      action: 'confirmFileUpload',
      patientId,
      s3Key,
      fileName: file.name,
      fileType: file.file?.type || 'application/octet-stream',
      category: file.type === 'image' ? 'Image' : 'Document',
      fileSize: file.file?.size ?? 0,
    });
    const data = parseResponse(response.data) as { success: boolean; error?: string };
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full 3-step upload for a single file.
 * Returns UploadedFileRecord on success, null on any failure.
 */
export async function uploadFileWithPresignedUrl(
  file: LocalReportFile,
  patientId: string
): Promise<UploadedFileRecord | null> {
  // Skip guard — already uploaded
  if (!fileNeedsUpload(file)) {
    return {
      key: file.key ?? file.s3Key ?? '',
      s3Key: file.s3Key ?? file.key ?? '',
      name: file.name,
      type: file.file?.type ?? 'application/octet-stream',
      category: file.type === 'image' ? 'Image' : 'Document',
      size: file.file?.size ?? 0,
      uploadedToS3: true,
      uploadDate: file.uploadDate ?? new Date().toISOString(),
    };
  }

  // Step 1 — presigned URL
  const presignedResponse = await getPresignedUploadUrl(patientId, file);
  if (!presignedResponse.success || !presignedResponse.uploadUrl) {
    console.error(`[UploadService] Could not get presigned URL for ${file.name}`);
    return null;
  }

  // Step 2 — PUT to S3
  const uploadResult = await putToS3(presignedResponse.uploadUrl, file);
  if (!uploadResult.success) {
    console.error(`[UploadService] S3 PUT failed for ${file.name}:`, uploadResult.error);
    return null;
  }

  const s3Key = presignedResponse.s3Key ?? presignedResponse.key!;

  // Step 3 — confirm with Lambda
  const confirmResult = await confirmFileUpload(patientId, s3Key, file);
  if (!confirmResult.success) {
    console.error(`[UploadService] confirm failed for ${file.name}:`, confirmResult.error);
    return null;
  }

  return {
    key: s3Key,
    s3Key,
    name: file.name,
    type: file.file?.type ?? 'application/octet-stream',
    category: file.type === 'image' ? 'Image' : 'Document',
    size: file.file?.size ?? 0,
    uploadedToS3: true,
    uploadDate: new Date().toISOString(),
  };
}

/**
 * Request a presigned GET URL from the backend to securely view a file.
 */
export async function getPresignedGetUrl(
  patientId: string,
  s3Key: string
): Promise<string | null> {
  try {
    const response = await apiClient.post('/patient-data', {
      action: 'getPresignedGetUrl',
      patientId,
      s3Key,
    });
    const data = parseResponse(response.data) as { url?: string; success?: boolean; error?: string };
    return data.url || null;
  } catch (err: unknown) {
    console.error(`[UploadService] getPresignedGetUrl failed:`, err);
    return null;
  }
}

/**
 * Upload multiple files in parallel batches of 3.
 *
 * @param files     — Only files where fileNeedsUpload() is true will be uploaded.
 * @param patientId — Used to namespace keys in S3.
 * @param onProgress — Called after each file completes (uploaded + failed counts).
 */
export async function uploadFilesWithPresignedUrls(
  files: LocalReportFile[],
  patientId: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ uploaded: UploadedFileRecord[]; failed: string[] }> {
  const toUpload = files.filter(fileNeedsUpload);
  const uploaded: UploadedFileRecord[] = [];
  const failed: string[] = [];
  let done = 0;
  const total = toUpload.length;

  // Deduplicate by name to avoid uploading the same file twice
  const unique = Array.from(new Map(toUpload.map(f => [f.name, f])).values());

  const batchSize = 3;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(f => uploadFileWithPresignedUrl(f, patientId))
    );

    results.forEach((result, idx) => {
      done++;
      if (result) {
        uploaded.push(result);
      } else {
        failed.push(batch[idx].name);
      }
      onProgress?.(done, total);
    });
  }

  return { uploaded, failed };
}
