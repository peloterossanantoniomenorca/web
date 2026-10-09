import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const missing: string[] = [];

  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri) missing.push('GOOGLE_REDIRECT_URI');
  if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Google Drive: ${missing.join(', ')}`
    );
  }

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({
    version: 'v3',
    auth,
  });
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 180);
}

export async function uploadVoucher(
  file: File,
  desiredName: string
) {
  if (!file || file.size === 0) {
    throw new Error('El archivo del voucher está vacío.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El voucher no puede superar los 5 MB.');
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato no permitido para el voucher.');
  }

  const drive = getDriveClient();

  const extensionByMimeType: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
  };

  const extension = extensionByMimeType[file.type];

  const baseName = sanitizeFileName(desiredName);

  if (!baseName) {
    throw new Error('No se pudo generar el nombre del voucher.');
  }

  // El nombre incluye el tipo de pago, el pelotero y la fecha.
  const safeName = `${baseName}${extension}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: file.type,
    },
    media: {
      mimeType: file.type,
      body: Readable.from(buffer),
    },
    fields: 'id, name, webViewLink',
  });

  const fileId = uploaded.data.id;

  if (!fileId) {
    throw new Error(
      'Google Drive no devolvió el identificador del voucher.'
    );
  }

  // Hace público únicamente este archivo mediante su enlace.
  await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });

  const url =
    uploaded.data.webViewLink ||
    `https://drive.google.com/file/d/${fileId}/view`;

  return {
    url,
    key: fileId,
    fileName: safeName,
  };
}
