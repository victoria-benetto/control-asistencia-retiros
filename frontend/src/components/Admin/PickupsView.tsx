import React, { useState, useEffect } from 'react';
import { UserCheck, Clock, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { getTodayAttendance, savePickup } from '../../services/api';
import { TodayStudentAttendance, AdminUser, OFFICIAL_SHIFTS } from '../../types';

interface PickupsViewProps {
  shift: string;
  user: AdminUser;
  onShiftChange?: (newShift: string) => void;
}

export const PickupsView: React.FC<PickupsViewProps> = ({ shift, user, onShiftChange }) => {
  const getTodayISO = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [data, setData] = useState<{ date: string; shift: string; students: TodayStudentAttendance[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPersonMap, setSelectedPersonMap] = useState<{ [attendanceId: string]: string }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pickupFilter, setPickupFilter] = useState<'ALL' | 'PENDING' | 'PICKED_UP' | 'NO_AUTHORIZED'>('ALL');

  const fetchPresentStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTodayAttendance(shift, selectedDate);
      // Filtrar únicamente alumnas presentes
      const presentOnly = res.students.filter((s) => s.status === 'PRESENT');
      setData({ ...res, students: presentOnly });
    } catch (err) {
      setError('Error al cargar retiros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentStudents();
  }, [shift, selectedDate]);

  const allPresentCount = data?.students.length || 0;
  const pendingCount = data?.students.filter((item) => (!item.pickups || item.pickups.length === 0) && item.student.authorizedPeople && item.student.authorizedPeople.length > 0).length || 0;
  const pickedUpCount = data?.students.filter((item) => item.pickups && item.pickups.length > 0).length || 0;
  const noAuthCount = data?.students.filter((item) => (!item.pickups || item.pickups.length === 0) && (!item.student.authorizedPeople || item.student.authorizedPeople.length === 0)).length || 0;

  const filteredStudents = data?.students.filter((item) => {
    const hasPickup = item.pickups && item.pickups.length > 0;
    const hasAuthorized = item.student.authorizedPeople && item.student.authorizedPeople.length > 0;

    if (pickupFilter === 'PENDING' && (hasPickup || !hasAuthorized)) return false;
    if (pickupFilter === 'PICKED_UP' && !hasPickup) return false;
    if (pickupFilter === 'NO_AUTHORIZED' && (hasPickup || hasAuthorized)) return false;

    if (search.trim()) {
      const fullName = `${item.student.firstName} ${item.student.lastName}`.toLowerCase();
      return fullName.includes(search.trim().toLowerCase());
    }

    return true;
  }) || [];

  const handleRegisterPickup = async (attendanceId: string) => {
    const authorizedPersonId = selectedPersonMap[attendanceId];
    if (!authorizedPersonId) {
      alert('Por favor seleccioná quién retira a la alumna.');
      return;
    }

    setSavingId(attendanceId);
    try {
      await savePickup({
        attendanceId,
        authorizedPersonId,
        recordedByAdminId: user.id,
      });
      await fetchPresentStudents();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el retiro.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <p className="font-semibold text-xs sm:text-sm">Cargando alumnas presentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Banner Encabezado Mobile */}
      <div className="bg-gradient-to-r from-purple-700 to-pink-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-sm mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Control de Retiros VULPIARE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">Control de Retiros</h2>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Alumnas presentes en la fecha seleccionada ({allPresentCount})
            </p>
          </div>

          <button
            onClick={fetchPresentStudents}
            className="self-start sm:self-center px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Seleccionador de Fecha y Turno */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/20">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-200 mb-1">
              Seleccionar Fecha
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 pl-10 rounded-2xl bg-white text-slate-900 text-xs font-bold focus:outline-none shadow-sm min-h-[42px]"
              />
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-200 mb-1">
              Seleccionar Turno
            </label>
            <select
              value={shift}
              onChange={(e) => onShiftChange && onShiftChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-bold focus:outline-none shadow-sm min-h-[42px]"
            >
              {OFFICIAL_SHIFTS.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Rápida por Estado y Buscador */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        {/* Buscador de Alumnas Presentes */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumna presente por nombre..."
            className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Píldoras de Filtro Rápido */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Filtrar:</span>
          <button
            onClick={() => setPickupFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
              pickupFilter === 'ALL'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({allPresentCount})
          </button>
          <button
            onClick={() => setPickupFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 active:scale-95 ${
              pickupFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>En clase ({pendingCount})</span>
          </button>
          <button
            onClick={() => setPickupFilter('PICKED_UP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 active:scale-95 ${
              pickupFilter === 'PICKED_UP'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ya Retiradas ({pickedUpCount})</span>
          </button>
          <button
            onClick={() => setPickupFilter('NO_AUTHORIZED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 active:scale-95 ${
              pickupFilter === 'NO_AUTHORIZED'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Presente y Listo ({noAuthCount})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Si no hay presentes */}
      {data?.students.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">No hay alumnas marcadas como Presentes</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Primero andá a <strong>"Asistencia"</strong> y marcá Presentes a las alumnas que asistieron.
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-500 font-bold text-xs sm:text-sm">
            No hay alumnas que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredStudents.map((item) => {
            const { student, attendanceId, pickups, isMakeup, makeupShift } = item;
            const hasPickup = pickups && pickups.length > 0;
            const lastPickup = hasPickup ? pickups[pickups.length - 1] : null;
            const hasAuthorizedPeople = student.authorizedPeople && student.authorizedPeople.length > 0;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-3xl p-4 sm:p-6 border shadow-xs transition-all flex flex-col justify-between ${
                  hasPickup ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Encabezado Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 text-purple-900 font-black text-lg flex items-center justify-center shadow-xs flex-shrink-0">
                        {student.firstName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-base leading-tight">
                            {student.firstName} {student.lastName}
                          </h4>
                          {isMakeup && (
                            <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Recuperatorio
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          DNI: <span className="font-mono text-slate-700 font-bold">{student.dni}</span>
                        </p>
                        {isMakeup && (
                          <p className="text-[11px] text-purple-800 font-extrabold mt-1 bg-purple-100/80 px-2 py-0.5 rounded-lg border border-purple-200">
                            🔄 La alumna recupera una clase en el turno: <span className="underline">{makeupShift || shift}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {hasPickup ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Retirada
                      </span>
                    ) : hasAuthorizedPeople ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        En clase
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Presente y listo
                      </span>
                    )}
                  </div>

                  {/* Detalle si ya fue retirada */}
                  {hasPickup && lastPickup && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 mb-3 text-xs space-y-1">
                      <p className="font-extrabold text-emerald-900 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Retirada por {lastPickup.authorizedPerson.fullName}
                      </p>
                      <p className="text-slate-600">
                        Vínculo: <strong>{lastPickup.authorizedPerson.relationship}</strong> (DNI: {lastPickup.authorizedPerson.dni})
                      </p>
                      <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                        <span>Hora: <strong>{new Date(lastPickup.pickupTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong></span>
                        <span>Docente: <strong>{lastPickup.recordedBy?.fullName || 'Profe'}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Mensaje de Presente y listo si no tiene autorizados */}
                  {!hasPickup && !hasAuthorizedPeople && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center gap-2 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Presente y lista. No tiene personas a cargo para retirar.</span>
                    </div>
                  )}

                  {/* Selección de Persona Autorizada */}
                  {attendanceId && hasAuthorizedPeople && (
                    <div className="space-y-2 mt-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        {hasPickup ? 'Registrar otro retiro / acompañante:' : 'Seleccionar persona autorizada:'}
                      </label>

                      <select
                        value={selectedPersonMap[attendanceId] || ''}
                        onChange={(e) =>
                          setSelectedPersonMap({ ...selectedPersonMap, [attendanceId]: e.target.value })
                        }
                        className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                      >
                        <option value="">-- Seleccionar Autorizado --</option>
                        {student.authorizedPeople.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName} - {person.relationship} (DNI: {person.dni})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Botón Confirmar Retiro Touch Friendly */}
                {attendanceId && hasAuthorizedPeople && (
                  <button
                    onClick={() => handleRegisterPickup(attendanceId)}
                    disabled={savingId === attendanceId || !selectedPersonMap[attendanceId]}
                    className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2 min-h-[48px] active:scale-98"
                  >
                    {savingId === attendanceId ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Confirmar Retiro (Guardar Hora)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
