import React, { useState, useEffect } from 'react';
import { UserCheck, Clock, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Calendar, Search, X, UserPlus } from 'lucide-react';
import { getTodayAttendance, savePickup } from '../../services/api';
import { TodayStudentAttendance, AdminUser, OFFICIAL_SHIFTS, Student } from '../../types';

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

  // Modal para registrar retiro con "Otro" adulto
  const [otherModalData, setOtherModalData] = useState<{ attendanceId: string; student: Student } | null>(null);
  const [otherFullName, setOtherFullName] = useState('');
  const [otherRelationship, setOtherRelationship] = useState('');
  const [otherDni, setOtherDni] = useState('');
  const [otherPhone, setOtherPhone] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  const openOtherModal = (attendanceId: string, student: Student) => {
    setOtherModalData({ attendanceId, student });
    setOtherFullName('');
    setOtherRelationship('');
    setOtherDni('');
    setOtherPhone('');
    setOtherNotes('');
  };

  const closeOtherModal = () => {
    if (otherModalData && selectedPersonMap[otherModalData.attendanceId] === 'OTHER') {
      setSelectedPersonMap((prev) => ({ ...prev, [otherModalData.attendanceId]: '' }));
    }
    setOtherModalData(null);
    setOtherFullName('');
    setOtherRelationship('');
    setOtherDni('');
    setOtherPhone('');
    setOtherNotes('');
  };

  const handleSubmitOtherPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherModalData) return;

    if (!otherFullName.trim()) {
      alert('Por favor ingresá el nombre y apellido del adulto que retira.');
      return;
    }
    if (!otherRelationship.trim()) {
      alert('Por favor indicá el vínculo o parentesco con la alumna (ej: Tía, Abuela, etc.).');
      return;
    }

    setSavingId(otherModalData.attendanceId);
    try {
      await savePickup({
        attendanceId: otherModalData.attendanceId,
        newAuthorizedPerson: {
          fullName: otherFullName.trim(),
          relationship: otherRelationship.trim(),
          dni: otherDni.trim() || undefined,
          phone: otherPhone.trim() || undefined,
        },
        notes: otherNotes.trim() || undefined,
        recordedByAdminId: user.id,
      });
      closeOtherModal();
      await fetchPresentStudents();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el retiro con otro adulto.');
    } finally {
      setSavingId(null);
    }
  };

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
      const dni = item.student.dni;
      const q = search.trim().toLowerCase();
      return fullName.includes(q) || dni.includes(q);
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

        {/* CONTROLES MOBILE-FIRST (De arriba a abajo: Lupita -> Fecha -> Turno -> Filtrar) */}
        <div className="space-y-3 pt-2 border-t border-white/20">
          {/* Lupita de Búsqueda */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mb-1">
              Buscar Alumna Presente
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar alumna presente por nombre o DNI..."
                className="w-full px-3.5 py-2.5 pl-10 rounded-2xl bg-white text-slate-900 text-xs font-bold focus:outline-none shadow-sm min-h-[42px]"
              />
              <Search className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Selección Fecha & Selección Turno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mb-1">
                Fecha
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
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mb-1">
                Turno
              </label>
              <select
                value={shift}
                onChange={(e) => onShiftChange && onShiftChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-bold focus:outline-none shadow-sm cursor-pointer min-h-[42px]"
              >
                {OFFICIAL_SHIFTS.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4️⃣ Parte de Filtrar (Filtros por Estado de Retiro) */}
          <div className="pt-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mb-1.5">
              4. Parte de Filtrar
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPickupFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                  pickupFilter === 'ALL'
                    ? 'bg-white text-purple-950 font-black shadow-xs'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Todas ({allPresentCount})
              </button>
              <button
                onClick={() => setPickupFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 active:scale-95 ${
                  pickupFilter === 'PENDING'
                    ? 'bg-amber-500 text-white font-black shadow-xs'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>En clase ({pendingCount})</span>
              </button>
              <button
                onClick={() => setPickupFilter('PICKED_UP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 active:scale-95 ${
                  pickupFilter === 'PICKED_UP'
                    ? 'bg-emerald-500 text-white font-black shadow-xs'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Retiradas ({pickedUpCount})</span>
              </button>
            </div>
          </div>
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

                  {/* Mensaje o botón si no tiene autorizados precargados */}
                  {!hasPickup && !hasAuthorizedPeople && (
                    <div className="space-y-2 mt-2">
                      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Sin autorizados precargados en el sistema.</span>
                      </div>
                      {attendanceId && (
                        <button
                          type="button"
                          onClick={() => openOtherModal(attendanceId, student)}
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-purple-700" />
                          <span>Registrar retiro con otro adulto</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Selección de Persona Autorizada */}
                  {attendanceId && (hasAuthorizedPeople || hasPickup) && (
                    <div className="space-y-2 mt-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        {hasPickup ? 'Registrar otro retiro / acompañante:' : 'Seleccionar persona autorizada:'}
                      </label>

                      <select
                        value={selectedPersonMap[attendanceId] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'OTHER') {
                            openOtherModal(attendanceId, student);
                          } else {
                            setSelectedPersonMap((prev) => ({ ...prev, [attendanceId]: val }));
                          }
                        }}
                        className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                      >
                        <option value="">-- Seleccionar Autorizado --</option>
                        {student.authorizedPeople?.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.fullName} - {person.relationship} (DNI: {person.dni})
                          </option>
                        ))}
                        <option value="OTHER" className="font-extrabold text-purple-700">
                          ➕ Otro adulto (ingresar datos)...
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Botón Confirmar Retiro Touch Friendly */}
                {attendanceId && (hasAuthorizedPeople || hasPickup) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPersonMap[attendanceId] === 'OTHER') {
                        openOtherModal(attendanceId, student);
                      } else {
                        handleRegisterPickup(attendanceId);
                      }
                    }}
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
      {/* MODAL PARA RETIRO CON "OTRO" ADULTO */}
      {otherModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Registrar Retiro
                  </h3>
                  <p className="text-[11px] text-purple-700 font-bold">
                    Otro adulto responsable
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeOtherModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Datos de la Alumna */}
            <div className="mt-3 p-3 rounded-2xl bg-purple-50/80 border border-purple-100 text-xs">
              <p className="text-slate-500 font-semibold">Alumna a retirar:</p>
              <p className="text-sm font-black text-purple-950">
                {otherModalData.student.firstName} {otherModalData.student.lastName}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                DNI: <span className="font-mono font-bold text-slate-800">{otherModalData.student.dni}</span> | Turno: <strong>{otherModalData.student.shift}</strong>
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitOtherPickup} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nombre y Apellido del Adulto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={otherFullName}
                  onChange={(e) => setOtherFullName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Vínculo / Relación con la Alumna <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={otherRelationship}
                  onChange={(e) => setOtherRelationship(e.target.value)}
                  placeholder="Ej: Tía, Abuela, Hermano/a mayor, Vecina..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[42px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    DNI (Opcional)
                  </label>
                  <input
                    type="text"
                    value={otherDni}
                    onChange={(e) => setOtherDni(e.target.value)}
                    placeholder="Ej: 32456789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[42px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={otherPhone}
                    onChange={(e) => setOtherPhone(e.target.value)}
                    placeholder="Ej: 11 2345-6789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[42px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  placeholder="Ej: Avisó la madre por WhatsApp previamente"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[42px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeOtherModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingId === otherModalData.attendanceId || !otherFullName.trim() || !otherRelationship.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-xs shadow-md transition-all disabled:opacity-40 flex items-center gap-2 min-h-[42px] active:scale-98"
                >
                  {savingId === otherModalData.attendanceId ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Confirmar Retiro</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
