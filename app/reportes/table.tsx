'use client';

import { useMemo, useState } from 'react';
import type { PaymentStatus } from '@prisma/client';

type PaymentRow = {
  id: string;
  player: string;
  date: string;
  pichangaDate: string | null;
  paymentType: string;
  paymentMethod: string;
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
  // Por defecto, mostrar solamente los pagos pendientes.
  const [status, setStatus] = useState('PENDING');
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

  function formatPaymentMethod(value: string | null | undefined) {
    if (!value) return 'No registrado';

    const method = value.trim().toUpperCase();

    if (method === 'YAPE') return 'Yape';
    if (method === 'CASH' || method === 'EFECTIVO') return 'Efectivo';

    return value;
  }

  function formatStatus(value: PaymentStatus) {
    if (value === 'PENDING') return 'Pendiente';
    if (value === 'APPROVED') return 'Aprobado';
    return 'Rechazado';
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
        'Método de pago',
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
        formatPaymentMethod(p.paymentMethod),
        p.amount === null ? '' : p.amount.toFixed(2),
        formatDate(p.date),
        formatDate(p.pichangaDate),
        formatStatus(p.status),
        p.file || p.voucher || '',
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
    padding: '14px 12px',
    borderBottom: '1px solid #dbe5e1',
    whiteSpace: 'nowrap' as const,
    background: '#f0f7f4',
    color: '#12372d',
    fontSize: 13,
    fontWeight: 800,
  };

  const tdStyle = {
    padding: '14px 12px',
    borderBottom: '1px solid #e8efec',
    verticalAlign: 'middle' as const,
    fontSize: 13,
    lineHeight: 1.5,
  };

  return (
    <section
      className="card"
      style={{
        padding: 18,
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <div style={{ flex: '1 1 190px', minWidth: 170 }}>
          <label
            htmlFor="player-search"
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 5,
              color: '#64748b',
            }}
          >
            Buscar pelotero
          </label>
          <input
            id="player-search"
            className="input"
            style={{ width: '100%', boxSizing: 'border-box' }}
            placeholder="Nombre del pelotero"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div style={{ flex: '0 1 190px', minWidth: 170 }}>
          <label
            htmlFor="payment-status"
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 5,
              color: '#64748b',
            }}
          >
            Filtrar por estado
          </label>
          <select
            id="payment-status"
            className="input"
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
            <option value="">Todos los estados</option>
          </select>
        </div>

        <div style={{ flex: '0 1 190px', minWidth: 170 }}>
          <label
            htmlFor="pichanga-date"
            style={{
              display: 'block',
              fontSize: 12,
              marginBottom: 5,
              color: '#64748b',
            }}
          >
            Fecha de pichanga
          </label>
          <input
            id="pichanga-date"
            className="input"
            style={{ width: '100%', boxSizing: 'border-box' }}
            type="date"
            value={pichangaDate}
            onChange={(e) => setPichangaDate(e.target.value)}
          />
        </div>

        <button
          className="btn btn-dark"
          onClick={csv}
          style={{ minHeight: 42 }}
        >
          Exportar CSV
        </button>

        {(q || status !== 'PENDING' || pichangaDate) && (
          <button
            className="btn"
            style={{
              minHeight: 42,
              background: '#e8f5ef',
              color: '#065f46',
              border: '1px solid #b7e4cf',
            }}
            onClick={() => {
              setQ('');
              setStatus('PENDING');
              setPichangaDate('');
            }}
          >
            Restablecer filtros
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

      <p
        style={{
          color: '#64748b',
          fontSize: 13,
          margin: '8px 0 14px',
        }}
      >
        Mostrando <strong>{filtered.length}</strong> de{' '}
        <strong>{payments.length}</strong> pagos.
        {' '}
        {status === 'PENDING'
          ? 'Vista de pagos pendientes.'
          : status === 'APPROVED'
            ? 'Vista de pagos aprobados.'
            : status === 'REJECTED'
              ? 'Vista de pagos rechazados.'
              : 'Vista de todos los estados.'}
      </p>

      {/* El desplazamiento horizontal queda dentro de la tabla. */}
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'visible',
          border: '1px solid #e5ece8',
          borderRadius: 12,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1120,
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              {[
                'Pelotero',
                'Tipo de pago',
                'Método de pago',
                'Monto',
                'Fecha del pago',
                'Fecha de pichanga',
                'Estado',
                'Voucher y acciones',
                'Registro',
              ].map((heading) => (
                <th key={heading} style={thStyle}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const method = formatPaymentMethod(p.paymentMethod);

              return (
                <tr key={p.id}>
                  <td
                    style={{
                      ...tdStyle,
                      minWidth: 130,
                      fontWeight: 700,
                      color: '#12372d',
                    }}
                  >
                    {p.player}
                  </td>

                  <td style={{ ...tdStyle, minWidth: 145 }}>
                    {p.paymentType}
                  </td>

                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '5px 9px',
                        borderRadius: 8,
                        background:
                          method === 'Yape'
                            ? '#f3e8ff'
                            : method === 'Efectivo'
                              ? '#dcfce7'
                              : '#f1f5f9',
                        color:
                          method === 'Yape'
                            ? '#7e22ce'
                            : method === 'Efectivo'
                              ? '#166534'
                              : '#475569',
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {method}
                    </span>
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      whiteSpace: 'nowrap',
                      fontWeight: 800,
                    }}
                  >
                    {formatMoney(p.amount)}
                  </td>

                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {formatDate(p.date)}
                  </td>

                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {formatDate(p.pichangaDate)}
                  </td>

                  <td style={tdStyle}>
                    <span
                      className={`badge badge-${p.status.toLowerCase()}`}
                    >
                      {formatStatus(p.status)}
                    </span>
                  </td>

                  <td style={{ ...tdStyle, minWidth: 145 }}>
                    {p.voucher ? (
                      <a
                        href={p.voucher}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#047857',
                          fontWeight: 800,
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
                          whiteSpace: 'nowrap',
                        }}
                      >
                        No disponible
                      </span>
                    )}

                    {p.status === 'PENDING' && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: 7,
                          marginTop: 9,
                        }}
                      >
                        <button
                          className="btn"
                          style={{
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '7px 11px',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
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
                            padding: '7px 11px',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                          disabled={changingId === p.id}
                          onClick={() => change(p.id, 'REJECTED')}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      minWidth: 150,
                      whiteSpace: 'nowrap',
                      color: '#475569',
                    }}
                  >
                    {new Date(p.created).toLocaleString('es-PE')}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: '#64748b',
                    background: '#fff',
                  }}
                >
                  No se encontraron pagos con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
