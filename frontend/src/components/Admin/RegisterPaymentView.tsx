import { ToastNotification } from '../Common/ConfirmModal';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Search,
  CheckCircle2,
  Calendar,
  MessageCircle,
  Upload,
  Edit2,
  AlertTriangle,
  X,
  UserCheck,
  Check,
  Hash,
  HelpCircle,
} from 'lucide-react';
import {
  getStudents,
  getPaymentConcepts,
  savePayment,
  getPayments,
} from '../../services/api';
import { Student, PaymentConcept, AdminUser, PaymentMethod, PaymentRecord } from '../../types';
import { isNonCuotaConcept, isClaseSueltaConcept, isLiberadoConcept } from '../../utils/plans';

function getNextMonth(monthStr: string): string {
  const [yearStr, monthNumStr] = (monthStr || '').split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10);
  if (isNaN(year) || isNaN(month)) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

const MONTH_NAMES: { [key: string]: string } = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

function formatMonthLabel(monthStr: string): string {
  const [y, m] = (monthStr || '').split('-');
  return `${MONTH_NAMES[m] || m} ${y}`;
}

interface RegisterPaymentViewProps {
  user: AdminUser;
  onBack: () => void;
  preselectedStudentId?: string;
}

export const RegisterPaymentView: React.FC<RegisterPaymentViewProps> = ({
  user,
  onBack,
  preselectedStudentId,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [concepts, setConcepts] = useState<PaymentConcept[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Alumna seleccionada
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingStudent, setIsSearchingStudent] = useState<boolean>(false);

  // Concepto de Pago
  const [selectedConcept, setSelectedConcept] = useState<PaymentConcept | null>(null);
  const [claseSueltaQuantity, setClaseSueltaQuantity] = useState<number>(1);

  // Monto a Cobrar y Edición con Lápiz
  const [amountReceived, setAmountReceived] = useState<number>(22000);
  const [isEditingAmount, setIsEditingAmount] = useState<boolean>(false);

  // Medio de Pago (Estrictamente Transferencia o Efectivo)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER');
  const [operationNumber, setOperationNumber] = useState<string>('');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  // Fecha de Cobro
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Switch de Envío de Recibo por WhatsApp
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState<boolean>(true);

  const [notes, setNotes] = useState<string>('');
  const [existingMonthPayments, setExistingMonthPayments] = useState<PaymentRecord[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  // Cargar alumnas activas y conceptos
  useEffect(() => {
    const loadAll = async () => {
      setLoadingInitial(true);
      try {
        const [studentsData, conceptsData] = await Promise.all([
          getStudents(undefined, 'ACTIVE'), // Exclusivamente activas
          getPaymentConcepts(),
        ]);
        setStudents(studentsData);
        setConcepts(conceptsData);

        // Seleccionar alumna preseleccionada o la primera disponible
        if (studentsData.length > 0) {
          if (preselectedStudentId) {
            const found = studentsData.find((s) => s.id === preselectedStudentId);
            setSelectedStudent(found || studentsData[0]);
          } else {
            setSelectedStudent(studentsData[0]);
          }
        }

        // Seleccionar primer concepto por defecto
        if (conceptsData.length > 0) {
          setSelectedConcept(conceptsData[0]);
          setAmountReceived(conceptsData[0].amount);
        }
      } catch (err) {
        console.error('Error al inicializar registro de pago:', err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadAll();
  }, [preselectedStudentId]);

  // Al cambiar de concepto, actualizar monto si el usuario no lo estaba editando libremente
  const handleSelectConcept = (concept: PaymentConcept) => {
    setSelectedConcept(concept);
    setClaseSueltaQuantity(1);
    if (isLiberadoConcept(concept.name)) {
      setAmountReceived(0);
    } else {
      const targetAmount = (concept.name.toLowerCase().includes('cuota') && selectedStudent?.monthlyFee)
        ? selectedStudent.monthlyFee
        : concept.amount;
      setAmountReceived(targetAmount);
    }
    setIsEditingAmount(false);
  };

  // Consultar pagos del mes de la alumna para acumulación y detección de deuda previa
  useEffect(() => {
    if (!selectedStudent) {
      setExistingMonthPayments([]);
      return;
    }
    const paymentMonth = paymentDate.substring(0, 7);
    getPayments(paymentMonth, selectedStudent.id)
      .then((records) => {
        const validList = Array.isArray(records) ? records : [];
        setExistingMonthPayments(validList);
        const alreadyPaid = validList.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const exp = (selectedConcept?.name.toLowerCase().includes('cuota') && selectedStudent?.monthlyFee)
          ? selectedStudent.monthlyFee
          : (selectedConcept ? selectedConcept.amount : (selectedStudent?.monthlyFee || 22000));
        if (alreadyPaid > 0 && alreadyPaid < exp && !isEditingAmount) {
          setAmountReceived(exp - alreadyPaid);
        }
      })
      .catch((err) => console.warn('Error fetching student payments:', err));
  }, [selectedStudent, paymentDate, selectedConcept, isEditingAmount]);

  // Filtrar alumnas en el buscador con lupa
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 8);
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
      return fullName.includes(q) || s.dni.includes(q);
    });
  }, [students, searchQuery]);

  // Teléfono de contacto de la alumna para WhatsApp
  const studentPhone = useMemo(() => {
    if (!selectedStudent) return '';
    if (selectedStudent.phone && selectedStudent.phone.trim() !== '') {
      return selectedStudent.phone.trim();
    }
    if (!selectedStudent.authorizedPeople) return '';
    const contactWithPhone = selectedStudent.authorizedPeople.find((p) => p.phone && p.phone.trim() !== '');
    return contactWithPhone?.phone?.trim() || '';
  }, [selectedStudent]);

  const isNonCuota = Boolean(selectedConcept && isNonCuotaConcept(selectedConcept.name));

  // Cómputo de Pago Parcial, Deuda Restante y Excedente para el Próximo Mes
  const alreadyPaidThisMonth = useMemo(() => {
    if (isNonCuota) return 0;
    const list = Array.isArray(existingMonthPayments) ? existingMonthPayments : [];
    return list.filter((p) => !isNonCuotaConcept(p.concept)).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [existingMonthPayments, isNonCuota]);

  const defaultFee = selectedStudent?.monthlyFee || 22000;
  const expectedAmount = isNonCuota
    ? amountReceived
    : selectedConcept
    ? (selectedConcept.name.toLowerCase().includes('cuota') && selectedStudent?.monthlyFee ? selectedStudent.monthlyFee : selectedConcept.amount)
    : defaultFee;
  const totalAfterThisPayment = alreadyPaidThisMonth + amountReceived;
  const isPartialPayment = !isNonCuota && totalAfterThisPayment < expectedAmount;
  const remainingDebt = isPartialPayment ? expectedAmount - totalAfterThisPayment : 0;

  // Detección de excedente que se acreditará al mes siguiente
  const neededToCompleteMonth = isNonCuota ? 0 : Math.max(0, expectedAmount - alreadyPaidThisMonth);
  const surplus = isNonCuota ? 0 : Math.max(0, amountReceived - neededToCompleteMonth);
  const isSurplus = !isNonCuota && surplus > 0;
  const nextMonthKey = useMemo(() => getNextMonth(paymentDate.substring(0, 7)), [paymentDate]);
  const nextMonthName = useMemo(() => formatMonthLabel(nextMonthKey), [nextMonthKey]);

  // Subir imagen del comprobante
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'La imagen no debe superar los 5MB.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Confirmar y Emitir Recibo
  const handleConfirmPayment = async () => {
    if (!selectedStudent) {
      setToast({ message: 'Por favor seleccioná una alumna beneficiaria.', type: 'error' });
      return;
    }
    if (!selectedConcept) {
      setToast({ message: 'Por favor seleccioná un concepto de pago.', type: 'error' });
      return;
    }
    const isLiberado = Boolean(selectedConcept && isLiberadoConcept(selectedConcept.name));
    if (!isLiberado && amountReceived <= 0) {
      setToast({ message: 'El monto ingresado debe ser mayor a 0.', type: 'error' });
      return;
    }

    const isClaseSuelta = Boolean(selectedConcept && isClaseSueltaConcept(selectedConcept.name));
    const conceptLabel = isClaseSuelta && claseSueltaQuantity > 1
      ? `${selectedConcept.name} (${claseSueltaQuantity} clases)`
      : selectedConcept.name;

    setSubmitting(true);
    try {
      // Mes correspondiente en formato YYYY-MM
      const paymentMonth = paymentDate.substring(0, 7);

      const saved = await savePayment({
        studentId: selectedStudent.id,
        month: paymentMonth,
        amount: amountReceived,
        expectedAmount,
        concept: conceptLabel,
        operationNumber: paymentMethod === 'TRANSFER' ? operationNumber.trim() || undefined : undefined,
        paymentMethod,
        receiptUrl: paymentMethod === 'TRANSFER' ? receiptBase64 : null,
        notes: isClaseSuelta && claseSueltaQuantity > 1
          ? `(${claseSueltaQuantity} clases sueltas) ${notes}`.trim()
          : isSurplus
          ? `Pago con excedente de $${surplus.toLocaleString('es-AR')} acreditado a ${nextMonthName}. ${notes}`.trim()
          : isPartialPayment
            ? `Pago Parcial (Saldo adeudado: $${remainingDebt.toLocaleString('es-AR')}) ${notes}`.trim()
            : notes.trim() || undefined,
        recordedByAdminId: user.id,
        paidAt: new Date(`${paymentDate}T12:00:00`).toISOString(),
      });

      // Envío automático del recibo por WhatsApp si está activado
      if (sendWhatsAppReceipt) {
        if (studentPhone) {
          let cleanPhone = studentPhone.replace(/\D/g, '');
          if (!cleanPhone.startsWith('54') && cleanPhone.length <= 11) {
            cleanPhone = '549' + cleanPhone;
          }

          const [y, m, d] = paymentDate.split('-');
          const formattedDate = `${d}/${m}/${y}`;

          const statusNotice = isSurplus
            ? `\n✨ *Estado:* Cuota del mes totalmente saldada.\n🎉 *Excedente a favor:* $${surplus.toLocaleString('es-AR')} acreditados automáticamente para el mes de ${nextMonthName}.\n`
            : isPartialPayment
              ? `\n⚠️ *Pago Parcial registrado* (Monto del concepto: $${expectedAmount.toLocaleString('es-AR')})\n*Total acumulado abonado:* $${totalAfterThisPayment.toLocaleString('es-AR')}\n*Saldo adeudado restante:* $${remainingDebt.toLocaleString('es-AR')}\n`
              : alreadyPaidThisMonth > 0
                ? `\n✨ *Estado:* Cuota totalmente saldada ($${totalAfterThisPayment.toLocaleString('es-AR')} abonados en total)\n`
                : isLiberado
                  ? `\n✨ *Estado:* Beca / Alumna Liberada ($0)\n`
                  : `\n✨ *Estado:* Cuota totalmente al día\n`;

          const message =
            `💜 *VULPIARE Acrobacia Aérea*\n` +
            `*RECIBO DE PAGO OFICIAL*\n\n` +
            `📄 *Concepto:* ${conceptLabel}\n` +
            `👤 *Alumna:* ${selectedStudent.firstName} ${selectedStudent.lastName} (DNI: ${selectedStudent.dni})\n` +
            `💰 *Monto abonado:* $${amountReceived.toLocaleString('es-AR')}\n` +
            `💳 *Medio de pago:* ${paymentMethod === 'TRANSFER' ? 'Transferencia Bancaria' : 'Efectivo en estudio'}\n` +
            `📅 *Fecha:* ${formattedDate}\n` +
            (operationNumber.trim() ? `🔢 *Nro. Operación:* ${operationNumber.trim()}\n` : '') +
            statusNotice +
            `\n¡Muchas gracias por formar parte de VULPIARE! ✨`;

          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
          window.open(waUrl, '_blank');
        } else {
          setToast({ message: `El pago se registró con éxito, pero la alumna ${selectedStudent.firstName} no tiene un teléfono de contacto en su ficha para enviar el recibo por WhatsApp.`, type: 'info' });
        }
      }

      // Regresar al control de pagos
      onBack();
    } catch (err: any) {
      setToast({ message: 'Error al registrar el pago: ' + (err.message || 'Error desconocido'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 max-w-lg mx-auto">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          Cargando formulario de registro de pago...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col space-y-4 pb-24">
      {/* Barra superior con botón volver */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs shadow-xs border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-purple-600" />
          <span>Volver al Control de Pagos</span>
        </button>
        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
          Nueva Transacción
        </span>
      </div>

      {/* Hero Gradiente */}
      <div className="relative overflow-hidden rounded-3xl bg-purple-900 border border-purple-800/80 p-6 shadow-lg text-white">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md self-start text-xs font-bold uppercase tracking-wider">
            <span>✨</span>
            <span>Gestión de Cobranzas Vulpiare</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Registrar Pago</h2>
          <p className="text-xs sm:text-sm text-purple-100/90 font-medium">
            Carga el cobro de mensualidad, matrícula o clase suelta con validación de montos parciales y recibo instantáneo.
          </p>
        </div>
      </div>

      {/* 1. SELECCIONADOR DE ALUMNA BENEFICIARIA (CON LUPA Y AUTOCOMPLETADO) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
            Alumna Beneficiaria
          </label>
          <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
            Activa
          </span>
        </div>

        {/* Buscador interactivo con Lupa */}
        <div className="relative">
          <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchingStudent(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchingStudent(true);
            }}
            placeholder="Buscar por nombre, apellido o DNI..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchingStudent(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Menú desplegable de autocompletado */}
          {isSearchingStudent && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-48 overflow-y-auto z-30 p-1.5 space-y-1 animate-in fade-in duration-150">
              {filteredStudents.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                  No se encontraron alumnas activas con esa búsqueda.
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(s);
                      setIsSearchingStudent(false);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      selectedStudent?.id === s.id
                        ? 'bg-purple-100 text-purple-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500">DNI: {s.dni} • {s.shift}</p>
                    </div>
                    {selectedStudent?.id === s.id && (
                      <Check className="w-4 h-4 text-purple-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tarjeta de Alumna Seleccionada */}
        {selectedStudent && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                {selectedStudent.firstName.charAt(0)}
                {selectedStudent.lastName.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-slate-900 text-sm truncate">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 truncate">
                  DNI: {selectedStudent.dni} • {selectedStudent.shift}
                </span>
                {studentPhone && (
                  <span className="text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    WhatsApp: {studentPhone}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSearchingStudent(!isSearchingStudent)}
              className="text-xs font-extrabold text-purple-700 hover:text-purple-900 bg-white px-3 py-1.5 rounded-xl border border-purple-200 transition-colors shrink-0"
            >
              Cambiar
            </button>
          </div>
        )}
      </div>

      {/* 2. CONCEPTO DE PAGO (CARGADO DINÁMICAMENTE DEL ABM PAGOS) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2.5">
        <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
          Concepto de Pago (Desde ABM Pagos)
        </label>
        {concepts.length === 0 ? (
          <p className="text-xs text-slate-500">No hay conceptos cargados aún.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {concepts.map((concept) => {
              const isSelected = selectedConcept?.id === concept.id;
              return (
                <button
                  key={concept.id}
                  type="button"
                  onClick={() => handleSelectConcept(concept)}
                  className={`flex flex-col p-3 rounded-2xl text-left border-2 transition-all active:scale-98 ${
                    isSelected
                      ? 'border-purple-600 bg-purple-700 text-white shadow-md shadow-purple-200'
                      : 'border-slate-100 bg-slate-50 text-slate-800 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <CreditCard
                      className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-purple-600'}`}
                    />
                    <span
                      className={`text-xs font-black ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      ${concept.amount.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <span className="text-xs font-bold truncate">{concept.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {selectedConcept && isClaseSueltaConcept(selectedConcept.name) && (
          <div className="mt-3 p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-purple-950 block">Cantidad de clases sueltas</span>
              <span className="text-[11px] text-purple-700 font-medium">
                Arancel unitario: ${selectedConcept.amount.toLocaleString('es-AR')} • Las alumnas pueden repetir la cantidad de clases que deseen
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  const newQ = Math.max(1, claseSueltaQuantity - 1);
                  setClaseSueltaQuantity(newQ);
                  setAmountReceived(newQ * selectedConcept.amount);
                }}
                className="w-9 h-9 rounded-xl bg-white border border-purple-200 text-purple-900 font-black text-lg flex items-center justify-center hover:bg-purple-100 shadow-2xs active:scale-95"
              >
                -
              </button>
              <span className="w-10 text-center font-black text-sm text-purple-950 bg-white border border-purple-200 rounded-xl py-1.5 shadow-2xs">
                {claseSueltaQuantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  const newQ = claseSueltaQuantity + 1;
                  setClaseSueltaQuantity(newQ);
                  setAmountReceived(newQ * selectedConcept.amount);
                }}
                className="w-9 h-9 rounded-xl bg-white border border-purple-200 text-purple-900 font-black text-lg flex items-center justify-center hover:bg-purple-100 shadow-2xs active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. MONTO A COBRAR CON LÁPIZ DE EDICIÓN & DETECCIÓN DE PAGO PARCIAL */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
            Monto a Cobrar / Recibido
          </label>

          {/* Badge dinámico de Pago Completo, Parcial o con Excedente */}
          {isSurplus ? (
            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pago con Excedente</span>
            </span>
          ) : isPartialPayment ? (
            <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Pago Parcial</span>
            </span>
          ) : (
            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Pago Completo
            </span>
          )}
        </div>

        {alreadyPaidThisMonth > 0 && (
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
            <div>
              <span className="font-extrabold block">✨ Pagos previos en este mes:</span>
              <span className="text-[11px] text-purple-700">
                La alumna ya tiene abonados <strong>${alreadyPaidThisMonth.toLocaleString('es-AR')}</strong> de ${expectedAmount.toLocaleString('es-AR')}.
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-purple-500 block">Saldo restante</span>
              <span className="font-black text-purple-900 text-sm">
                ${Math.max(0, expectedAmount - alreadyPaidThisMonth).toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-2xl font-black text-purple-700 leading-none">$</span>

          {isEditingAmount ? (
            <input
              type="number"
              min={0}
              value={amountReceived}
              onChange={(e) => setAmountReceived(Number(e.target.value))}
              className="flex-1 bg-white px-3 py-1.5 border border-purple-400 rounded-xl text-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-2xl font-black text-slate-900">
              {amountReceived.toLocaleString('es-AR')}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsEditingAmount(!isEditingAmount)}
            className="p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-xs flex items-center gap-1 transition-colors"
            title="Editar monto recibido"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isEditingAmount ? 'Fijar' : 'Editar'}</span>
          </button>
        </div>

        {/* Notificación de excedente acreditado para el mes que le sigue */}
        {isSurplus && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-emerald-950">
                ¡Monto mayor al debido detectado! (${amountReceived.toLocaleString('es-AR')} abonados vs. ${neededToCompleteMonth.toLocaleString('es-AR')} requeridos)
              </p>
              <p className="text-[11px] text-emerald-800 mt-1">
                La cuota de este mes queda <strong>100% saldada</strong>, y el excedente de{' '}
                <strong className="text-emerald-950 underline font-black">${surplus.toLocaleString('es-AR')}</strong>{' '}
                se acredita automáticamente como pago a favor para el mes siguiente (<strong>{nextMonthName}</strong>).
              </p>
            </div>
          </div>
        )}

        {/* Notificación de deuda si es pago parcial */}
        {isPartialPayment && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900 font-semibold animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">
                Se detectó un pago menor al debido (${amountReceived.toLocaleString('es-AR')} de ${expectedAmount.toLocaleString('es-AR')}).
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Quedará registrado como <strong>"Pago Parcial"</strong> con una deuda restante de{' '}
                <strong>${remainingDebt.toLocaleString('es-AR')}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. MEDIO DE PAGO (SOLO TRANSFERENCIA O EFECTIVO) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
        <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
          Medio de Pago (Transferencia o Efectivo)
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Transferencia */}
          <button
            type="button"
            onClick={() => setPaymentMethod('TRANSFER')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 border-2 transition-all active:scale-95 ${
              paymentMethod === 'TRANSFER'
                ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            }`}
          >
            <CreditCard
              className={`w-6 h-6 ${
                paymentMethod === 'TRANSFER' ? 'text-purple-600' : 'text-slate-400'
              }`}
            />
            <span className="text-xs font-black">Transferencia</span>
            <span className="text-[10px] text-slate-500 font-semibold">Bancaria / CBU</span>
          </button>

          {/* Efectivo */}
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 border-2 transition-all active:scale-95 ${
              paymentMethod === 'CASH'
                ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            }`}
          >
            <DollarSign
              className={`w-6 h-6 ${
                paymentMethod === 'CASH' ? 'text-purple-600' : 'text-slate-400'
              }`}
            />
            <span className="text-xs font-black">Efectivo</span>
            <span className="text-[10px] text-slate-500 font-semibold">En Estudio</span>
          </button>
        </div>

        {/* Nro. de Operación y Comprobante (Solo para Transferencia) */}
        {paymentMethod === 'TRANSFER' && (
          <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-extrabold uppercase text-slate-500 block mb-1">
                Nro. de Operación / Referencia (Opcional)
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Hash className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={operationNumber}
                  onChange={(e) => setOperationNumber(e.target.value)}
                  placeholder="Ej: 0048291"
                  className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold uppercase text-slate-500 block mb-1">
                Comprobante de Transferencia (Foto / Imagen)
              </label>
              <label className="cursor-pointer flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl bg-slate-50 hover:bg-purple-50/30 text-center transition-colors">
                <Upload className="w-6 h-6 text-purple-600 mb-1" />
                <span className="text-xs font-extrabold text-slate-700">
                  {receiptBase64 ? 'Cambiar comprobante adjunto' : 'Subir Comprobante (Foto/Captura)'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Toca para seleccionar desde la galería o sacar foto
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>

              {receiptBase64 && (
                <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200 max-h-40 bg-slate-900">
                  <img
                    src={receiptBase64}
                    alt="Comprobante"
                    className="w-full h-40 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptBase64(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. FECHA DE COBRO Y WHATSAPP TOGGLE */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3.5">
        <div>
          <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
            Fecha de Cobro
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <Calendar className="w-4 h-4 text-purple-600" />
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        {/* Switch WhatsApp Automático */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 block leading-tight">
                Enviar recibo por WhatsApp
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Abre WhatsApp automáticamente al confirmar
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sendWhatsAppReceipt}
              onChange={(e) => setSendWhatsAppReceipt(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          disabled={submitting}
          onClick={handleConfirmPayment}
          className="w-full py-4 px-6 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-sm shadow-md shadow-purple-200 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{submitting ? 'Registrando Pago...' : 'Confirmar y Emitir Recibo'}</span>
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs transition-colors"
        >
          Cancelar
        </button>
      </div>
      {/* Toast Notificación */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
