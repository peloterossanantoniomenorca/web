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
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('YAPE');

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
          throw new Error(
            'La respuesta de la API no tiene el formato esperado.'
          );
        }

        const cuota = typesData.find(
          (item: PaymentType) =>
            item.description?.trim().toLowerCase() ===
            'pago cuota por partido'
        );

        if (!cuota) {
          throw new Error(
            'No se encontró el concepto "Pago cuota por partido" en Supabase.'
          );
        }

        if (!cancelled) {
          setPlayers(
            playersData
              .filter(
                (player: Player) =>
                  player.id && player.fullName
              )
              .sort((a: Player, b: Player) =>
                a.fullName.localeCompare(b.fullName, 'es')
              )
          );
          setPaymentType(cuota);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los datos.'
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

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (!allowedTypes.includes(file.type)) {
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
          <section
            style={{
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#166534',
              padding: 22,
              borderRadius: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <CheckCircle2 size={28} />
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
                ¡Pagos registrados!
              </h2>
            </div>

            <p>{success.message}</p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                margin: '18px 0',
              }}
            >
              <div>
                <small>Peloteros registrados</small>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {success.totalPlayers}
                </div>
              </div>
              <div>
                <small>Importe por pelotero</small>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {formatMoney(success.amountPerPlayer)}
                </div>
              </div>
              <div>
                <small>Total del grupo</small>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {formatMoney(success.totalAmount)}
                </div>
              </div>
            </div>

            <p>
              <strong>Responsable:</strong> {success.responsible}
            </p>
            <p>
              <strong>Método:</strong> {success.paymentMethod}
            </p>
            <p style={{ overflowWrap: 'anywhere' }}>
              <strong>Código del grupo:</strong> {success.collectionId}
            </p>

            <h3 style={{ fontWeight: 800, marginTop: 20 }}>
              Detalle de pagos
            </h3>

            <ul style={{ paddingLeft: 20 }}>
              {success.payments?.map((payment) => (
                <li key={payment.id} style={{ marginBottom: 6 }}>
                  {payment.player} — {formatMoney(payment.amount)} —{' '}
                  {payment.status}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setSuccess(null)}
              style={{
                marginTop: 12,
                border: '1px solid #15803d',
                background: '#15803d',
                color: '#fff',
                borderRadius: 10,
                padding: '11px 16px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Registrar otro grupo
            </button>
          </section>
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
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                marginBottom: 12,
                color: '#0f172a',
              }}
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
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: '#15803d',
                      }}
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
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                background: '#fff',
                color: '#0f172a',
              }}
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
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>
              4. Fechas
            </h2>

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
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    color: '#0f172a',
                  }}
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
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    color: '#0f172a',
                  }}
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
                  border: `2px solid ${
                    paymentMethod === 'YAPE' ? '#7c3aed' : '#e2e8f0'
                  }`,
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
                  border: `2px solid ${
                    paymentMethod === 'EFECTIVO' ? '#15803d' : '#e2e8f0'
                  }`,
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
