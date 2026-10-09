import Link from 'next/link';

export const metadata = {
  title: 'Política de privacidad | Peloteros San Antonio FC',
  description:
    'Política de privacidad y tratamiento de datos personales de Peloteros San Antonio FC.',
};

export default function PrivacidadPage() {
  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '48px 24px 72px',
        color: '#17352b',
        lineHeight: 1.8,
      }}
    >
      <Link
        href="/"
        style={{
          color: '#087f5b',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        ← Volver al inicio
      </Link>

      <h1
        style={{
          fontSize: 'clamp(30px, 5vw, 42px)',
          lineHeight: 1.2,
          marginTop: 28,
          marginBottom: 12,
        }}
      >
        Política de privacidad
      </h1>

      <p style={{ color: '#64748b' }}>
        Peloteros San Antonio FC · Última actualización: 9 de octubre de 2026
      </p>

      <p>
        En Peloteros San Antonio FC respetamos la privacidad de las personas
        que utilizan nuestro sitio web. Esta política explica qué información
        podemos recopilar, para qué la utilizamos y cómo protegemos los datos
        relacionados con la gestión del equipo y sus pagos.
      </p>

      <h2>1. Información que recopilamos</h2>
      <p>Según las funciones que utilices, podemos tratar la siguiente información:</p>
      <ul>
        <li>Nombre y apellidos de los peloteros.</li>
        <li>Información deportiva y estado de participación en el equipo.</li>
        <li>Fechas, importes y estados de los pagos registrados.</li>
        <li>Comprobantes de pago adjuntados por los usuarios.</li>
        <li>Información técnica necesaria para mantener la seguridad del sitio.</li>
      </ul>

      <h2>2. Finalidad del tratamiento</h2>
      <p>
        Utilizamos esta información para administrar el registro de peloteros,
        verificar pagos, conservar el historial de operaciones, atender
        consultas y mantener la seguridad y el funcionamiento del sitio web.
      </p>

      <h2>3. Almacenamiento de la información</h2>
      <p>
        La información de los registros y pagos puede almacenarse en una base
        de datos alojada en Supabase. Los comprobantes de pago pueden
        almacenarse en Google Drive. Estos servicios cuentan con sus propias
        condiciones y políticas de privacidad.
      </p>

      <h2>4. Acceso a los comprobantes de pago</h2>
      <p>
        Los comprobantes pueden contener nombres, importes, datos bancarios
        u otra información personal. Si un comprobante se configura para
        acceso público mediante un enlace, cualquier persona que obtenga
        ese enlace podría visualizarlo. Por ello, recomendamos no adjuntar
        documentos con información que no deba compartirse.
      </p>

      <h2>5. Conservación de la información</h2>
      <p>
        Los registros de pagos pueden conservarse para mantener el historial
        administrativo del equipo, incluso después de aprobar o rechazar un
        pago. Los plazos de conservación y cualquier solicitud de eliminación
        se evaluarán conforme a las obligaciones aplicables y las necesidades
        legítimas de administración.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y administrativas razonables para
        proteger la información. Sin embargo, ningún sistema de almacenamiento
        o transmisión de datos puede garantizar seguridad absoluta.
      </p>

      <h2>7. Servicios de terceros</h2>
      <p>
        El sitio puede utilizar servicios de terceros para alojar la
        aplicación, almacenar registros y gestionar comprobantes. El
        tratamiento realizado por esos proveedores se rige también por sus
        respectivas políticas y condiciones.
      </p>

      <h2>8. Derechos y solicitudes</h2>
      <p>
        Si deseas consultar, corregir o solicitar la eliminación de
        información personal, puedes comunicarte con la administración del
        equipo a través del correo de contacto indicado en el sitio web.
        Las solicitudes se atenderán conforme a la legislación aplicable.
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse cuando cambien las funciones del
        sitio, los servicios utilizados o las obligaciones aplicables. La
        versión vigente estará disponible en esta página.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para consultas sobre esta política o el tratamiento de datos,
        comunícate con la administración de Peloteros San Antonio FC mediante
        los canales de contacto oficiales del equipo.
      </p>

      <div
        style={{
          marginTop: 40,
          padding: 20,
          borderRadius: 12,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
        }}
      >
        <strong>Peloteros San Antonio FC</strong>
        <p style={{ marginBottom: 0 }}>
          Gracias por utilizar nuestra plataforma.
        </p>
      </div>
    </main>
  );
}
