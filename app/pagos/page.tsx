'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  CreditCard,
  LoaderCircle,
  Smartphone,
  XCircle,
  Info,
} from 'lucide-react';

type Player = {
  id: string;
  fullName: string;
};

type PaymentType = {
  id: string;
  description: string;
  amount: string;
};

type PaymentMethod = 'YAPE' | 'EFECTIVO';

type Receipt = {
  player: string;
  paymentType: string;
  amount: string;
  paymentDate: string;
  pichangaDate: string;
  status: string;
  paymentMethod: PaymentMethod;
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return '—';

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value));
}

export default function PagosPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  const [playerId, setPlayerId] = useState('');
  const [paymentTypeId, setPaymentTypeId] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('YAPE');

  const [paymentDate, setPaymentDate] = useState(today());
  const [pichangaDate, setPichangaDate] = useState('');
  const [voucher, setVoucher] = useState<File | null>(null);
  const [preview, setPreview] = useState('');

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const selectedType = paymentTypes.find(
    (type) => type.id === paymentTypeId
  );

  const selectedPlayer = players.find(
    (player) => player.id === playerId
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [playersResponse, typesResponse] = await Promise.all([
          fetch('/api/players', { cache: 'no-store' }),
          fetch('/api/payment-types', { cache: 'no-store' }),
        ]);

        if (!playersResponse.ok || !typesResponse.ok) {
          throw new Error(
            'No se pudieron cargar los datos del formulario.'
          );
        }

        const playersData = await playersResponse.json();
        const typesData = await typesResponse.json();

        if (!Array.isArray(playersData) || !Array.isArray(typesData)) {
          throw new Error(
            'El servidor devolvió datos con un formato inválido.'
          );
        }

        if (active) {
          setPlayers(playersData);
          setPaymentTypes(typesData);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los datos.'
          );
        }
      } finally {
        if (active) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!voucher || !voucher.type.startsWith('image/')) {
      setPreview('');
      return;
    }

    const url = URL.createObjectURL(voucher);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [voucher]);

  function clearVoucherInput() {
    const input = document.getElementById(
      'voucher'
    ) as HTMLInputElement | null;

    if (input) input.value = '';
  }

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);
    setError('');
    setSuccess('');
    setReceipt(null);

    if (method === 'EFECTIVO') {
      setVoucher(null);
      setPreview('');
      clearVoucherInput();
    }
  }

  function handleVoucher(file: File | null) {
    setError('');
    setSuccess('');

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
      setVoucher(null);
      clearVoucherInput();
      setError('El voucher debe ser JPG, PNG o PDF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setVoucher(null);
      clearVoucherInput();
      setError('El archivo no puede superar los 5 MB.');
      return;
    }

    setVoucher(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setSuccess('');
    setReceipt(null);

    if (!playerId) {
      setError('Selecciona el pelotero.');
      return;
    }

    if (!paymentTypeId || !selectedType) {
      setError('Selecciona el tipo de pago.');
      return;
    }

    if (!paymentDate || !pichangaDate) {
      setError(
        'Selecciona la fecha del pago y la fecha de pichanga.'
      );
      return;
    }

    if (pichangaDate < paymentDate) {
      setError(
        'La fecha de pichanga no puede ser anterior a la fecha del pago.'
      );
      return;
    }

    if (paymentMethod === 'YAPE' && !voucher) {
      setError('Adjunta el voucher del pago por Yape.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append('playerId', playerId);
      formData.append('paymentTypeId', paymentTypeId);
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
        throw new Error(
          data.error || 'No se pudo registrar el pago.'
        );
      }

      setSuccess('¡Pago registrado correctamente!');

      setReceipt({
        player: selectedPlayer?.fullName || '',
        paymentType: selectedType.description,
        amount: data.amount ?? selectedType.amount,
        paymentDate,
        pichangaDate,
        status: 'Pendiente de aprobación',
        paymentMethod,
      });

      setPlayerId('');
      setPaymentTypeId('');
      setPaymentMethod('YAPE');
      setPaymentDate(today());
      setPichangaDate('');
      setVoucher(null);
      setPreview('');
      clearVoucherInput();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos registrar el pago. Intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="container"
      style={{ padding: '48px 0 70px' }}
    >
      <div style={{ maxWidth: 804, margin: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <span
            className="badge"
            style={{
              color: '#087f5b',
              background: '#d1fae5',
            }}
          >
            <CreditCard
              size={14}
              style={{ marginRight: 5 }}
            />
            REGISTRO DE PAGOS
          </span>

          <h1
            style={{
              margin: '14px 0 8px',
              color: '#12352b',
            }}
          >
            Registrar pago
          </h1>

          <p
            style={{
              color: '#64748b',
              lineHeight: 1.7,
            }}
          >
            Selecciona tu nombre, el concepto que vas a cancelar y la forma
            de pago para registrar tu pago.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: '28px',
            display: 'grid',
            gap: 22,
          }}
        >
          {loadingData ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 20,
                color: '#087f5b',
              }}
            >
              <LoaderCircle size={20} />
              Cargando peloteros y tipos de pago...
            </div>
          ) : (
            <>
              {/* AVISO IMPORTANTE SOBRE LAS FORMAS DE PAGO */}
              <div
                role="note"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: '2px solid #34d399',
                  background:
                    'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  boxShadow:
                    '0 5px 18px rgba(5, 150, 105, 0.12)',
                  color: '#064e3b',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 42,
                      height: 42,
                      minWidth: 42,
                      borderRadius: 12,
                      background: '#047857',
                      color: '#ffffff',
                    }}
                  >
                    <Info size={25} />
                  </span>

                  <strong
                    style={{
                      fontSize: 18,
                      lineHeight: 1.4,
                      color: '#065f46',
                    }}
                  >
                    ¡Información importante sobre los pagos!
                  </strong>
                </div>

                <p
                  style={{
                    margin: '0 0 10px',
                    lineHeight: 1.7,
                    fontSize: 15,
                  }}
                >
                  <strong>Si pagas por Yape:</strong> realiza el abono al
                  número de James Flores:
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '13px 15px',
                    marginBottom: 15,
                    borderRadius: 12,
                    background: '#ffffff',
                    border: '1px solid #6ee7b7',
                  }}
                >
                  <Smartphone
                    size={25}
                    color="#059669"
                  />

                  <strong
                    style={{
                      fontSize: 26,
                      letterSpacing: 1,
                      color: '#047857',
                    }}
                  >
                    920656704
                  </strong>

                  <span
                    style={{
                      padding: '5px 10px',
                      borderRadius: 20,
                      background: '#d1fae5',
                      color: '#065f46',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    James Flores
                  </span>
                </div>

                <div
                  style={{
                    height: 1,
                    background: '#a7f3d0',
                    marginBottom: 13,
                  }}
                />

                <p
                  style={{
                    margin: '0 0 12px',
                    lineHeight: 1.7,
                    fontSize: 15,
                  }}
                >
                  <strong>Si pagas en efectivo:</strong> asegúrate de
                  entregarle el dinero a <strong>James o Jose Maria</strong>.
                </p>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.7)',
                    color: '#047857',
                    fontWeight: 800,
                    fontSize: 15,
                    textAlign: 'center',
                  }}
                >
                  ¡Muchas gracias por tu colaboración! ⚽
                </div>
              </div>

              {/* PELOTERO */}
              <div>
                <label
                  htmlFor="playerId"
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  Pelotero
                </label>

                <select
                  id="playerId"
                  className="input"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(event.target.value)
                  }
                  required
                >
                  <option value="">Selecciona tu nombre</option>

                  {players.map((player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.fullName}
                    </option>
                  ))}
                </select>

                {players.length === 0 && (
                  <p
                    style={{
                      color: '#b45309',
                      fontSize: 13,
                    }}
                  >
                    No hay peloteros activos disponibles.
                  </p>
                )}
              </div>

              {/* TIPO DE PAGO */}
              <div>
                <label
                  htmlFor="paymentTypeId"
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  Tipo de pago
                </label>

                <select
                  id="paymentTypeId"
                  className="input"
                  value={paymentTypeId}
                  onChange={(event) =>
                    setPaymentTypeId(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Selecciona el concepto que vas a cancelar
                  </option>

                  {paymentTypes.map((type) => (
                    <option
                      key={type.id}
                      value={type.id}
                    >
                      {type.description}
                    </option>
                  ))}
                </select>

                {paymentTypes.length === 0 && (
                  <p
                    style={{
                      color: '#b45309',
                      fontSize: 13,
                    }}
                  >
                    Todavía no hay tipos de pago registrados. El administrador
                    debe crear al menos uno en PaymentType.
                  </p>
                )}
              </div>

              {/* FORMA DE PAGO */}
              <fieldset
                style={{
                  border: 0,
                  padding: 0,
                  margin: 0,
                  minWidth: 0,
                }}
              >
                <legend
                  style={{
                    display: 'block',
                    marginBottom: 10,
                    fontWeight: 700,
                  }}
                >
                  Forma de pago
                </legend>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 16,
                      border: `2px solid ${
                        paymentMethod === 'YAPE'
                          ? '#087f5b'
                          : '#d1d5db'
                      }`,
                      borderRadius: 12,
                      background:
                        paymentMethod === 'YAPE'
                          ? '#ecfdf5'
                          : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="YAPE"
                      checked={paymentMethod === 'YAPE'}
                      onChange={() =>
                        handlePaymentMethodChange('YAPE')
                      }
                    />

                    <Smartphone
                      size={22}
                      color="#087f5b"
                    />

                    <span style={{ fontWeight: 700 }}>
                      Yape
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 16,
                      border: `2px solid ${
                        paymentMethod === 'EFECTIVO'
                          ? '#087f5b'
                          : '#d1d5db'
                      }`,
                      borderRadius: 12,
                      background:
                        paymentMethod === 'EFECTIVO'
                          ? '#ecfdf5'
                          : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="EFECTIVO"
                      checked={paymentMethod === 'EFECTIVO'}
                      onChange={() =>
                        handlePaymentMethodChange('EFECTIVO')
                      }
                    />

                    <Banknote
                      size={22}
                      color="#087f5b"
                    />

                    <span style={{ fontWeight: 700 }}>
                      Efectivo
                    </span>
                  </label>
                </div>
              </fieldset>

              {/* MONTO */}
              <div>
                <label
                  htmlFor="amount"
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  Monto a cancelar
                </label>

                <div style={{ position: 'relative' }}>
                  <input
                    id="amount"
                    className="input"
                    value={
                      selectedType
                        ? formatMoney(selectedType.amount)
                        : 'Selecciona un tipo de pago'
                    }
                    readOnly
                    aria-readonly="true"
                    style={{
                      background: '#f0fdf4',
                      color: '#065f46',
                      fontWeight: 800,
                      fontSize: 18,
                      paddingLeft: 44,
                    }}
                  />

                  <CreditCard
                    size={20}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#087f5b',
                    }}
                  />
                </div>

                <small
                  style={{
                    color: '#64748b',
                    display: 'block',
                    marginTop: 6,
                  }}
                >
                  El monto se obtiene del tipo de pago seleccionado.
                </small>
              </div>

              {/* FECHAS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 18,
                }}
              >
                <div>
                  <label
                    htmlFor="paymentDate"
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Fecha del pago
                  </label>

                  <input
                    id="paymentDate"
                    type="date"
                    className="input"
                    value={paymentDate}
                    max={today()}
                    onChange={(event) =>
                      setPaymentDate(event.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="pichangaDate"
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Fecha de pichanga
                  </label>

                  <div style={{ position: 'relative' }}>
                    <input
                      id="pichangaDate"
                      type="date"
                      className="input"
                      value={pichangaDate}
                      min={paymentDate || undefined}
                      onChange={(event) =>
                        setPichangaDate(event.target.value)
                      }
                      required
                    />

                    <CalendarDays
                      size={17}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 13,
                        color: '#087f5b',
                        pointerEvents: 'none',
                        display: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* VOUCHER PARA YAPE */}
              {paymentMethod === 'YAPE' ? (
                <div>
                  <label
                    htmlFor="voucher"
                    style={{
                      display: 'block',
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Adjunta tu voucher
                  </label>

                  <div
                    style={{
                      border: '2px dashed #b7d8ca',
                      borderRadius: 16,
                      padding: '25px 16px',
                      textAlign: 'center',
                      background: '#fbfefc',
                    }}
                  >
                    <CloudUpload
                      size={36}
                      style={{
                        color: '#087f5b',
                        marginBottom: 10,
                      }}
                    />

                    <p
                      style={{
                        fontWeight: 800,
                        margin: '0 0 6px',
                      }}
                    >
                      JPG, PNG o PDF
                    </p>

                    <p
                      style={{
                        color: '#64748b',
                        fontSize: 13,
                        margin: '0 0 16px',
                      }}
                    >
                      Tamaño máximo: 5 MB
                    </p>

                    <input
                      id="voucher"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      onChange={(event) =>
                        handleVoucher(
                          event.target.files?.[0] || null
                        )
                      }
                      required={paymentMethod === 'YAPE'}
                      style={{
                        width: '100%',
                        maxWidth: 340,
                      }}
                    />

                    {voucher && (
                      <div style={{ marginTop: 16 }}>
                        {preview && (
                          <img
                            src={preview}
                            alt="Vista previa del voucher"
                            style={{
                              display: 'block',
                              maxWidth: 180,
                              maxHeight: 180,
                              objectFit: 'contain',
                              margin: '0 auto 12px',
                              borderRadius: 8,
                            }}
                          />
                        )}

                        <p
                          style={{
                            overflowWrap: 'anywhere',
                            fontSize: 13,
                            color: '#065f46',
                          }}
                        >
                          {voucher.name}
                          {' · '}
                          {(voucher.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setVoucher(null);
                            clearVoucherInput();
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: 0,
                          }}
                        >
                          <XCircle size={16} />
                          Quitar archivo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <CheckCircle2
                    size={24}
                    color="#087f5b"
                  />

                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: '#065f46',
                      }}
                    >
                      Pago en efectivo
                    </p>

                    <p
                      style={{
                        margin: '5px 0 0',
                        color: '#64748b',
                        fontSize: 14,
                      }}
                    >
                      No necesitas adjuntar ningún archivo.
                    </p>
                  </div>
                </div>
              )}

              {/* MENSAJE DE ERROR */}
              {error && (
                <div
                  role="alert"
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: '#fef2f2',
                    color: '#b91c1c',
                  }}
                >
                  {error}
                </div>
              )}

              {/* CONFIRMACIÓN DEL PAGO */}
              {success && (
                <div
                  role="status"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: '#ecfdf5',
                    color: '#065f46',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 9,
                      alignItems: 'center',
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    <CheckCircle2 size={21} />
                    {success}
                  </div>

                  {receipt && (
                    <div
                      style={{
                        lineHeight: 1.9,
                        fontSize: 14,
                      }}
                    >
                      <div>Pelotero: {receipt.player}</div>
                      <div>Concepto: {receipt.paymentType}</div>
                      <div>
                        Monto: {formatMoney(receipt.amount)}
                      </div>
                      <div>
                        Fecha de pago: {formatDate(receipt.paymentDate)}
                      </div>
                      <div>
                        Fecha de pichanga:{' '}
                        {formatDate(receipt.pichangaDate)}
                      </div>
                      <div>
                        Forma de pago:{' '}
                        {receipt.paymentMethod === 'YAPE'
                          ? 'Yape'
                          : 'Efectivo'}
                      </div>
                      <div>Estado: {receipt.status}</div>
                    </div>
                  )}
                </div>
              )}

              {/* BOTÓN REGISTRAR */}
              <button
                type="submit"
                className="btn"
                disabled={
                  submitting ||
                  loadingData ||
                  players.length === 0 ||
                  paymentTypes.length === 0
                }
                style={{
                  width: '100%',
                  padding: 15,
                  background: submitting
                    ? '#86b94a'
                    : '#a3e635',
                  color: '#163300',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.8 : 1,
                }}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={18} />
                    Registrando pago...
                  </>
                ) : (
                  'Registrar pago'
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
