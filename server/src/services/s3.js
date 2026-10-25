import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const s3Enabled = Boolean(env.aws.bucket);
// Credentials come from the default AWS chain (env vars, ~/.aws, or IAM role).
const client = s3Enabled ? new S3Client({ region: env.aws.region }) : null;

export const presignUpload = (key, contentType) =>
  getSignedUrl(client, new PutObjectCommand({ Bucket: env.aws.bucket, Key: key, ContentType: contentType }), {
    expiresIn: 300,
  });

export const presignDownload = (key) =>
  getSignedUrl(client, new GetObjectCommand({ Bucket: env.aws.bucket, Key: key }), { expiresIn: 3600 });
