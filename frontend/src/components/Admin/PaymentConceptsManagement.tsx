import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Tag,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  getPaymentConcepts,
  createPaymentConcept,
  updatePaymentConcept,
  deletePaymentConcept,
} from '../../services/api';
import { AdminUser, PaymentConcept } from '../../types';
import { ConfirmModal, ToastNotification } from '../Common/ConfirmModal';

interface PaymentConceptsManagementProps {
  user: AdminUser;
}

export const PaymentConceptsManagement: React.FC<PaymentConceptsManagementProps> = ({ user }) => {
  const [concepts, setConcepts] = useState<PaymentConcept[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal para Crear / Editar Concepto
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingConcept, setEditingConcept] = useState<PaymentConcept | null>(null);
  const [name, setName] = useState<string>('');
  const [amount, setAmount] = useState<number>(22000);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal estilizado de confirmación y toast Vulpiare
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    note?: string | React.ReactNode;
    confirmText?: string;
    variant?: 'danger' | 'purple';
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const data = await getPaymentConcepts();
      setConcepts(data);
    } catch (err) {
      console.error('Error al cargar conceptos de pago:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, []);

  const openCreateModal = () => {
    setEditingConcept(null);
    setName('');
    setAmount(22000);
    setDescription('');
    setModalOpen(true);
  };

  const openEditModal = (concept: PaymentConcept) => {
    setEditingConcept(concept);
    setName(concept.name);
    setAmount(concept.amount);
    setDescription(concept.description || '');
    setModalOpen(true);
  };

  const handleSaveConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount < 0) {
      setToast({ message: 'Por favor ingresá un nombre y un monto válido.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingConcept) {
        await updatePaymentConcept(editingConcept.id, {
          name: name.trim(),
          amount,
          description: description.trim() || undefined,
        });
      } else {
        await createPaymentConcept({
          name: name.trim(),
          amount,
          description: description.trim() || undefined,
        });
      }
      setModalOpen(false);
      await fetchConcepts();
    } catch (err: any) {
      setToast({ message: 'Error al guardar concepto: ' + (err.message || 'Error desconocido'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConcept = (id: string, conceptName: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar este concepto de pago?',
      message: `¿Deseas eliminar el concepto "${conceptName}"?`,
      note: '💡 Ya no aparecerá como opción al registrar nuevos pagos en el sistema.',
      confirmText: 'Sí, eliminar concepto',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePaymentConcept(id);
          setConfirmModal(null);
          await fetchConcepts();
          setToast({ message: 'Concepto eliminado correctamente.', type: 'success' });
        } catch (err: any) {
          setConfirmModal(null);
          setToast({ message: 'Error al eliminar concepto: ' + (err.message || 'Error desconocido'), type: 'error' });
        }
      },
    });
  };

  return (
    <div className="flex flex-col space-y-5 pb-24 max-w-4xl mx-auto">
      {/* Banner Superior */}
      <div className="rounded-3xl bg-purple-900 border border-purple-800/80 p-6 sm:p-7 shadow-lg text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md shadow-sm mb-2">
              <Tag className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                ABM Conceptos de Pago & Aranceles
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestión de Conceptos de Pago
            </h2>
            <p className="text-xs sm:text-sm text-purple-100 mt-1 font-medium max-w-md">
              Configurá los tipos de cuotas, matrículas y clases con sus montos sugeridos para el registro rápido de pagos.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-purple-900 font-extrabold text-xs shadow-md hover:bg-purple-50 active:scale-95 transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            <span>+ Nuevo Concepto</span>
          </button>
        </div>
      </div>

      {/* Listado de Conceptos */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Cargando conceptos de pago...
          </p>
        </div>
      ) : concepts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-700">No hay conceptos de pago creados</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Creá conceptos como Cuota Mensual, Matrícula o Pase Libre para seleccionarlos al registrar pagos.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 text-white font-extrabold text-xs"
          >
            + Crear Primer Concepto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 hover:border-amber-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                      <CreditCard className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {concept.name}
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        Activo para cobro
                      </span>
                    </div>
                  </div>

                  <span className="text-lg font-black text-slate-900">
                    ${concept.amount.toLocaleString('es-AR')}
                  </span>
                </div>

                {concept.description && (
                  <p className="text-xs text-slate-500 mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {concept.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(concept)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDeleteConcept(concept.id, concept.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Concepto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block">
                  {editingConcept ? 'Editar Concepto' : 'Nuevo Concepto de Pago'}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {editingConcept ? editingConcept.name : 'Configurar Arancel'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConcept} className="space-y-3.5">
              <div>
                <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                  Nombre del Concepto
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Cuota Octubre 2026, Matrícula Anual..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                  Monto Esperado ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase text-slate-500 block mb-1">
                  Descripción / Detalle (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Incluye 2 clases semanales de tela y aro"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Concepto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal estilizado de confirmación */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          note={confirmModal.note}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
          isLoading={confirmModal.isLoading}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Toast de notificación flotante */}
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
