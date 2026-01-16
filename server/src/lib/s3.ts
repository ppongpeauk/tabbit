/**
 * @author Composer
 * @description S3 service for Railway Buckets - handles presigned URLs and uploads
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { env } from "../config/env";

/**
 * Initialize S3 client with Railway Buckets configuration
 */
const BUCKET_NAME = env.AWS_S3_BUCKET_NAME;

const s3Client = new S3Client({
  endpoint: env.AWS_ENDPOINT_URL || undefined,
  region: env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: !!env.AWS_ENDPOINT_URL,
});

/**
 * Generate a presigned URL for reading an object
 * @param key S3 object key
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned POST URL for uploading files directly from client
 * @param key S3 object key where file will be stored
 * @param contentType Content type of the file (e.g., 'image/jpeg')
 * @param maxSize Maximum file size in bytes
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Presigned POST URL and fields
 */
export async function getPresignedPostUrl(
  key: string,
  contentType: string,
  maxSize: number = 5_000_000,
  expiresIn: number = 3600
): Promise<{ url: string; fields: Record<string, string> }> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }

  const baseContentType = contentType.split("/")[0];

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
    Conditions: [
      { bucket: BUCKET_NAME },
      ["eq", "$key", key],
      ["starts-with", "$Content-Type", `${baseContentType}/`],
      ["content-length-range", 1_000, maxSize],
    ],
  });

  return { url, fields };
}

/**
 * Upload a file directly from the server
 * @param key S3 object key
 * @param body File body (Buffer or Uint8Array)
 * @param contentType Content type of the file
 * @returns Success status
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Delete a file from the bucket
 * @param key S3 object key
 */
export async function deleteFile(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a unique key for group icons
 * @param groupId Group ID
 * @param extension File extension (e.g., 'jpg', 'png')
 * @returns S3 key
 */
export function generateGroupIconKey(
  groupId: string,
  extension: string
): string {
  const timestamp = Date.now();
  return `groups/${groupId}/icon-${timestamp}.${extension}`;
}

/**
 * Generate a unique key for receipt images
 * @param receiptId Receipt ID
 * @param extension File extension (e.g., 'jpg', 'png')
 * @returns S3 key
 */
export function generateReceiptImageKey(
  receiptId: string,
  extension: string
): string {
  const timestamp = Date.now();
  return `receipts/${receiptId}/photo-${timestamp}.${extension}`;
}
