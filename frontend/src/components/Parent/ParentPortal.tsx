import React from 'react';
import { Calendar, Clock, ShieldCheck, CheckCircle2, XCircle, LogOut, UserCheck } from 'lucide-react';
import { Student, AttendanceRecord } from '../../types';

interface ParentPortalProps {
  student: Student & {
    attendances: AttendanceRecord[];
  };
  onLogout: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ student, onLogout }) => {
  // Fecha actual formateada
  const todayFormatted = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Fecha de hoy en formato YYYY-MM-DD
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Formateador de fechas para historial
  const formatDateNice = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const hasAuthorizedPeople = student.authorizedPeople && student.authorizedPeople.length > 0;

  // Buscar la asistencia del día de hoy si existe
  const todayRecord = student.attendances.find((a) => a.date === todayDateStr);
  const todayPickup = todayRecord?.pickups && todayRecord.pickups.length > 0 ? todayRecord.pickups[0] : null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-purple-100 via-pink-50 to-purple-50 p-4 sm:p-6 pb-28 sm:pb-12">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header Superior con Logo VULPIARE */}
        <header className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/60 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/vulpiare_logo.png"
              alt="Vulpiare Logo"
              className="w-12 h-12 rounded-full object-cover border border-purple-200 shadow-sm"
            />
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none tracking-wider">
                VULPIARE
              </h1>
              <p className="text-xs text-purple-700 font-bold capitalize mt-0.5">
                {todayFormatted}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-rose-50 text-purple-700 hover:text-rose-600 text-xs font-extrabold transition-all flex items-center gap-1 min-h-[40px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </header>

        {/* Tarjeta Alumna */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xl relative overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5 mb-5">
            <span className="inline-block bg-purple-100 text-purple-900 text-xs font-extrabold px-3 py-1 rounded-full w-fit">
              Turno {student.shift}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              DNI Alumna: <span className="font-mono text-slate-700 font-bold">{student.dni}</span>
            </p>
          </div>

          {/* Estado de Hoy */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Estado de la clase de hoy</span>
            </h3>

            {!todayRecord ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-slate-700 flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm text-amber-900">Asistencia aún no registrada hoy</p>
                  <p className="text-xs text-amber-700">Apenas la profesora tome la asistencia del turno ({student.shift}), se actualizará acá.</p>
                </div>
              </div>
            ) : todayRecord.status === 'ABSENT' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-base">Registrada como AUSENTE hoy</p>
                  <p className="text-xs text-rose-700">Si tenés alguna duda, comunicate con la docente.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold text-base">¡PRESENTE en clase!</p>
                      <p className="text-xs text-emerald-700 font-medium">
                        Horario del turno: <strong>{student.shift}</strong>
                        {todayRecord.createdAt && (
                          <span className="block text-[11px] text-emerald-800 font-semibold mt-0.5">
                            Hora registrada: {new Date(todayRecord.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        )}
                        <span className="block text-[11px] text-emerald-800 font-semibold">
                          Docente a cargo: <strong>{todayRecord.recordedBy?.fullName || 'Profesora'}</strong>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info de Retiro de Hoy */}
                {todayPickup ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-pink-100">
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Retiro Confirmado</span>
                    </div>

                    <div>
                      <p className="text-lg sm:text-xl font-black">
                        Retirada por: {todayPickup.authorizedPerson.fullName}
                      </p>
                      <p className="text-xs text-pink-100">
                        Vínculo: <strong>{todayPickup.authorizedPerson.relationship}</strong> (DNI: {todayPickup.authorizedPerson.dni})
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/20 flex flex-col gap-1.5 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-pink-200" />
                        <span>Hora de retiro: <strong>{new Date(todayPickup.pickupTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong></span>
                      </div>

                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-pink-200" />
                        <span>Registrado por docente: <strong>{todayPickup.recordedBy?.fullName || 'Profesora a cargo'}</strong></span>
                      </div>
                    </div>
                  </div>
                ) : hasAuthorizedPeople ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-xs">En la clase (Aún no fue retirada)</p>
                      <p className="text-[11px] text-amber-700">Cuando sea retirada por la persona autorizada, aparecerá el horario y la docente que lo registró.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-xs">Presente y listo</p>
                      <p className="text-[11px] text-emerald-700">No requiere persona a cargo para retiro.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historial Completo */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Historial de Clases Anteriores
            </h3>

            {student.attendances.length === 0 ? (
              <p className="text-xs text-slate-400">Aún no hay registros en el historial.</p>
            ) : (
              <div className="space-y-2.5">
                {student.attendances.map((rec) => {
                  const pickup = rec.pickups && rec.pickups.length > 0 ? rec.pickups[0] : null;

                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs">
                            📅 {formatDateNice(rec.date)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Turno: {student.shift}
                          </span>
                        </div>

                        <span
                          className={`font-extrabold px-2.5 py-1 rounded-full text-[11px] flex-shrink-0 ${
                            rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status === 'PRESENT'
                            ? !hasAuthorizedPeople && !pickup
                              ? 'Presente y listo'
                              : 'Presente'
                            : 'Ausente'}
                        </span>
                      </div>

                      {rec.status === 'PRESENT' && rec.createdAt && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Hora de asistencia registrada: <strong>{new Date(rec.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong>
                        </p>
                      )}

                      {pickup && (
                        <div className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 space-y-0.5 mt-1">
                          <p className="font-bold text-slate-900">
                            Retirada por: {pickup.authorizedPerson.fullName} ({pickup.authorizedPerson.relationship})
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Hora de retiro: <strong>{new Date(pickup.pickupTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong> | Docente: <strong>{pickup.recordedBy?.fullName || 'Profesora'}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
