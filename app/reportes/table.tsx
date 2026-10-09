'use client';

import { useMemo, useState } from 'react';
import type { PaymentStatus } from '@prisma/client';

type PaymentRow = {
  id: string;
  player: string;
  date: string;
  pichangaDate: string | null;
  paymentType: string;
  amount: number | null;
  status: PaymentStatus;
  voucher: string | null;
  file: string | null;
  created: string;
};

export default function ReportsTable({
  payments,
}: {
  payments: PaymentRow[];
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [pichangaDate, setPichangaDate] = useState('');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const matchesPlayer =
          !q || p.player.toLowerCase().includes(q.toLowerCase());

        const matchesStatus = !status || p.status === status;

        const matchesPichangaDate =
          !pichangaDate ||
          (p.pichangaDate !== null &&
            p.pichangaDate.slice(0, 10) === pichangaDate);

        return matchesPlayer && matchesStatus && matchesPichangaDate;
      }),
    [payments, q, status, pichangaDate]
  );

  function formatDate(value: string | null) {
    if (!value) return 'No registrada';

    return new Date(value).toLocaleDateString('es-PE', {
      timeZone: 'UTC',
    });
  }

  function formatMoney(value: number | null) {
    if (value === null || value === undefined) {
      return 'No registrado';
    }

    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  }

  async function change(
    id: string,
    newStatus: 'APPROVED' | 'REJECTED'
  ) {
    const action =
      newStatus === 'APPROVED' ? 'aprobar' : 'rechazar';

    if (!window.confirm(`¿Confirmas que deseas ${action} este pago?`)) {
      return;
    }

    setChangingId(id);
    setError('');

    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo actualizar el pago.'
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar el pago.'
      );
      setChangingId(null);
    }
  }

  function csv() {
    const rows = [
      [
        'Pelotero',
        'Tipo de pago',
        'Monto (PEN)',
        'Fecha del pago',
        'Fecha de pichanga',
        'Estado',
        'Voucher',
        'Registro',
      ],
      ...filtered.map((p) => [
        p.player,
        p.paymentType,
        p.amount === null ? '' : p.amount.toFixed(2),
        formatDate(p.date),
        formatDate(p.pichangaDate),
        p.status,
        p.file,
        new Date(p.created).toLocaleString('es-PE'),
      ]),
    ];

    const content =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(value).replaceAll('"', '""')}"`
            )
            .join(',')
        )
        .join('\n');

    const blob = new Blob([content], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'pagos-san-antonio.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  const thStyle = {
    textAlign: 'left' as const,
    padding: 12,
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: 12,
    borderBottom: '1px solid #eef2f7',
    verticalAlign: 'middle' as const,
  };

  return (
    <div
      className="card"
      style={{ padding: 18, overflowX: 'auto' }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Buscar pelotero"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="input"
          style={{ maxWidth: 200 }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="APPROVED">Aprobado</option>
          <option value="REJECTED">Rechazado</option>
        </select>

        <div style={{ minWidth: 190 }}>
          <label
            htmlFor="pichanga-date"
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 5,
              color: '#64748b',
            }}
          >
            Filtrar por fecha de pichanga
          </label>

          <input
            id="pichanga-date"
            className="input"
            type="date"
            value={pichangaDate}
            onChange={(e) => setPichangaDate(e.target.value)}
          />
        </div>

        <button className="btn btn-dark" onClick={csv}>
          Exportar CSV
        </button>

        {(q || status || pichangaDate) && (
          <button
            className="btn"
            style={{
              background: '#e8f5ef',
              color: '#065f46',
              border: '1px solid #b7e4cf',
            }}
            onClick={() => {
              setQ('');
              setStatus('');
              setPichangaDate('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 10,
            background: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      <p style={{ color: '#64748b', fontSize: 14 }}>
        Mostrando {filtered.length} de {payments.length} pagos.
      </p>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: 1150,
        }}
      >
        <thead>
          <tr>
            {[
              'Pelotero',
              'Tipo de pago',
              'Monto',
              'Fecha del pago',
              'Fecha de pichanga',
              'Estado',
              'Voucher',
              'Registro',
            ].map((heading) => (
              <th key={heading} style={thStyle}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>{p.player}</td>

              <td style={tdStyle}>{p.paymentType}</td>

              <td
                style={{
                  ...tdStyle,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                }}
              >
                {formatMoney(p.amount)}
              </td>

              <td style={tdStyle}>{formatDate(p.date)}</td>

              <td style={tdStyle}>
                {formatDate(p.pichangaDate)}
              </td>

              <td style={tdStyle}>
                <span
                  className={`badge badge-${p.status.toLowerCase()}`}
                >
                  {p.status === 'PENDING'
                    ? 'Pendiente'
                    : p.status === 'APPROVED'
                      ? 'Aprobado'
                      : 'Rechazado'}
                </span>
              </td>

              <td style={tdStyle}>
                {p.voucher ? (
                  <a
                    href={p.voucher}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#047857',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Ver voucher
                  </a>
                ) : (
                  <span
                    style={{
                      color: '#94a3b8',
                      fontWeight: 600,
                    }}
                  >
                    No disponible
                  </span>
                )}

                {p.status === 'PENDING' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      className="btn"
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '7px 10px',
                        fontSize: 12,
                      }}
                      disabled={changingId === p.id}
                      onClick={() => change(p.id, 'APPROVED')}
                    >
                      {changingId === p.id
                        ? 'Procesando…'
                        : 'Aprobar'}
                    </button>

                    <button
                      className="btn"
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        padding: '7px 10px',
                        fontSize: 12,
                      }}
                      disabled={changingId === p.id}
                      onClick={() => change(p.id, 'REJECTED')}
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </td>

              <td style={tdStyle}>
                {new Date(p.created).toLocaleString('es-PE')}
              </td>
            </tr>
          ))}

          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: 28,
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                No se encontraron pagos con los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
