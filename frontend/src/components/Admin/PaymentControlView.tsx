import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  Edit2,
  DollarSign,
  TrendingUp,
  X,
  Upload,
  Eye,
  Trash2,
  HelpCircle,
  ArrowRight,
  Filter,
  Check,
  Plus,
} from 'lucide-react';
import { getStudents, getPayments, savePayment, updatePayment, deletePayment, resetMonthPayments, getShifts } from '../../services/api';
import { Student, PaymentRecord, AdminUser, OFFICIAL_SHIFTS } from '../../types';
import { isNonCuotaConcept } from '../../utils/plans';

interface PaymentControlViewProps {
  user: AdminUser;
  onNavigateToRegisterPayment?: (studentId?: string) => void;
}

// Cuota base por defecto en VULPIARE
const DEFAULT_FEE = 22000;
const SURCHARGE_PERCENT = 0.10; // 10% de recargo pasados los primeros 10 días

type PaymentFilter = 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE' | 'SEGURO' | 'INSCRIPCION';

interface StudentPaymentInfo {
  student: Student;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  amount: number;
  expectedAmount?: number;
  remainingDebt?: number;
  isPartial?: boolean;
  paymentRecord?: PaymentRecord;
  allPayments?: PaymentRecord[];
  phone?: string;
  contactName?: string;
}

