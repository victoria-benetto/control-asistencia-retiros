import React from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCw,
  ShieldCheck,
  UserCheck,
  Clock,
  X,
} from 'lucide-react';
import { Student, AttendanceRecord } from '../../types';

interface AttendanceTabProps {
  student: Student;
  sortedAttendances: AttendanceRecord[];
  formatDateNice: (dateStr: string) => string;
  onOpenMakeupModal: () => void;
  onCancelMakeup?: (id: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  student,
  sortedAttendances,
  formatDateNice,
  onOpenMakeupModal,
  onCancelMakeup,
}) => {
  return (
    <div className="space-y-4">
      {/* Encabezado y Acción */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-purple-700" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Historial de Asistencias ({sortedAttendances.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenMakeupModal}
          className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Recuperar clase</span>
        </button>
      </div>

      {sortedAttendances.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-purple-50 shadow-xs">
          <p className="text-xs font-bold text-slate-500">
            Aún no hay registros de asistencia para esta alumna.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAttendances.map((record) => {
            const isPresent = record.status === 'PRESENT';
            const isPending = record.status === 'PENDING';
            const pickup = record.pickups && record.pickups.length > 0 ? record.pickups[0] : null;

            return (
              <div
                key={record.id}
                className="p-4 rounded-3xl bg-white border border-purple-50 shadow-[0_4px_16px_-2px_rgba(30,27,38,0.04)] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm sm:text-base">
                      {formatDateNice(record.date)}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Turno: <strong>{record.makeupShift || record.shift || student.shift}</strong>
                    </p>
                  </div>

                  {isPending ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[11px] shrink-0 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Recuperatorio Agendado (Pendiente)
                    </span>
                  ) : isPresent ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Presente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[11px] shrink-0">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Ausente
                    </span>
                  )}
                </div>

                {/* Si es recuperatorio */}
                {record.isMakeup && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-purple-50/90 border border-purple-200">
                    <div>
                      <p className="text-xs text-purple-950 font-black flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-purple-700" />
                        <span>Clase de Recuperación Agendada</span>
                      </p>
                      <p className="text-[11px] text-purple-800 font-medium mt-0.5">
                        Turno: <strong>{record.makeupShift || record.shift}</strong>
                        {isPending && ' • Pendiente de marcar asistencia por la profesora'}
                      </p>
                    </div>
                    {isPending && onCancelMakeup && (
                      <button
                        type="button"
                        onClick={() => onCancelMakeup(record.id)}
                        className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black transition-all shadow-2xs active:scale-95 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar / Cambiar Fecha</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Info de registro docente */}
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                  <span>
                    Docente: <strong>{record.recordedBy?.fullName || 'Profesora a cargo'}</strong>
                  </span>
                  {record.createdAt && (
                    <span>
                      Hora:{' '}
                      <strong>
                        {new Date(record.createdAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        hs
                      </strong>
                    </span>
                  )}
                </div>

                {/* Info de retiro */}
                {pickup && (
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-0.5">
                    <p className="font-extrabold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      Retirada por {pickup.authorizedPerson.fullName} ({pickup.authorizedPerson.relationship})
                    </p>
                    <p className="text-slate-500">
                      DNI: {pickup.authorizedPerson.dni} • Hora:{' '}
                      <strong>
                        {new Date(pickup.pickupTime).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        hs
                      </strong>
                      {pickup.recordedBy?.fullName && (
                        <span> | Docente: <strong>{pickup.recordedBy.fullName}</strong></span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
