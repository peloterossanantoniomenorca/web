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
  const [status, setStatus] = useState('PENDING');
  const [pichangaDate, setPichangaDate] = useState('');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
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

  const selectable = filtered.filter((p) => p.status === 'PENDING');
  const selectedVisible = selectable.filter((p) =>
    selectedIds.includes(p.id)
  );
  const allVisibleSelected =
    selectable.length > 0 &&
    selectable.every((p) => selectedIds.includes(p.id));

  function clearSelection() {
    setSelectedIds([]);
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    if (allVisibleSelected) {
      const visibleIds = new Set(selectable.map((p) => p.id));
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.has(id))
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...selectable.map((p) => p.id)]),
      ]);
    }
  }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el pago.');
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

  async function changeSelected(
    newStatus: 'APPROVED' | 'REJECTED'
  ) {
    const ids = selectedVisible.map((p) => p.id);

    if (ids.length === 0) {
      setError('Selecciona al menos un pago pendiente.');
      return;
    }

    const action =
      newStatus === 'APPROVED' ? 'aprobar' : 'rechazar';

    const confirmed = window.confirm(
      `¿Confirmas que deseas ${action} ${ids.length} pagos seleccionados?`
    );

    if (!confirmed) return;

    setBulkBusy(true);
    setError('');

    try {
      const response = await fetch('/api/payments/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          status: newStatus,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudieron procesar los pagos seleccionados.'
        );
      }

      const skippedMessage =
        data.skipped > 0
          ? ` ${data.skipped} pagos fueron omitidos porque ya no estaban pendientes.`
          : '';

      window.alert(`${data.message}${skippedMessage}`);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error en el procesamiento masivo.'
      );
      setBulkBusy(false);
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
            onChange={(e) => {
              setQ(e.target.value);
              clearSelection();
            }}
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
            onChange={(e) => {
              setStatus(e.target.value);
              clearSelection();
            }}
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
            onChange={(e) => {
              setPichangaDate(e.target.value);
              clearSelection();
            }}
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
              clearSelection();
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
        <strong>{payments.length}</strong> pagos.{' '}
        {status === 'PENDING'
          ? 'Vista de pagos pendientes.'
          : status === 'APPROVED'
            ? 'Vista de pagos aprobados.'
            : status === 'REJECTED'
              ? 'Vista de pagos rechazados.'
              : 'Vista de todos los estados.'}
      </p>

      {selectable.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: 14,
            marginBottom: 16,
            border: '1px solid #bbd9ca',
            borderRadius: 10,
            background: '#f0fdf4',
          }}
        >
          <strong style={{ color: '#14532d', marginRight: 'auto' }}>
            {selectedVisible.length} pago(s) seleccionado(s)
          </strong>

          <button
            type="button"
            className="btn"
            disabled={bulkBusy || selectedVisible.length === 0}
            onClick={() => changeSelected('APPROVED')}
            style={{
              background: '#166534',
              color: '#fff',
              padding: '10px 14px',
              opacity: bulkBusy || selectedVisible.length === 0 ? 0.5 : 1,
            }}
          >
            {bulkBusy ? 'Procesando…' : 'Aprobar seleccionados'}
          </button>

          <button
            type="button"
            className="btn"
            disabled={bulkBusy || selectedVisible.length === 0}
            onClick={() => changeSelected('REJECTED')}
            style={{
              background: '#b91c1c',
              color: '#fff',
              padding: '10px 14px',
              opacity: bulkBusy || selectedVisible.length === 0 ? 0.5 : 1,
            }}
          >
            {bulkBusy ? 'Procesando…' : 'Rechazar seleccionados'}
          </button>
        </div>
      )}

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
            minWidth: 1160,
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los pagos pendientes visibles"
                  checked={allVisibleSelected}
                  disabled={selectable.length === 0 || bulkBusy}
                  onChange={toggleAll}
                />
              </th>
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
              const isPending = p.status === 'PENDING';

              return (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {isPending ? (
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar pago de ${p.player}`}
                        checked={selectedIds.includes(p.id)}
                        disabled={bulkBusy}
                        onChange={() => toggleOne(p.id)}
                      />
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
                  </td>

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
                    <span className={`badge badge-${p.status.toLowerCase()}`}>
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

                    {isPending && (
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
                          disabled={changingId === p.id || bulkBusy}
                          onClick={() => change(p.id, 'APPROVED')}
                        >
                          {changingId === p.id ? 'Procesando…' : 'Aprobar'}
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
                          disabled={changingId === p.id || bulkBusy}
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
                  colSpan={10}
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