export const PaymentControlView: React.FC<PaymentControlViewProps> = ({
  user,
  onNavigateToRegisterPayment,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [shifts, setShifts] = useState<string[]>(OFFICIAL_SHIFTS);
  const [loading, setLoading] = useState<boolean>(true);

  // Período seleccionado (formato YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Mini Modal de Pago / Edición
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [amountInput, setAmountInput] = useState<number>(DEFAULT_FEE);
  const [notesInput, setNotesInput] = useState<string>('');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Mini Modal de Resumen de Recaudación
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false);

  // Modal para ver comprobante en grande
  const [viewReceiptModal, setViewReceiptModal] = useState<string | null>(null);

  // Cargar estudiantes y turnos
  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, shiftsData, paymentsData] = await Promise.all([
        getStudents(undefined, 'ACTIVE'), // Exclusivamente alumnas activas
        getShifts(),
        getPayments(selectedMonth),
      ]);
      setStudents(studentsData);
      if (shiftsData && shiftsData.length > 0) setShifts(shiftsData);
      setPayments(paymentsData);
    } catch (err) {
      console.error('Error al cargar datos de pagos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // Cálculo de estado por cada alumna activa para el mes seleccionado
  const computedList: StudentPaymentInfo[] = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Determinamos si el mes consultado es pasado, corriente o futuro
    const isPastMonth =
      targetYear < currentYear || (targetYear === currentYear && targetMonth < currentMonth);
    const isCurrentMonth = targetYear === currentYear && targetMonth === currentMonth;

    return students.map((student) => {
      // Buscar si tiene pago registrado para este mes
      const studentPayments = payments.filter((p) => p.studentId === student.id);
      const cuotaPayments = studentPayments.filter((p) => !isNonCuotaConcept(p.concept));

      // Teléfono de contacto (de la alumna o de personas autorizadas de su ficha)
      let phone = '';
      let contactName = '';
      if (student.phone && student.phone.trim() !== '') {
        phone = student.phone.trim();
        contactName = `${student.firstName} ${student.lastName}`;
      } else if (student.authorizedPeople && student.authorizedPeople.length > 0) {
        const contactWithPhone = student.authorizedPeople.find((p) => p.phone && p.phone.trim() !== '');
        if (contactWithPhone) {
          phone = contactWithPhone.phone!.trim();
          contactName = contactWithPhone.fullName;
        }
      }

      if (cuotaPayments.length > 0) {
        const totalPaid = cuotaPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const studentBaseFee = student.monthlyFee || DEFAULT_FEE;
        const expectedAmount = cuotaPayments.find((p) => p.expectedAmount && p.expectedAmount > 0)?.expectedAmount || studentBaseFee;
        const remainingDebt = Math.max(0, expectedAmount - totalPaid);
        const isPartial = remainingDebt > 0;

        return {
          student,
          status: 'PAID',
          amount: totalPaid,
          expectedAmount,
          remainingDebt,
          isPartial,
          paymentRecord: cuotaPayments[cuotaPayments.length - 1],
          allPayments: studentPayments,
          phone,
          contactName,
        };
      }

      // Si no pagó cuota mensual:
      // Si el mes ya pasó o si es el mes actual pero pasaron los 10 días -> VENCIDA con 10% de recargo
      const isOverdue = isPastMonth || (isCurrentMonth && currentDay > 10);

      const baseFee = student.monthlyFee || DEFAULT_FEE;
      const fee = isOverdue
        ? Math.round(baseFee * (1 + SURCHARGE_PERCENT))
        : baseFee;

      return {
        student,
        status: isOverdue ? 'OVERDUE' : 'PENDING',
        amount: fee,
        phone,
        contactName,
      };
    });
  }, [students, payments, selectedMonth]);

  // Métricas generales
  const metrics = useMemo(() => {
    const totalActive = computedList.length;
    const paidCount = computedList.filter((item) => item.status === 'PAID' && !item.isPartial).length;
    const pendingCount = computedList.filter((item) => item.status === 'PENDING' || (item.status === 'PAID' && item.isPartial)).length;
    const overdueCount = computedList.filter((item) => item.status === 'OVERDUE').length;
    const seguroCount = computedList.filter((item) => item.allPayments?.some((p) => p.concept?.toLowerCase().includes('seguro'))).length;
    const inscripcionCount = computedList.filter((item) => item.allPayments?.some((p) => {
      const c = (p.concept || '').toLowerCase();
      return c.includes('inscrip') || c.includes('matr');
    })).length;

    const totalCollected = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0); const _unusedCollected = computedList.reduce(
      (acc, item) => (item.status === 'PAID' ? acc + item.amount : acc),
      0
    );

    const cashCollected = payments.reduce((acc, p) => (p.paymentMethod === 'CASH' ? acc + (Number(p.amount) || 0) : acc), 0); const _unusedCash = computedList.reduce(
      (acc, item) =>
        item.status === 'PAID' && item.paymentRecord?.paymentMethod === 'CASH'
          ? acc + item.amount
          : acc,
      0
    );

    const transferCollected = payments.reduce((acc, p) => (p.paymentMethod === 'TRANSFER' ? acc + (Number(p.amount) || 0) : acc), 0); const _unusedTransfer = computedList.reduce(
      (acc, item) =>
        item.status === 'PAID' && item.paymentRecord?.paymentMethod === 'TRANSFER'
          ? acc + item.amount
          : acc,
      0
    );

    const totalPendingAmount = computedList.reduce(
      (acc, item) => {
        if (item.status === 'PAID') {
          return acc + (item.remainingDebt || 0);
        }
        return acc + item.amount;
      },
      0
    );

    const paidPercentage = totalActive > 0 ? Math.round((paidCount / totalActive) * 100) : 0;

    return {
      totalActive,
      paidCount,
      pendingCount,
      overdueCount,
      totalCollected,
      cashCollected,
      transferCollected,
      totalPendingAmount,
      paidPercentage,
      seguroCount,
      inscripcionCount,
    };
  }, [computedList]);

  // Lista filtrada para la UI
  const filteredList = useMemo(() => {
    return computedList.filter((item) => {
      // Filtro de estado
      if (activeFilter === 'PAID' && item.status !== 'PAID') return false;
      if (activeFilter === 'PENDING' && item.status !== 'PENDING') return false;
      if (activeFilter === 'OVERDUE' && item.status !== 'OVERDUE') return false;
      if (activeFilter === 'SEGURO' && !item.allPayments?.some((p) => p.concept?.toLowerCase().includes('seguro'))) return false;
      if (activeFilter === 'INSCRIPCION' && !item.allPayments?.some((p) => {
        const c = (p.concept || '').toLowerCase();
        return c.includes('inscrip') || c.includes('matr');
      })) return false;

      // Filtro de turno
      if (selectedShift !== 'ALL' && item.student.shift !== selectedShift) return false;

      // Filtro de búsqueda
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const fullName = `${item.student.firstName} ${item.student.lastName}`.toLowerCase();
        const dni = item.student.dni.toLowerCase();
        if (!fullName.includes(query) && !dni.includes(query)) return false;
      }

      return true;
    });
  }, [computedList, activeFilter, selectedShift, searchTerm]);

  // Abrir modal para marcar o editar pago
  const handleOpenPaymentModal = (item: StudentPaymentInfo, specificPayment?: PaymentRecord) => {
    setTargetStudent(item.student);
    const paymentToEdit =
      specificPayment ||
      (item.allPayments && item.allPayments.length > 0
        ? item.allPayments[item.allPayments.length - 1]
        : item.paymentRecord);

    if (paymentToEdit) {
      setEditingPayment(paymentToEdit);
      setSelectedMethod(paymentToEdit.paymentMethod);
      setAmountInput(paymentToEdit.amount);
      setNotesInput(paymentToEdit.notes || '');
      setReceiptBase64(paymentToEdit.receiptUrl || null);
    } else {
      setEditingPayment(null);
      setSelectedMethod('TRANSFER');
      setAmountInput(item.isPartial && item.remainingDebt ? item.remainingDebt : item.amount);
      setNotesInput('');
      setReceiptBase64(null);
    }
    setPaymentModalOpen(true);
  };

  // Manejar subida de archivo de comprobante
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Guardar o modificar pago (soporta volver a 0)
  const handleSavePayment = async () => {
    if (!targetStudent) return;
    setSubmittingPayment(true);

    try {
      if (editingPayment) {
        if (amountInput <= 0) {
          // Modificar a monto 0 significa anular este pago
          await deletePayment(editingPayment.id);
        } else {
          await updatePayment(editingPayment.id, {
            amount: amountInput,
            paymentMethod: selectedMethod,
            receiptUrl: selectedMethod === 'TRANSFER' ? receiptBase64 : null,
            notes: notesInput.trim() || null,
          });
        }
      } else {
        await savePayment({
          studentId: targetStudent.id,
          month: selectedMonth,
          amount: amountInput,
          paymentMethod: selectedMethod,
          receiptUrl: selectedMethod === 'TRANSFER' ? receiptBase64 : null,
          notes: notesInput.trim() || null,
          recordedByAdminId: user.id,
        });
      }

      setPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error al guardar el pago: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Eliminar pago individual / revertir
  const handleDeletePayment = async (paymentId: string) => {
    const confirmDelete = window.confirm(
      '¿Deseas revertir este pago? Si generó excedente a favor en el mes siguiente, también se anulará automáticamente.'
    );
    if (!confirmDelete) return;

    try {
      await deletePayment(paymentId);
      setPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error al anular pago: ' + err.message);
    }
  };

  // Anulación total del mes (Volver a 0 / Impago por error de selección de alumna)
  const handleResetMonthPayments = async (studentId: string, studentName: string) => {
    const confirmReset = window.confirm(
      `¿Deseas anular TODOS los pagos de ${studentName} para ${selectedMonthLabel} y volver a $0?\n\nSi este pago generó saldo a favor (excedente) para el mes siguiente, ese excedente también se eliminará automáticamente.`
    );
    if (!confirmReset) return;

    try {
      await resetMonthPayments(studentId, selectedMonth);
      setPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Error al anular pagos del mes: ' + err.message);
    }
  };

  // Enviar recordatorio por WhatsApp
  const handleSendReminder = (item: StudentPaymentInfo) => {
    if (!item.phone) {
      alert(
        `La alumna ${item.student.firstName} ${item.student.lastName} no posee un número de teléfono de contacto registrado en su ficha de alta. Podés agregarlo desde el módulo de Alumnas.`
      );
      return;
    }

    // Formatear mes en español
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

    // Limpiar número para WhatsApp
    let cleanPhone = item.phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('54') && cleanPhone.length <= 11) {
      cleanPhone = '549' + cleanPhone;
    }

    const stateText =
      item.status === 'OVERDUE'
        ? `vencida (con el 10% de recargo incluido: $${item.amount.toLocaleString('es-AR')})`
        : `pendiente ($${item.amount.toLocaleString('es-AR')}, recordá que abona hasta el 10 del mes)`;

    const message = `🩰 *VULPIARE Danza y Acrobacia Aérea*\n\nHola${
      item.contactName ? ` ${item.contactName}` : ''
    }! Te contactamos de la administración para recordarte el estado de la cuota de *${
      item.student.firstName
    } ${item.student.lastName}* correspondiente a *${monthName}*.\n\n📌 Estado: *${stateText}*\n\nSi ya realizaste el pago por transferencia, por favor envianos el comprobante por este medio para registrarlo. ¡Muchas gracias! ✨`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Nombre legible del mes seleccionado
  const selectedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    const str = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [selectedMonth]);

  // Cambiar mes (-1 o +1)
  const handleChangeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  return (
    <div className="flex flex-col space-y-5 pb-24 max-w-5xl mx-auto">
      {/* 1. BANNER HERO GRADIENTE VULPIARE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-800 to-pink-600 p-5 sm:p-7 shadow-xl text-white">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-pink-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-purple-300/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md shadow-sm">
              <CreditCard className="w-4 h-4 text-white" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                Gestión Financiera VULPIARE
              </span>
            </div>
            <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full font-bold backdrop-blur-xs">
              {metrics.totalActive} Alumnas Activas
            </span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Control de Pagos
            </h2>
            <p className="text-sm text-purple-100/90 mt-1 max-w-xl font-medium leading-relaxed">
              Supervisión de cuotas mensuales, vencimientos con recargo automático del 10% y registro ágil de transferencias o efectivo.
            </p>
          </div>

          {/* BOTÓN BLANCO PRINCIPAL: REGISTRAR NUEVO PAGO */}
          {onNavigateToRegisterPayment && (
            <button
              onClick={() => onNavigateToRegisterPayment()}
              type="button"
              id="btn-nuevo-pago"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white text-purple-700 shadow-lg font-extrabold text-xs sm:text-sm hover:bg-purple-50 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              <span>+ Registrar Nuevo Pago</span>
            </button>
          )}

          {/* Mini Métricas Internas */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/15 backdrop-blur-md text-center border border-white/10">
              <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                {metrics.paidCount}
              </span>
              <span className="text-[10px] sm:text-xs text-purple-200 uppercase font-extrabold mt-1">
                Al día
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/15 backdrop-blur-md text-center border border-white/10">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 leading-none">
                {metrics.pendingCount}
              </span>
              <span className="text-[10px] sm:text-xs text-purple-200 uppercase font-extrabold mt-1">
                Pendientes
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/15 backdrop-blur-md text-center border border-white/10">
              <span className="text-2xl sm:text-3xl font-black text-rose-300 leading-none">
                {metrics.overdueCount}
              </span>
              <span className="text-[10px] sm:text-xs text-purple-200 uppercase font-extrabold mt-1">
                Vencidas (+10%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SELECTOR DE PERÍODO & CONTROLES */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navegador de Mes */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleChangeMonth(-1)}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 flex items-center justify-center transition-colors font-bold active:scale-95"
              title="Mes Anterior"
            >
              ←
            </button>
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-2xl border border-purple-100">
              <Calendar className="w-5 h-5 text-purple-700" />
              <div>
                <span className="block text-[10px] uppercase font-extrabold text-purple-600 leading-none">
                  Período
                </span>
                <span className="text-base font-black text-slate-900 leading-tight">
                  {selectedMonthLabel}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleChangeMonth(1)}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-700 flex items-center justify-center transition-colors font-bold active:scale-95"
              title="Mes Siguiente"
            >
              →
            </button>
          </div>

          {/* Filtro por turno */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="ALL">Todos los turnos</option>
              {shifts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alumna o DNI..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros de Estado en Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Todas ({metrics.totalActive})</span>
          </button>

          <button
            onClick={() => setActiveFilter('PAID')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'PAID'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Al día ({metrics.paidCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('PENDING')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'PENDING'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Pendientes ({metrics.pendingCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('OVERDUE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'OVERDUE'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Vencidas ({metrics.overdueCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('SEGURO')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'SEGURO'
                ? 'bg-indigo-700 text-white shadow-md shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <span>🛡️ Seguro (${metrics.seguroCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('INSCRIPCION')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeFilter === 'INSCRIPCION'
                ? 'bg-pink-700 text-white shadow-md shadow-pink-200'
                : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
            }`}
          >
            <span>📝 Inscripción (${metrics.inscripcionCount})</span>
          </button>
        </div>
      </div>

      {/* 3. LISTADO DE ALUMNAS */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Cargando control de cuotas...
          </p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-700">No se encontraron alumnas</h4>
          <p className="text-xs text-slate-500 mt-1">
            Probá ajustando la búsqueda o los filtros de estado y turno.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredList.map((item) => {
            const isPaid = item.status === 'PAID';
            const isOverdue = item.status === 'OVERDUE';
            const isPending = item.status === 'PENDING';
            const isPartial = Boolean(item.isPartial || (item.remainingDebt && item.remainingDebt > 0));

            return (
              <div
                key={item.student.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border transition-all ${
                  isPaid
                    ? isPartial
                      ? 'border-amber-300 bg-amber-50/10'
                      : 'border-purple-200 hover:border-purple-300'
                    : isOverdue
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Cabecera de Alumna & Estado */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                        {item.student.firstName.charAt(0)}
                        {item.student.lastName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white ${
                          isPaid
                            ? isPartial
                              ? 'bg-amber-500'
                              : 'bg-purple-600'
                            : isOverdue
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      >
                        {isPaid ? (isPartial ? '½' : '✓') : '!'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {item.student.firstName} {item.student.lastName}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        DNI: {item.student.dni}
                      </span>
                    </div>
                  </div>

                  {/* Badge de Estado de Cuota */}
                  {isPaid && (
                    <span
                      className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] flex items-center gap-1 border ${
                        isPartial
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-purple-100 text-purple-900 border-purple-200'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isPartial ? 'Pago Parcial' : 'Al día'}</span>
                    </span>
                  )}
                  {isPending && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] flex items-center gap-1 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Vence el 10</span>
                    </span>
                  )}
                  {isOverdue && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[11px] flex items-center gap-1 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Vencida (+10%)</span>
                    </span>
                  )}
                </div>

                {/* Info Turno & Cuota */}
                <div className="bg-slate-50 rounded-2xl p-3 my-3 flex flex-col space-y-1.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{item.student.shift}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-xs font-bold text-slate-700">
                      {isPaid
                        ? item.allPayments && item.allPayments.length > 1
                          ? `Total abonado (${item.allPayments.length} pagos acumulados)`
                          : `Cuota abonada (${
                            item.paymentRecord?.paymentMethod === 'TRANSFER'
                              ? 'Transferencia'
                              : 'Efectivo'
                          })`
                        : isOverdue
                        ? 'Cuota Vencida (+10% recargo)'
                        : 'Cuota del Mes'}
                    </span>
                    <span
                      className={`text-base font-black ${
                        isPaid
                          ? isPartial
                            ? 'text-amber-800'
                            : 'text-purple-700'
                          : isOverdue
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }`}
                    >
                      ${item.amount.toLocaleString('es-AR')}
                    </span>
                  </div>

                  {item.allPayments && item.allPayments.some((p) => isNonCuotaConcept(p.concept)) && (
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100">
                      {item.allPayments
                        .filter((p) => isNonCuotaConcept(p.concept))
                        .map((p) => (
                          <div
                            key={p.id}
                            className="text-[11px] bg-indigo-50/90 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-xl font-bold flex items-center justify-between gap-1 shadow-xs"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{p.concept?.toLowerCase().includes('seguro') ? '🛡️' : '📝'}</span>
                              <span className="font-extrabold">{p.concept}:</span>
                              <span className="font-black text-indigo-950">${p.amount.toLocaleString('es-AR')}</span>
                              <span className="text-[10px] text-indigo-700 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-100 font-extrabold">
                                {p.paymentMethod === 'TRANSFER' ? '💳 Transferencia' : '💵 Efectivo en Caja'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {p.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewReceiptModal(p.receiptUrl!)}
                                  className="p-1 rounded-lg hover:bg-white text-indigo-700 font-bold text-[10px]"
                                  title="Ver comprobante"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(item, p)}
                                className="p-1 rounded-lg hover:bg-white text-indigo-700 font-bold text-[10px]"
                                title="Editar pago"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {isPaid && item.allPayments && item.allPayments.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                      {item.allPayments.map((p, idx) => (
                        <span
                          key={p.id || idx}
                          className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600 font-bold flex items-center gap-1"
                        >
                          <span>{p.paymentMethod === 'TRANSFER' ? '💳 Transf.' : '💵 Efectivo'}:</span>
                          <strong className="text-slate-800">${p.amount.toLocaleString('es-AR')}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Deuda restante si es pago parcial */}
                  {isPartial && item.remainingDebt && item.remainingDebt > 0 && (
                    <div className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center justify-between">
                      <span>Saldo adeudado restante:</span>
                      <span className="font-black text-rose-700">
                        ${item.remainingDebt.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )}

                  {isPaid && item.paymentRecord?.paidAt && (
                    <div className="text-[11px] text-slate-400 font-semibold pt-0.5">
                      Registrado:{' '}
                      {new Date(item.paymentRecord.paidAt).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                      {item.paymentRecord.concept && ` • ${item.paymentRecord.concept}`}
                    </div>
                  )}
                </div>

                {/* Acciones de la Card */}
                <div className="flex items-center gap-2 pt-0.5">
                  {/* Si ya está al día: Botón para editar / ver recibo */}
                  {isPaid ? (
                    <>
                      {isPartial && onNavigateToRegisterPayment && (
                        <button
                          onClick={() => onNavigateToRegisterPayment(item.student.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-colors active:scale-98 shadow-xs"
                          title="Registrar pago del saldo restante"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Saldar (${item.remainingDebt?.toLocaleString('es-AR')})</span>
                        </button>
                      )}
                      {item.paymentRecord?.receiptUrl && (
                        <button
                          onClick={() => setViewReceiptModal(item.paymentRecord!.receiptUrl!)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs transition-colors active:scale-98"
                        >
                          <Eye className="w-4 h-4 text-purple-600" />
                          <span>Ver Comprobante</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenPaymentModal(item)}
                        title="Editar registro de pago"
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors active:scale-98 ${
                          !item.paymentRecord?.receiptUrl ? 'flex-1' : 'w-10'
                        }`}
                      >
                        <Edit2 className="w-4 h-4 text-slate-600" />
                        {!item.paymentRecord?.receiptUrl && <span>Editar Pago</span>}
                      </button>
                    </>
                  ) : (
                    /* Si NO está paga: Botón "Pagado" (abre el mini modal) + Botón "Recordar" */
                    <>
                      <button
                        onClick={() => {
                          if (onNavigateToRegisterPayment) {
                            onNavigateToRegisterPayment(item.student.id);
                          } else {
                            handleOpenPaymentModal(item);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-700 to-pink-600 text-white font-extrabold text-xs shadow-md shadow-purple-200 active:scale-98 hover:opacity-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Pagado</span>
                      </button>

                      <button
                        onClick={() => handleSendReminder(item)}
                        title="Enviar recordatorio por WhatsApp"
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-200 active:scale-98 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Recordar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. RESUMEN DE CIERRE RÁPIDO AL FINAL */}
      <div
        onClick={() => setSummaryModalOpen(true)}
        className="mt-4 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer hover:border-purple-300 transition-all group"
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs transition-colors">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-base leading-tight">
              Recaudación de {selectedMonthLabel}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {metrics.paidPercentage}% de cuotas cobradas ({metrics.paidCount} de {metrics.totalActive})
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="text-right">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">
              Total Recolectado
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-700 leading-none">
              ${metrics.totalCollected.toLocaleString('es-AR')}
            </span>
          </div>
          <button
            type="button"
            className="px-3.5 py-2 rounded-2xl bg-purple-50 text-purple-700 font-extrabold text-xs flex items-center gap-1 group-hover:bg-purple-700 group-hover:text-white transition-all"
          >
            <span>Ver Detalle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MINI MODAL 1: REGISTRAR / EDITAR PAGO (Estilo Doble Rol VULPIARE) */}
      {paymentModalOpen && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block">
                  {editingPayment ? 'Editar Pago de Cuota' : 'Registrar Pago de Cuota'}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {targetStudent.firstName} {targetStudent.lastName}
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de pagos existentes si hay más de 1 registrado */}
            {(() => {
              const info = computedList.find((i) => i.student.id === targetStudent.id);
              const monthPayments = info?.allPayments || (info?.paymentRecord ? [info.paymentRecord] : []);
              if (monthPayments.length <= 1) return null;

              return (
                <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-1.5">
                  <span className="text-[11px] font-extrabold text-purple-900 block">
                    Pagos registrados en este mes ({monthPayments.length}):
                  </span>
                  <div className="flex flex-col gap-1">
                    {monthPayments.map((p, idx) => (
                      <button
                        key={p.id || idx}
                        type="button"
                        onClick={() => {
                          setEditingPayment(p);
                          setSelectedMethod(p.paymentMethod);
                          setAmountInput(p.amount);
                          setNotesInput(p.notes || '');
                          setReceiptBase64(p.receiptUrl || null);
                        }}
                        className={`p-2 rounded-xl text-xs flex items-center justify-between border transition-all text-left ${
                          editingPayment?.id === p.id
                            ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                            : 'bg-white text-slate-700 border-purple-200/60 hover:bg-purple-100/50'
                        }`}
                      >
                        <span className="font-bold">
                          {p.paymentMethod === 'TRANSFER' ? '💳 Transf.' : '💵 Efectivo'}: ${p.amount.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[10px] opacity-80">
                          {editingPayment?.id === p.id ? 'Seleccionado para editar' : 'Clic para editar este'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Selector de Método de Pago: 2 Opciones Grandes tipo selector de rol */}
            <div>
              <label className="text-xs font-extrabold uppercase text-slate-500 block mb-2">
                Medio de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('TRANSFER')}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 border-2 transition-all active:scale-95 ${
                    selectedMethod === 'TRANSFER'
                      ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <CreditCard
                    className={`w-6 h-6 ${
                      selectedMethod === 'TRANSFER' ? 'text-purple-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-black">Transferencia</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Bancaria / CBU</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('CASH')}
                  className={`p-3.5 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 border-2 transition-all active:scale-95 ${
                    selectedMethod === 'CASH'
                      ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <DollarSign
                    className={`w-6 h-6 ${
                      selectedMethod === 'CASH' ? 'text-purple-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-black">Efectivo</span>
                  <span className="text-[10px] text-slate-500 font-semibold">En Estudio</span>
                </button>
              </div>
            </div>

            {/* Monto Abonado */}
            <div>
              <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                Monto Abonado ($ ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {amountInput <= 0 && (
                <p className="text-[11px] font-bold text-rose-600 mt-1">
                  ⚠️ Monto $0: Al guardar, este pago se anulará y volverá a computarse como impago.
                </p>
              )}
            </div>

            {/* Adjuntar Comprobante (Si eligió Transferencia) */}
            {selectedMethod === 'TRANSFER' && (
              <div>
                <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                  Comprobante de Transferencia (Opcional)
                </label>
                <div className="flex flex-col space-y-2">
                  <label className="cursor-pointer flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl bg-slate-50 hover:bg-purple-50/40 text-slate-600 transition-colors">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold">
                      {receiptBase64 ? 'Cambiar imagen' : 'Adjuntar foto o comprobante'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>

                  {receiptBase64 && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-36">
                      <img
                        src={receiptBase64}
                        alt="Comprobante adjunto"
                        className="w-full h-36 object-contain bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setReceiptBase64(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                        title="Quitar imagen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas opcionales */}
            <div>
              <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                Notas adicionales (Opcional)
              </label>
              <input
                type="text"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Ej: Abonó mitad en efectivo y resto transf..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Acciones del Modal */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {editingPayment && (
                  <button
                    type="button"
                    onClick={() => handleDeletePayment(editingPayment.id)}
                    className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition-colors shrink-0"
                    title="Eliminar este pago individual y revertir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submittingPayment}
                  onClick={handleSavePayment}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-700 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submittingPayment ? 'Guardando...' : editingPayment ? (amountInput <= 0 ? 'Anular Pago ($0)' : 'Actualizar Pago') : 'Guardar Pago'}
                </button>
              </div>

              {/* Botón para anular todos los pagos del mes y volver a 0 (Error humano de asignación de alumna) */}
              {(() => {
                const info = computedList.find((i) => i.student.id === targetStudent.id);
                if (!info?.paymentRecord && (!info?.allPayments || info.allPayments.length === 0)) return null;

                return (
                  <button
                    type="button"
                    onClick={() => handleResetMonthPayments(targetStudent.id, `${targetStudent.firstName} ${targetStudent.lastName}`)}
                    className="w-full py-2.5 px-3 rounded-2xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Anular todos los pagos de este mes (Volver a $0 / Impago)</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MINI MODAL 2: RESUMEN DE RECAUDACIÓN DEL MES */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Recaudación Mensual
                  </h3>
                  <span className="text-[11px] font-bold text-purple-600 block">
                    {selectedMonthLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Destacado */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-600 text-white text-center shadow-md">
              <span className="text-xs uppercase font-extrabold text-purple-200 tracking-wider block">
                Total Recolectado
              </span>
              <span className="text-3xl font-black block mt-0.5">
                ${metrics.totalCollected.toLocaleString('es-AR')}
              </span>
              <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs">
                {metrics.paidPercentage}% del estimado total
              </span>
            </div>

            {/* Desglose por Medio de Pago */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>Por Transferencia</span>
                </div>
                <span className="font-black text-purple-900 text-sm">
                  ${metrics.transferCollected.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>En Efectivo</span>
                </div>
                <span className="font-black text-slate-900 text-sm">
                  ${metrics.cashCollected.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Pendiente por cobrar</span>
                </div>
                <span className="font-black text-amber-900 text-sm">
                  ${metrics.totalPendingAmount.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSummaryModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-purple-700 text-white font-extrabold text-xs shadow-md shadow-purple-200 transition-all hover:bg-purple-800"
            >
              Cerrar Resumen
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: VISTA DE COMPROBANTE EN GRANDE */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm">Comprobante de Transferencia</h4>
              <button
                onClick={() => setViewReceiptModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <img
                src={viewReceiptModal}
                alt="Comprobante"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <button
              onClick={() => setViewReceiptModal(null)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-extrabold text-xs hover:bg-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
