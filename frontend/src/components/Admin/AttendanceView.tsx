import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, UserCheck, Plus, Search, X, Calendar } from 'lucide-react';
import { getTodayAttendance, saveAttendance, getStudents } from '../../services/api';
import { TodayStudentAttendance, AdminUser, Student, OFFICIAL_SHIFTS } from '../../types';

interface AttendanceViewProps {
  shift: string;
  user: AdminUser;
  onShiftChange?: (newShift: string) => void;
  onNavigateToPickups?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  shift,
  user,
  onShiftChange,
  onNavigateToPickups,
}) => {
  // Configuración de fecha por defecto (YYYY-MM-DD)
  const getTodayISO = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [data, setData] = useState<{ date: string; shift: string; todayDayName: string; students: TodayStudentAttendance[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal de Recuperatorio
  const [makeupModalOpen, setMakeupModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [searchMakeup, setSearchMakeup] = useState('');
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTodayAttendance(shift, selectedDate);
      setData(res);
    } catch (err: any) {
      setError('Error al cargar la lista de asistencia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [shift, selectedDate]);

  const handleToggleAttendance = async (
    studentId: string,
    currentStatus: 'PRESENT' | 'ABSENT' | null,
    targetStatus: 'PRESENT' | 'ABSENT',
    isMakeup: boolean = false
  ) => {
    setSavingId(studentId);
    try {
      await saveAttendance(studentId, targetStatus, user.id, selectedDate, isMakeup, shift);
      await fetchAttendance();
    } catch (err) {
      alert('Error al guardar asistencia.');
    } finally {
      setSavingId(null);
    }
  };

  const openMakeupModal = async () => {
    setMakeupModalOpen(true);
    setLoadingAllStudents(true);
    try {
      const list = await getStudents();
      setAllStudents(list);
    } catch (e) {
      alert('Error al obtener lista de alumnas para recuperatorio.');
    } finally {
      setLoadingAllStudents(false);
    }
  };

  const handleSelectMakeupStudent = async (student: Student) => {
    setMakeupModalOpen(false);
    await handleToggleAttendance(student.id, null, 'PRESENT', true);
  };

  const presentCount = data?.students.filter((s) => s.status === 'PRESENT').length || 0;
  const absentCount = data?.students.filter((s) => s.status === 'ABSENT').length || 0;
  const pendingCount = data?.students.filter((s) => !s.status).length || 0;

  const makeupStudentsList = allStudents.filter(
    (s) =>
      s.shift !== shift &&
      (s.firstName.toLowerCase().includes(searchMakeup.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchMakeup.toLowerCase()) ||
        s.dni.includes(searchMakeup))
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Banner Encabezado Mobile-First */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-sm mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Control de Asistencia VULPIARE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">Tomar Asistencia</h2>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Marcá las alumnas presentes, ausentes o agregá de recuperatorio.
            </p>
          </div>

          <button
            onClick={fetchAttendance}
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

        {/* Tarjetas Contador */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black">{presentCount}</p>
            <p className="text-[10px] sm:text-xs text-emerald-200 font-extrabold uppercase tracking-wider">Presentes</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black">{absentCount}</p>
            <p className="text-[10px] sm:text-xs text-rose-200 font-extrabold uppercase tracking-wider">Ausentes</p>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10">
            <p className="text-xl sm:text-2xl font-black">{pendingCount}</p>
            <p className="text-[10px] sm:text-xs text-amber-200 font-extrabold uppercase tracking-wider">Pendientes</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Acciones Superiores */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
          Alumnas del Turno ({data?.students.length || 0})
        </h3>

        <div className="flex items-center gap-2">
          {/* Botón Alumna de Recuperatorio */}
          <button
            onClick={openMakeupModal}
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 active:scale-95 text-purple-900 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 min-h-[38px] border border-purple-200"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            <span>Alumna Recuperatorio</span>
          </button>

          {presentCount > 0 && onNavigateToPickups && (
            <button
              onClick={onNavigateToPickups}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 min-h-[38px]"
            >
              <UserCheck className="w-4 h-4" />
              <span>Retiros ({presentCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de Alumnas */}
      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <p className="font-semibold text-xs sm:text-sm">Cargando asistencia...</p>
        </div>
      ) : data?.students.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-600 font-bold text-sm">
            No hay alumnas registradas en este turno para la fecha seleccionada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {data?.students.map((item) => {
            const { student, status, isMakeup, makeupShift } = item;
            const isSaving = savingId === student.id;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isMakeup ? 'border-purple-300 bg-purple-50/30' : 'border-slate-200'
                }`}
              >
                {/* Info Alumna */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-lg shadow-xs flex-shrink-0">
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
                      <p className="text-xs text-purple-800 font-extrabold mt-1 bg-purple-100/80 px-2.5 py-1 rounded-xl border border-purple-200">
                        🔄 La alumna recupera una clase en el turno: <span className="underline">{makeupShift || shift}</span> (Turno habitual: {student.shift})
                      </p>
                    )}
                    {student.notes && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-semibold mt-1">
                        ⚠️ {student.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de Marcación */}
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleToggleAttendance(student.id, status, 'PRESENT', !!isMakeup)}
                    disabled={isSaving}
                    className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px] active:scale-95 ${
                      status === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                        : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Presente</span>
                  </button>

                  <button
                    onClick={() => handleToggleAttendance(student.id, status, 'ABSENT', !!isMakeup)}
                    disabled={isSaving}
                    className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px] active:scale-95 ${
                      status === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 ring-2 ring-rose-600 ring-offset-2'
                        : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Ausente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar Alumna de Recuperatorio */}
      {makeupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg p-6 relative animate-fadeIn">
            <button
              onClick={() => setMakeupModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              Agregar Alumna de Recuperatorio
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Buscá una alumna de otro turno para agregarla a la asistencia de hoy en {shift}.
            </p>

            {/* Buscador */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchMakeup}
                onChange={(e) => setSearchMakeup(e.target.value)}
                placeholder="Buscar alumna por nombre o DNI..."
                className="w-full px-4 py-3 pl-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {loadingAllStudents ? (
              <p className="text-center py-6 text-xs text-slate-500 font-bold">Cargando alumnas...</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100">
                {makeupStudentsList.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400 font-semibold">
                    No se encontraron alumnas de otros turnos.
                  </p>
                ) : (
                  makeupStudentsList.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 flex items-center justify-between hover:bg-purple-50/50 transition-colors"
                    >
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {st.firstName} {st.lastName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          DNI: {st.dni} | Turno habitual: <span className="font-bold text-slate-600">{st.shift}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleSelectMakeupStudent(st)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sumar</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
