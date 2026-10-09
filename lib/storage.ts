
import { google } from 'googleapis';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';

function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error(
      'Faltan variables de entorno para conectar Google Drive.'
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

export async function uploadVoucher(file: File) {
  const drive = getDriveClient();

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = `voucher-${crypto.randomUUID()}.${extension}`;
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
    throw new Error('Google Drive no devolvió el ID del voucher.');
  }

  // Permite que cualquier persona con el enlace pueda ver este archivo.
  // No hace pública toda la carpeta de Google Drive.
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
  };
}
