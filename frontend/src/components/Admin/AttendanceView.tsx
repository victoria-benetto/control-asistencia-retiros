import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, UserCheck } from 'lucide-react';
import { getTodayAttendance, saveAttendance } from '../../services/api';
import { TodayStudentAttendance, AdminUser } from '../../types';

interface AttendanceViewProps {
  shift: string;
  user: AdminUser;
  onNavigateToPickups?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ shift, user, onNavigateToPickups }) => {
  const [data, setData] = useState<{ date: string; shift: string; todayDayName: string; students: TodayStudentAttendance[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTodayAttendance(shift);
      setData(res);
    } catch (err: any) {
      setError('Error al cargar la lista de asistencia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [shift]);

  const handleToggleAttendance = async (studentId: string, currentStatus: 'PRESENT' | 'ABSENT' | null, targetStatus: 'PRESENT' | 'ABSENT') => {
    setSavingId(studentId);
    try {
      await saveAttendance(studentId, targetStatus, user.id);
      await fetchAttendance();
    } catch (err) {
      alert('Error al guardar asistencia.');
    } finally {
      setSavingId(null);
    }
  };

  const presentCount = data?.students.filter(s => s.status === 'PRESENT').length || 0;
  const absentCount = data?.students.filter(s => s.status === 'ABSENT').length || 0;
  const pendingCount = data?.students.filter(s => !s.status).length || 0;

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mb-2" />
        <p className="font-semibold text-xs sm:text-sm">Cargando lista de VULPIARE...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Banner Encabezado Mobile-First */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-sm mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Fecha del día de hoy</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">Asistencia - Turno {shift}</h2>
            <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
              Marcá las alumnas presentes y ausentes para la clase de hoy.
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

        {/* Tarjetas Contador */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
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

      {/* Lista de Alumnas (Mobile Cards) */}
      {data?.students.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
          <p className="text-slate-600 font-bold text-sm">
            No hay alumnas en el <strong>Turno {shift}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
              Alumnas ({data?.students.length})
            </h3>
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

          <div className="grid grid-cols-1 gap-3">
            {data?.students.map((item) => {
              const { student, status } = item;
              const isSaving = savingId === student.id;

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Info Alumna */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-lg shadow-xs flex-shrink-0">
                      {student.firstName[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-tight">
                        {student.firstName} {student.lastName}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        DNI: <span className="font-mono text-slate-700 font-bold">{student.dni}</span>
                      </p>
                      {student.notes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block font-semibold mt-1">
                          ⚠️ {student.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones Grandes de Marcación para Celular (Min 48px height) */}
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleToggleAttendance(student.id, status, 'PRESENT')}
                      disabled={isSaving}
                      className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px] active:scale-95 ${
                        status === 'PRESENT'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                          : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{status === 'PRESENT' ? 'Presente' : 'Presente'}</span>
                    </button>

                    <button
                      onClick={() => handleToggleAttendance(student.id, status, 'ABSENT')}
                      disabled={isSaving}
                      className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all min-h-[48px] active:scale-95 ${
                        status === 'ABSENT'
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 ring-2 ring-rose-600 ring-offset-2'
                          : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-800'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{status === 'ABSENT' ? 'Ausente' : 'Ausente'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
