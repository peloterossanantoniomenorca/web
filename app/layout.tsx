import './globals.css';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export const metadata = {
  title: 'Peloteros San Antonio FC',
  description: 'Gestión de peloteros, pagos y comprobantes del club.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header
          style={{
            background: '#071426',
            color: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 68,
              gap: 20,
              flexWrap: 'wrap',
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            <Link href="/" style={{ fontWeight: 900, fontSize: 18 }}>
              ⚽ Peloteros San Antonio FC
            </Link>

            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                fontSize: 14,
                flexWrap: 'wrap',
              }}
            >
              <Link href="/">Home</Link>
              <Link href="/peloteros">Peloteros</Link>
              <Link href="/pagos">Registrar Pago</Link>
              <Link href="/pagos-multiple">Registrar pago-Multiple</Link>
              <Link href="/reportes">Aprobar pagos</Link>
              <Link href="/admin" aria-label="Administración">
                <Shield size={17} />
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer
          style={{
            marginTop: 60,
            background: '#071426',
            color: '#cbd5e1',
          }}
        >
          <div
            className="container"
            style={{
              padding: '36px 0',
              display: 'grid',
              gap: 12,
            }}
          >
            <strong style={{ color: '#fff' }}>
              Peloteros San Antonio FC
            </strong>
            <span>
              Gestión simple y transparente para la comunidad del club.
            </span>
            <span>
              Contacto y redes sociales: configurar en producción.
            </span>
            <small>
              © {new Date().getFullYear()} Peloteros San Antonio FC
            </small>
          </div>
        </footer>
      </body>
    </html>
  );
}
