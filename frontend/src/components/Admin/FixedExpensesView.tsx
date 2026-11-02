import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  FileText,
  Trash2,
  Edit2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Repeat,
  Tag,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { FixedExpense, AdminUser } from '../../types';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  replicateExpense,
  replicateMonthExpenses,
} from '../../services/api';
import { trackExpenseCreated, trackExpenseReplicated } from '../../services/analytics';

interface FixedExpensesViewProps {
  user: AdminUser;
}

const EXPENSE_CATEGORIES = [
  'Alquiler',
  'Servicios',
  'Seguros',
  'Equipamiento',
  'Mantenimiento',
  'Impuestos',
  'Honorarios',
  'Otros',
];

export const FixedExpensesView: React.FC<FixedExpensesViewProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modales
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState<boolean>(false);
  const [viewingReceipt, setViewingReceipt] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Alquiler');
  const [formNotes, setFormNotes] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formReceiptUrl, setFormReceiptUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Target month for replication
  const [replicateTargetMonth, setReplicateTargetMonth] = useState<string>(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses(selectedMonth);
      setExpenses(data);
    } catch (err: any) {
      console.error('Error al cargar gastos fijos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth]);

  // Manejo de cambio de mes con flechitas
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  // Formateador de mes
  const formatMonthNice = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    if (!y || !m) return monthStr;
    const dateObj = new Date(y, m - 1, 1);
    const formatted = dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  // Formateador de fecha
  const formatDateNice = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Totales calculados
  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const recurringCount = useMemo(() => {
    return expenses.filter((e) => e.isRecurring).length;
  }, [expenses]);

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormAmount('');
    const today = new Date().toISOString().split('T')[0];
    const defaultDate = today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`;
    setFormDate(defaultDate);
    setFormCategory('Alquiler');
    setFormNotes('');
    setFormIsRecurring(true);
    setFormReceiptUrl(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (exp: FixedExpense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormAmount(exp.amount);
    setFormDate(exp.date);
    setFormCategory(exp.category || 'Alquiler');
    setFormNotes(exp.notes || '');
    setFormIsRecurring(exp.isRecurring !== false);
    setFormReceiptUrl(exp.receiptUrl || null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Manejo de carga de archivo comprobante (Imagen o PDF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('El archivo no debe superar los 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Guardar gasto (Crear o Editar)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMessage('Por favor ingresá el nombre o motivo del gasto.');
      return;
    }
    const num = Number(formAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Por favor ingresá un monto válido mayor a 0.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      const expenseMonth = formDate.slice(0, 7);

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title: formTitle.trim(),
          amount: num,
          date: formDate,
          month: expenseMonth,
          category: formCategory,
          notes: formNotes.trim() || null,
          isRecurring: formIsRecurring,
          receiptUrl: formReceiptUrl,
        });
        showToast('Gasto fijo actualizado correctamente.');
      } else {
        await createExpense({
          title: formTitle.trim(),
          amount: num,
          date: formDate,
          month: expenseMonth,
          category: formCategory,
          notes: formNotes.trim() || null,
          isRecurring: formIsRecurring,
          receiptUrl: formReceiptUrl,
          recordedByAdminId: user.id,
        });
        trackExpenseCreated({
          title: formTitle.trim(),
          amount: num,
          category: formCategory,
          month: expenseMonth,
          isRecurring: formIsRecurring,
        });
        showToast('Nuevo gasto fijo registrado con éxito.');
      }

      setIsModalOpen(false);
      await loadExpenses();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el gasto fijo.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar gasto
  const handleDeleteExpense = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el gasto "${title}"?`)) return;

    try {
      await deleteExpense(id);
      showToast('Gasto fijo eliminado.');
      await loadExpenses();
    } catch (err: any) {
      alert('Error al eliminar gasto: ' + err.message);
    }
  };

  // Replicar gasto individual a próximo mes
  const handleReplicateSingle = async (exp: FixedExpense) => {
    const [y, m] = exp.month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const target = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    if (!window.confirm(`¿Replicar "${exp.title}" ($${exp.amount.toLocaleString('es-AR')}) al período ${formatMonthNice(target)}?`)) {
      return;
    }

    try {
      await replicateExpense(exp.id, target);
      trackExpenseReplicated({
        expenseId: exp.id,
        title: exp.title,
        amount: exp.amount,
        targetMonth: target,
      });
      showToast(`Gasto replicado con éxito a ${formatMonthNice(target)}.`);
    } catch (err: any) {
      alert('Error al replicar gasto: ' + err.message);
    }
  };

  // Replicar lote mensual
  const handleReplicateMonthBatch = async () => {
    try {
      setSaving(true);
      const res = await replicateMonthExpenses(selectedMonth, replicateTargetMonth);
      trackExpenseReplicated({
        expenseId: 'batch',
        title: 'Lote recurrente',
        amount: totalExpensesAmount,
        targetMonth: replicateTargetMonth,
      });
      showToast(res.message || 'Gastos recurrentes replicados.');
      setIsReplicateModalOpen(false);
    } catch (err: any) {
      alert('Error al replicar gastos: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notificación */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Gastos Fijos y Operativos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Control de Gastos del Estudio
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 max-w-xl font-medium">
              Administrá los egresos fijos (alquiler de gimnasio, servicios, pólizas de seguro) y replícalos mes a mes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsReplicateModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all shadow-sm"
              title="Replicar todos los gastos recurrentes a otro mes"
            >
              <Repeat className="w-4 h-4" />
              <span>Replicar Mes</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 active:scale-95 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 text-purple-700" />
              <span>Nuevo Gasto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Mes y KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Selector de Mes */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            aria-label="Mes anterior"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Período Activo
            </span>
            <span className="text-base font-black text-slate-900 block capitalize">
              {formatMonthNice(selectedMonth)}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* KPI: Total Gastos */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold text-slate-400 block tracking-wider">
              Total Egresos
            </span>
            <span className="text-2xl font-black text-rose-600 block mt-0.5">
              ${totalExpensesAmount.toLocaleString('es-AR')}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Cantidad de Gastos */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold text-slate-400 block tracking-wider">
              Registros
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {expenses.length} conceptos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Recurrentes */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold text-slate-400 block tracking-wider">
              Recurrentes
            </span>
            <span className="text-2xl font-black text-indigo-700 block mt-0.5">
              {recurringCount} mensuales
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
            <Repeat className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Lista de Gastos Fijos */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-black text-slate-900">
              Gastos de {formatMonthNice(selectedMonth)}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {expenses.length === 0
              ? 'Sin gastos cargados'
              : `${expenses.length} conceptos registrados`}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando gastos fijos...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <DollarSign className="w-12 h-12 text-slate-200 mb-3" />
            <h3 className="text-base font-bold text-slate-700">No hay gastos para este período</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Podés registrar un nuevo gasto con comprobante o replicar los gastos de meses anteriores.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                + Cargar Gasto
              </button>
              <button
                onClick={() => setIsReplicateModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs"
              >
                🔄 Replicar desde otro mes
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                        {exp.title}
                      </span>
                      {exp.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {exp.category}
                        </span>
                      )}
                      {exp.isRecurring && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          <span>Recurrente</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>Fecha: <strong>{formatDateNice(exp.date)}</strong></span>
                      {exp.notes && (
                        <span className="truncate max-w-xs text-slate-400">· {exp.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-lg font-black text-rose-600 block">
                      ${exp.amount.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {exp.receiptUrl && (
                      <button
                        onClick={() => setViewingReceipt({ url: exp.receiptUrl!, title: exp.title })}
                        className="p-2 rounded-xl text-purple-700 hover:bg-purple-50 transition-colors"
                        title="Ver Comprobante (Imagen/PDF)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleReplicateSingle(exp)}
                      className="p-2 rounded-xl text-indigo-700 hover:bg-indigo-50 transition-colors"
                      title="Replicar este gasto al mes siguiente"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(exp)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Editar gasto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteExpense(exp.id, exp.title)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nuevo / Editar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-purple-700 tracking-wider block">
                  {editingExpense ? 'Modificación' : 'Nuevo Registro'}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {editingExpense ? 'Editar Gasto Fijo' : 'Registrar Nuevo Gasto Fijo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Concepto / Motivo del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alquiler del gimnasio, Servicio de luz, Seguros"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Monto y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Monto ($ ARS) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="Ej: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Categoría
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comprobante / Recibo (Imagen o PDF) */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Adjuntar Comprobante (Imagen o PDF)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3 text-center hover:border-purple-300 transition-colors">
                  {formReceiptUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Comprobante adjuntado</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingReceipt({ url: formReceiptUrl, title: formTitle || 'Comprobante' })}
                          className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold"
                        >
                          Ver archivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormReceiptUrl(null)}
                          className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-purple-700 hover:underline block">
                        Seleccionar imagen o PDF
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        JPG, PNG o PDF (máx. 8 MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Toggle de Recurrencia */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Gasto recurrente mensual
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Permite replicar automáticamente el monto y motivo a meses futuros.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="w-5 h-5 accent-purple-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Observaciones, método de pago del gasto o número de factura..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                >
                  {saving ? 'Guardando...' : editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Replicar Lote de Mes */}
      {isReplicateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-indigo-700" />
                <h3 className="text-base font-black text-slate-900">Replicar Gastos Fijos</h3>
              </div>
              <button
                onClick={() => setIsReplicateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Esta función copiará todos los gastos recurrentes de{' '}
              <strong>{formatMonthNice(selectedMonth)}</strong> hacia el mes que elijas (ej: alquiler, seguros, mantenimiento).
            </p>

            <div>
              <label className="text-xs font-extrabold text-slate-700 block mb-1">
                Mes de Destino (YYYY-MM)
              </label>
              <input
                type="month"
                required
                value={replicateTargetMonth}
                onChange={(e) => setReplicateTargetMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsReplicateModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReplicateMonthBatch}
                disabled={saving}
                className="px-5 py-2 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 active:scale-95"
              >
                {saving ? 'Replicando...' : 'Confirmar Réplica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de Comprobante / Recibo */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900 truncate">
                Comprobante: {viewingReceipt.title}
              </span>
              <button
                onClick={() => setViewingReceipt(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-50">
              {viewingReceipt.url.startsWith('data:application/pdf') || viewingReceipt.url.endsWith('.pdf') ? (
                <iframe
                  src={viewingReceipt.url}
                  title="Comprobante PDF"
                  className="w-full h-[65vh] rounded-xl border border-slate-200"
                />
              ) : (
                <img
                  src={viewingReceipt.url}
                  alt="Comprobante"
                  className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-sm border border-slate-200"
                />
              )}
            </div>
            <div className="p-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingReceipt(null)}
                className="px-5 py-2 rounded-full bg-purple-700 text-white font-bold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
