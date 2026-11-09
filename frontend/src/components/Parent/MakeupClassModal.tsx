import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';
import { Student, AttendanceRecord, OFFICIAL_SHIFTS } from '../../types';
import { requestMakeupClass } from '../../services/api';
import { studentAttendsShift } from '../../utils/plans';

interface MakeupClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student & { attendances?: AttendanceRecord[] };
  onSuccess: (newRecord: AttendanceRecord) => void;
}

export const MakeupClassModal: React.FC<MakeupClassModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  if (!isOpen) return null;

  // Filtrar o sugerir turnos diferentes al turno habitual de la alumna
  const otherShifts = OFFICIAL_SHIFTS.filter((s) => s !== student.shift);
  const initialShift = otherShifts.length > 0 ? otherShifts[0] : OFFICIAL_SHIFTS[0];

  const [selectedShift, setSelectedShift] = useState<string>(initialShift);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔒 REGLA: Si ya tiene una clase de recuperación agendada, o no tiene ausencias disponibles, prohibir agendar otra
  const pendingMakeup = (student.attendances || []).find((a) => a.isMakeup && a.status === 'PENDING');
  const hasPendingMakeup = Boolean(pendingMakeup);

  // 🔒 REGLA: Las ausencias rigen a partir de noviembre y se renuevan mes a mes (no acumulativas)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const eligibleAbsences = useMemo(() => {
    return (student.attendances || []).filter(
      (a) => a.status === 'ABSENT' && !a.isMakeup && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
  }, [student.attendances, currentMonthStr]);

  const completedMakeups = useMemo(() => {
    return (student.attendances || []).filter(
      (a) => a.isMakeup && a.status === 'PRESENT' && a.date.startsWith(currentMonthStr) && a.date >= '2026-11-01'
    );
  }, [student.attendances, currentMonthStr]);

  const remainingToRecover = Math.max(0, eligibleAbsences.length - completedMakeups.length - (hasPendingMakeup ? 1 : 0));

  // Calcular días de la semana según el turno seleccionado
  const shiftDaysOfWeek = useMemo(() => {
    const s = selectedShift.toLowerCase();
    if (s.includes('martes') || s.includes('jueves')) {
      return [2, 4]; // Martes (2) y Jueves (4)
    }
    if (s.includes('viernes')) {
      return [1, 3, 5]; // Lunes (1), Miércoles (3) y Viernes (5)
    }
    if (s.includes('lunes') && s.includes('miércoles')) {
      return [1, 3]; // Lunes (1) y Miércoles (3)
    }
    return [1, 3];
  }, [selectedShift]);

  // Generar opciones de fechas válidas para el mes actual excluyendo los días habituales de la alumna
  const availableDates = useMemo(() => {
    const dates: { dateStr: string; label: string }[] = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Empezar desde el día actual para adelante
    const startDay = now.getDate();

    for (let day = startDay; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      if (shiftDaysOfWeek.includes(dateObj.getDay())) {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        // Solo permitir si NO es un día habitual de clase para la alumna
        if (!studentAttendsShift(student, selectedShift, dateStr)) {
          const label = dateObj.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });
          const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
          dates.push({ dateStr, label: formattedLabel });
        }
      }
    }

    // Si no quedan fechas en lo que resta del mes, ofrecer los primeros días del mes siguiente
    if (dates.length === 0) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const normalizedMonth = nextMonth % 12;
      for (let day = 1; day <= 15; day++) {
        const dateObj = new Date(nextYear, normalizedMonth, day);
        if (shiftDaysOfWeek.includes(dateObj.getDay())) {
          const monthStr = String(normalizedMonth + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateStr = `${nextYear}-${monthStr}-${dayStr}`;

          if (!studentAttendsShift(student, selectedShift, dateStr)) {
            const label = dateObj.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            dates.push({ dateStr, label: formattedLabel });
          }
        }
      }
    }

    return dates;
  }, [shiftDaysOfWeek, selectedShift, student]);

  // Auto-seleccionar la primera fecha disponible cuando cambian las fechas
  React.useEffect(() => {
    if (availableDates.length > 0 && (!selectedDate || !availableDates.some((d) => d.dateStr === selectedDate))) {
      setSelectedDate(availableDates[0].dateStr);
    }
  }, [availableDates, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPendingMakeup) {
      setError('Ya tenés una clase de recuperación agendada. Cancelala primero para cambiar la fecha.');
      return;
    }
    if (!selectedShift || !selectedDate) {
      setError('Por favor seleccioná un horario y una fecha.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const record = await requestMakeupClass(student.id, selectedDate, selectedShift);
      onSuccess(record);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al agendar la clase de recuperación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[92vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <RotateCw className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Recuperar una clase
              </h3>
              <p className="text-[11px] text-purple-700 font-bold">
                Agendá tu clase en otro turno disponible
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {hasPendingMakeup && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold space-y-1">
            <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
              ⚠️ Ya tenés un recuperatorio agendado
            </p>
            <p className="text-[11px] text-amber-800 font-medium">
              Turno: <strong>{pendingMakeup?.makeupShift || pendingMakeup?.shift}</strong> • Fecha: <strong>{pendingMakeup?.date}</strong>.
              <br />
              Solo podés tener 1 clase para recuperar agendada a la vez. Si te equivocaste de fecha, cancelala desde tu inicio para elegir otra.
            </p>
          </div>
        )}

        {remainingToRecover === 0 && !hasPendingMakeup && (
          <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold space-y-1">
            <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
              ⚠️ Sin ausencias pendientes en el mes
            </p>
            <p className="text-[11px] text-amber-800 font-medium">
              A partir de noviembre, las ausencias se renuevan mensualmente y no son acumulativas.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Paso 1: ¿A qué horario vas a asistir? */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Paso 1: ¿A qué horario vas a asistir?
            </label>
            <div className="grid grid-cols-1 gap-2">
              {OFFICIAL_SHIFTS.map((sh) => {
                const isSelected = selectedShift === sh;
                const isHabitual = student.shift === sh;

                return (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => setSelectedShift(sh)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 active:scale-98 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-600 shadow-xs'
                        : 'border-slate-200 hover:border-purple-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs font-extrabold ${isSelected ? 'text-purple-950 font-black' : 'text-slate-800'}`}>
                        {sh}
                      </p>
                      {isHabitual && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full inline-block mt-1">
                          Tu turno habitual
                        </span>
                      )}
                    </div>

                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-purple-600 text-white' : 'border border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paso 2: ¿Qué día vas a ir? */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              Paso 2: ¿Qué día vas a ir?
            </label>
            <div className="relative">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-3 pl-10 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-xs min-h-[44px]"
              >
                {availableDates.map((d) => (
                  <option key={d.dateStr} value={d.dateStr}>
                    {d.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-1">
              Solo se muestran los días hábiles que coinciden con el horario elegido.
            </p>
          </div>

          {/* Aviso Claro */}
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-[11px] uppercase tracking-wider text-purple-800">
              <AlertCircle className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Aviso Importante</span>
            </div>
            <p className="leading-relaxed">
              Al confirmar, la profesora verá a <strong>{student.firstName} {student.lastName}</strong> en su lista de asistencia con la etiqueta <strong>RECUPERATORIO</strong>.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all min-h-[42px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedShift || !selectedDate || hasPendingMakeup || remainingToRecover === 0}
              className="px-5 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md shadow-purple-200 transition-all disabled:opacity-40 flex items-center gap-2 min-h-[42px] active:scale-98"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar clase</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
