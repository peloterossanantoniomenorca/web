import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;

  cookieStore.delete('google_oauth_state');

  if (error) {
    return NextResponse.json(
      { error: 'No se completó la autorización de Google.' },
      { status: 400 }
    );
  }

  if (
    !code ||
    !returnedState ||
    !savedState ||
    returnedState !== savedState
  ) {
    return NextResponse.json(
      { error: 'La autorización no es válida o ha caducado. Inténtalo de nuevo.' },
      { status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Faltan variables de configuración de Google en Vercel.' },
      { status: 500 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          error:
            'Google no entregó un refresh token. Vuelve a autorizar con consentimiento.',
        },
        { status: 400 }
      );
    }

    // No guardamos el token en la base de datos ni lo mostramos en la URL.
    // Por ahora lo devolvemos en la respuesta para configurar Vercel.
    return new Response(
      `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Autorización de Google Drive</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:760px;margin:40px auto;padding:20px">
<h1>Autorización completada</h1>
<p>Google autorizó la conexión. Copia el refresh token y guárdalo inmediatamente como variable de entorno en Vercel.</p>
<p><strong>Este token es secreto. No lo compartas ni lo publiques.</strong></p>
<textarea readonly style="width:100%;height:130px;overflow-wrap:anywhere">${tokens.refresh_token.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</textarea>
<p>Después de guardarlo en Vercel, cierra esta página. No vuelvas a compartir el token.</p>
</body>
</html>`,
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      }
    );
  } catch (err) {
    console.error('Error en autorización de Google Drive:', err);

    return NextResponse.json(
      { error: 'No se pudo completar la autorización de Google Drive.' },
      { status: 500 }
    );
  }
}
