 'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  LoaderCircle,
  Smartphone,
  Users,
  XCircle,
} from 'lucide-react';

type Player = {
  id: string;
  fullName: string;
};

type PaymentType = {
  id: string;
  description: string;
  amount: string | number;
};

type Receipt = {
  collectionId: string;
  responsible: string;
  paymentType: string;
  paymentMethod: string;
  amountPerPlayer: string;
  totalPlayers: number;
  totalAmount: string;
  message: string;
  payments: {
    id: string;
    player: string;
    amount: string;
    status: string;
  }[];
};

type PaymentMethod = 'YAPE' | 'EFECTIVO';

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0);
}

export default function PagosMultiplePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [responsiblePlayerId, setResponsiblePlayerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [pichangaDate, setPichangaDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [voucher, setVoucher] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Receipt | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [playersResponse, typesResponse] = await Promise.all([
          fetch('/api/players', { cache: 'no-store' }),
          fetch('/api/payment-types', { cache: 'no-store' }),
        ]);

        if (!playersResponse.ok || !typesResponse.ok) {
          throw new Error(
            'No se pudieron cargar los peloteros o los conceptos de pago.'
          );
        }

        const playersData = await playersResponse.json();
        const typesData = await typesResponse.json();

        if (!Array.isArray(playersData) || !Array.isArray(typesData)) {
          throw new Error('La respuesta de la API no tiene el formato esperado.');
        }

        const cuota = typesData.find(
          (item: PaymentType) =>
            item.description?.trim().toLowerCase() === 'pago cuota por partido'
        );

        if (!cuota) {
          throw new Error(
            'No se encontró el concepto "Pago cuota por partido" en Supabase.'
          );
        }

        if (!cancelled) {
          setPlayers(
            playersData
              .filter((player: Player) => player.id && player.fullName)
              .sort((a: Player, b: Player) =>
                a.fullName.localeCompare(b.fullName, 'es')
              )
          );
          setPaymentType(cuota);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudieron cargar los datos.'
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!voucher || !voucher.type.startsWith('image/')) {
      setVoucherPreview('');
      return;
    }

    const url = URL.createObjectURL(voucher);
    setVoucherPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [voucher]);

  useEffect(() => {
    if (!success) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSuccess(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [success]);

  const amountPerPlayer = Number(paymentType?.amount ?? 0);
  const totalAmount = amountPerPlayer * selectedIds.length;

  const filteredPlayers = players.filter((player) =>
    player.fullName.toLowerCase().includes(playerSearch.trim().toLowerCase())
  );

  function togglePlayer(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    setError('');
  }

  function handleVoucher(file: File | null) {
    setError('');

    if (!file) {
      setVoucher(null);
      return;
    }

    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setError('El comprobante debe ser JPG, PNG o PDF.');
      setVoucher(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El comprobante no puede superar los 5 MB.');
      setVoucher(null);
      return;
    }

    setVoucher(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess(null);

    if (!selectedIds.length) {
      setError('Selecciona al menos un pelotero.');
      return;
    }

    if (!responsiblePlayerId) {
      setError('Selecciona al responsable de la recaudación.');
      return;
    }

    if (!paymentType || amountPerPlayer <= 0) {
      setError('El importe de la cuota no está configurado correctamente.');
      return;
    }

    if (!paymentDate || !pichangaDate) {
      setError('Selecciona la fecha de pago y la fecha de pichanga.');
      return;
    }

    if (paymentMethod === 'YAPE' && !voucher) {
      setError('Adjunta el comprobante de YAPE.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('mode', 'multiple');
      formData.append('playerIds', JSON.stringify(selectedIds));
      formData.append('responsiblePlayerId', responsiblePlayerId);
      formData.append('paymentDate', paymentDate);
      formData.append('pichangaDate', pichangaDate);
      formData.append('paymentMethod', paymentMethod);

      if (paymentMethod === 'YAPE' && voucher) {
        formData.append('voucher', voucher);
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron registrar los pagos.');
      }

      setSuccess(data as Receipt);
      setSelectedIds([]);
      setResponsiblePlayerId('');
      setPaymentDate(today());
      setPichangaDate('');
      setPaymentMethod('YAPE');
      setVoucher(null);
      setPlayerSearch('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al registrar los pagos.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: 12,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    color: '#0f172a',
  };

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#15803d',
              marginBottom: 8,
            }}
          >
            <Users size={27} />
            <span style={{ fontWeight: 800 }}>REGISTRO GRUPAL</span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 8px' }}>
            Registrar pago-Multiple
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Registra la cuota por partido de varios peloteros en una sola
            operación. Cada jugador tendrá su propio pago pendiente.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: 14,
              marginBottom: 18,
              borderRadius: 12,
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
            }}
          >
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="presentation"
            onClick={() => setSuccess(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
              overflowY: 'auto',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-success-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 560,
                maxHeight: '90vh',
                overflowY: 'auto',
                background: '#fff',
                color: '#0f172a',
                borderRadius: 22,
                padding: 24,
                boxSizing: 'border-box',
                boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
              }}
            >
              <button
                type="button"
                aria-label="Cerrar ventana"
                onClick={() => setSuccess(null)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 23,
                  color: '#64748b',
                }}
              >
                ×
              </button>

              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <CheckCircle2 size={38} />
                </div>

                <h2
                  id="payment-success-title"
                  style={{ fontSize: 26, fontWeight: 900, margin: '0 0 8px' }}
                >
                  ¡Pagos registrados!
                </h2>
                <p style={{ color: '#64748b', margin: 0 }}>{success.message}</p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                  margin: '22px 0',
                }}
              >
                <div style={{ background: '#f1f5f9', padding: 15, borderRadius: 14 }}>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    Peloteros registrados
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>
                    {success.totalPlayers}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: 15, borderRadius: 14 }}>
                  <div style={{ color: '#64748b', fontSize: 13 }}>
                    Total registrado
                  </div>
                  <div
                    style={{
                      fontSize: 23,
                      fontWeight: 900,
                      color: '#15803d',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {formatMoney(success.totalAmount)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 850, margin: '0 0 12px' }}>
                  Detalle de peloteros
                </h3>

                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}
                >
                  {success.payments?.map((payment, index) => (
                    <div
                      key={payment.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 13,
                        borderBottom:
                          index === success.payments.length - 1
                            ? 'none'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      <CheckCircle2
                        size={21}
                        color="#16a34a"
                        style={{ flexShrink: 0 }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 750, overflowWrap: 'anywhere' }}>
                          {payment.player}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color:
                              payment.status === 'APPROVED'
                                ? '#15803d'
                                : payment.status === 'REJECTED'
                                  ? '#b91c1c'
                                  : '#b45309',
                            marginTop: 4,
                          }}
                        >
                          {payment.status === 'PENDING'
                            ? 'Pendiente de aprobación'
                            : payment.status === 'APPROVED'
                              ? 'Aprobado'
                              : payment.status === 'REJECTED'
                                ? 'Rechazado'
                                : payment.status}
                        </div>
                      </div>

                      <div style={{ fontWeight: 850, whiteSpace: 'nowrap' }}>
                        {formatMoney(payment.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: 15,
                  fontSize: 14,
                  display: 'grid',
                  gap: 9,
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Responsable: </span>
                  <strong>{success.responsible}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Método de pago: </span>
                  <strong>{success.paymentMethod}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Concepto: </span>
                  <strong>{success.paymentType}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Código del grupo: </span>
                  <span style={{ fontSize: 12, overflowWrap: 'anywhere' }}>
                    {success.collectionId}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(null);
                    setError('');
                  }}
                  style={{
                    width: '100%',
                    padding: 14,
                    border: 'none',
                    borderRadius: 12,
                    background: '#15803d',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Registrar otro grupo
                </button>

                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  style={{
                    width: '100%',
                    padding: 13,
                    border: '1px solid #cbd5e1',
                    borderRadius: 12,
                    background: '#fff',
                    color: '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            </section>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gap: 22,
            padding: 24,
            border: '1px solid #e2e8f0',
            borderRadius: 18,
            background: '#fff',
            boxShadow: '0 8px 30px rgba(15,23,42,0.05)',
          }}
        >
          <section>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginTop: 0 }}>
              1. Concepto e importe
            </h2>

            {loadingData ? (
              <p>Cargando información...</p>
            ) : (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {paymentType?.description || 'Pago cuota por partido'}
                </div>
                <div
                  style={{
                    fontSize: 27,
                    fontWeight: 900,
                    color: '#15803d',
                    marginTop: 6,
                  }}
                >
                  {formatMoney(amountPerPlayer)}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#64748b',
                    }}
                  >
                    {' '}por pelotero
                  </span>
                </div>
                <p style={{ marginBottom: 0, color: '#475569' }}>
                  Total de la selección: <strong>{formatMoney(totalAmount)}</strong>
                </p>
                <small style={{ color: '#64748b' }}>
                  El importe proviene de la configuración del concepto en
                  Supabase y no se puede modificar desde este formulario.
                </small>
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>
              2. Selecciona los peloteros
            </h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>
              Marca solamente a quienes realizaron el pago. El responsable no
              se agrega automáticamente.
            </p>

            <input
              type="search"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="Buscar pelotero por nombre..."
              disabled={loadingData || submitting}
              style={{ ...inputStyle, marginBottom: 12 }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              <span>
                Seleccionados: <strong>{selectedIds.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0 || submitting}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#15803d',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Quitar selección
              </button>
            </div>

            <div
              style={{
                maxHeight: 310,
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
              }}
            >
              {filteredPlayers.map((player) => {
                const checked = selectedIds.includes(player.id);

                return (
                  <label
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 13,
                      borderBottom: '1px solid #f1f5f9',
                      background: checked ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={loadingData || submitting}
                      onChange={() => togglePlayer(player.id)}
                      style={{ width: 18, height: 18, accentColor: '#15803d' }}
                    />
                    <span style={{ fontWeight: checked ? 700 : 500 }}>
                      {player.fullName}
                    </span>
                  </label>
                );
              })}

              {!loadingData && filteredPlayers.length === 0 && (
                <p style={{ padding: 16, color: '#64748b' }}>
                  No se encontraron peloteros.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>
              3. Responsable de recaudación
            </h2>
            <label
              htmlFor="responsiblePlayerId"
              style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}
            >
              Persona que recibió o reunió el dinero
            </label>
            <select
              id="responsiblePlayerId"
              value={responsiblePlayerId}
              onChange={(event) => setResponsiblePlayerId(event.target.value)}
              required
              disabled={loadingData || submitting}
              style={{ ...inputStyle, background: '#fff' }}
            >
              <option value="">Selecciona al responsable</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.fullName}
                </option>
              ))}
            </select>
            <small style={{ display: 'block', color: '#64748b', marginTop: 8 }}>
              Elegir a esta persona no registra un pago a su nombre, salvo que
              también la marques en la lista de peloteros.
            </small>
          </section>

          <section>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>4. Fechas</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="paymentDate"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  <CalendarDays size={18} />
                  Fecha de pago
                </label>
                <input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  max={today()}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  required
                  disabled={submitting}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor="pichangaDate"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  <CalendarDays size={18} />
                  Fecha de pichanga
                </label>
                <input
                  id="pichangaDate"
                  type="date"
                  value={pichangaDate}
                  onChange={(event) => setPichangaDate(event.target.value)}
                  required
                  disabled={submitting}
                  style={inputStyle}
                />
                <small style={{ color: '#64748b' }}>
                  Puede ser una fecha anterior a la fecha de pago.
                </small>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>
              5. Método de pago
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: 16,
                  border: `2px solid ${paymentMethod === 'YAPE' ? '#7c3aed' : '#e2e8f0'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="YAPE"
                  checked={paymentMethod === 'YAPE'}
                  onChange={() => {
                    setPaymentMethod('YAPE');
                    setError('');
                  }}
                  disabled={submitting}
                />
                <Smartphone size={21} />
                <span>
                  <strong>YAPE</strong>
                  <small style={{ display: 'block', color: '#64748b' }}>
                    Requiere voucher
                  </small>
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: 16,
                  border: `2px solid ${paymentMethod === 'EFECTIVO' ? '#15803d' : '#e2e8f0'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="EFECTIVO"
                  checked={paymentMethod === 'EFECTIVO'}
                  onChange={() => {
                    setPaymentMethod('EFECTIVO');
                    setVoucher(null);
                    setError('');
                  }}
                  disabled={submitting}
                />
                <Banknote size={21} />
                <span>
                  <strong>EFECTIVO</strong>
                  <small style={{ display: 'block', color: '#64748b' }}>
                    Sin voucher obligatorio
                  </small>
                </span>
              </label>
            </div>
          </section>

          {paymentMethod === 'YAPE' && (
            <section>
              <h2 style={{ fontSize: 19, fontWeight: 800 }}>
                6. Comprobante de YAPE
              </h2>
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1px dashed #94a3b8',
                }}
              >
                <label
                  htmlFor="voucher"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  <CloudUpload size={24} />
                  Seleccionar comprobante
                </label>
                <input
                  id="voucher"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  onChange={(event) =>
                    handleVoucher(event.target.files?.[0] ?? null)
                  }
                  required={paymentMethod === 'YAPE'}
                  disabled={submitting}
                  style={{ display: 'block', marginTop: 14, maxWidth: '100%' }}
                />
                <small style={{ display: 'block', color: '#64748b', marginTop: 10 }}>
                  Formatos JPG, PNG o PDF. Máximo 5 MB. El comprobante se
                  compartirá entre los pagos de este grupo.
                </small>
                {voucher && (
                  <p style={{ overflowWrap: 'anywhere' }}>
                    Archivo seleccionado: <strong>{voucher.name}</strong>
                  </p>
                )}
                {voucherPreview && (
                  <img
                    src={voucherPreview}
                    alt="Vista previa del comprobante"
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: 260,
                      objectFit: 'contain',
                      marginTop: 12,
                      borderRadius: 8,
                    }}
                  />
                )}
              </div>
            </section>
          )}

          <div
            style={{
              padding: 18,
              background: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span>Peloteros seleccionados</span>
              <strong>{selectedIds.length}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 8,
              }}
            >
              <span>Importe por pelotero</span>
              <strong>{formatMoney(amountPerPlayer)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 19,
                borderTop: '1px solid #cbd5e1',
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <strong>Total a registrar</strong>
              <strong style={{ color: '#15803d' }}>
                {formatMoney(totalAmount)}
              </strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              loadingData ||
              submitting ||
              !paymentType ||
              selectedIds.length === 0
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: 15,
              border: 0,
              borderRadius: 12,
              background:
                loadingData || submitting || !paymentType || !selectedIds.length
                  ? '#94a3b8'
                  : '#15803d',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              cursor:
                loadingData || submitting || !paymentType || !selectedIds.length
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {submitting ? (
              <>
                <LoaderCircle size={20} />
                Registrando pagos...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Registrar {selectedIds.length} pago(s)
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
