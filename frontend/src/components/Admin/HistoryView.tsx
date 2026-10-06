import React, { useState, useEffect } from 'react';
import { History, Calendar, CheckCircle2, XCircle, ShieldCheck, Search, RefreshCw, Clock, Layers } from 'lucide-react';
import { getAttendanceHistory } from '../../services/api';
import { AttendanceRecord, OFFICIAL_SHIFTS } from '../../types';

interface HistoryViewProps {
  shift: string;
  onShiftChange?: (newShift: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ shift: initialShift, onShiftChange }) => {
  // Fecha actual en formato YYYY-MM-DD
  const getTodayISO = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [selectedShift, setSelectedShift] = useState<string>(initialShift || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const data = await getAttendanceHistory(
        selectedDate || undefined,
        selectedShift === 'ALL' ? undefined : selectedShift
      );
      setRecords(data);
    } catch (err) {
      alert('Error al consultar historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [selectedShift, selectedDate]);

  const handleShiftSelect = (newShift: string) => {
    setSelectedShift(newShift);
    if (onShiftChange && newShift !== 'ALL') {
      onShiftChange(newShift);
    }
  };

  // 1. Filtrado General (búsqueda y estado)
  const filteredRecords = records.filter((r) => {
    if (!r.student) return false;

    if (statusFilter === 'PRESENT' && r.status !== 'PRESENT') return false;
    if (statusFilter === 'ABSENT' && r.status !== 'ABSENT') return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    const fullName = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
    const dni = r.student.dni;
    return fullName.includes(q) || dni.includes(q);
  });

  const presentCount = filteredRecords.filter((r) => r.status === 'PRESENT').length;
  const absentCount = filteredRecords.filter((r) => r.status === 'ABSENT').length;

  // 2. Agrupación por Turno (Divs / Secciones para cada turno)
  const groupedByShift: Record<string, AttendanceRecord[]> = {};

  filteredRecords.forEach((rec) => {
    const recordShift = rec.isMakeup && rec.makeupShift ? rec.makeupShift : (rec.student?.shift || 'Sin Turno Asignado');
    if (!groupedByShift[recordShift]) {
      groupedByShift[recordShift] = [];
    }
    groupedByShift[recordShift].push(rec);
  });

  // Ordenar alumnas alfabéticamente dentro de cada turno por Apellido y Nombre
  Object.keys(groupedByShift).forEach((shiftKey) => {
    groupedByShift[shiftKey].sort((a, b) => {
      const nameA = `${a.student?.lastName || ''} ${a.student?.firstName || ''}`.toLowerCase();
      const nameB = `${b.student?.lastName || ''} ${b.student?.firstName || ''}`.toLowerCase();
      return nameA.localeCompare(nameB, 'es');
    });
  });

  // Ordenar la lista de turnos (respetando OFFICIAL_SHIFTS primero)
  const sortedShiftKeys = Object.keys(groupedByShift).sort((a, b) => {
    const indexA = OFFICIAL_SHIFTS.indexOf(a);
    const indexB = OFFICIAL_SHIFTS.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b, 'es');
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Header Superior */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-[11px] font-bold backdrop-blur-sm mb-2">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Registro Histórico VULPIARE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">Historial de Clases y Retiros</h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              Consulta asistencias y retiros agrupados por turno en orden alfabético.
            </p>
          </div>

          <button
            onClick={fetchHistoryData}
            className="self-start sm:self-center px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* DISPOSICIÓN MOBILE PRIMARIA (De arriba a abajo estricto) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        {/* 1️⃣ Lupita de Búsqueda */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            1. Lupita de Búsqueda
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de alumna o DNI..."
              className="w-full px-3.5 py-2.5 pl-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[44px]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 2️⃣ Selección Fecha */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            2. Selección Fecha
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 pl-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 min-h-[44px]"
            />
            <Calendar className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* 3️⃣ Selección Turno */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            3. Selección Turno
          </label>
          <div className="relative">
            <select
              value={selectedShift}
              onChange={(e) => handleShiftSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer min-h-[44px]"
            >
              <option value="ALL">✨ Todos los Turnos (Secciones Divididas)</option>
              {OFFICIAL_SHIFTS.map((sh) => (
                <option key={sh} value={sh}>
                  {sh}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4️⃣ Parte de Filtrar (Filtros Rápidos por Estado) */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            4. Parte de Filtrar
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all active:scale-95 min-h-[38px] ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({filteredRecords.length})
            </button>
            <button
              onClick={() => setStatusFilter('PRESENT')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 min-h-[38px] ${
                statusFilter === 'PRESENT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sólo Presentes ({presentCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('ABSENT')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 min-h-[38px] ${
                statusFilter === 'ABSENT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Sólo Ausentes ({absentCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDERIZADO DIVIDIDO POR SECCIONES/DIVS PARA CADA TURNO EN ORDEN ALFABÉTICO */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <p className="font-bold text-xs">Cargando registros del historial...</p>
        </div>
      ) : sortedShiftKeys.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center text-slate-400 text-xs font-bold">
          No hay registros de asistencias para la fecha y filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-5">
          {sortedShiftKeys.map((shiftName) => {
            const shiftRecords = groupedByShift[shiftName];
            const shiftPresentCount = shiftRecords.filter((r) => r.status === 'PRESENT').length;
            const shiftAbsentCount = shiftRecords.filter((r) => r.status === 'ABSENT').length;

            return (
              <div
                key={shiftName}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Encabezado del Div de Turno */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white">
                        Turno: {shiftName}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {shiftRecords.length} alumnas registradas (Orden alfabético)
                      </p>
                    </div>
                  </div>

                  {/* Badges resumidos por Turno */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ {shiftPresentCount} Presentes
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ✗ {shiftAbsentCount} Ausentes
                    </span>
                  </div>
                </div>

                {/* Lista de Alumnas en Orden Alfabético */}
                <div className="divide-y divide-slate-100">
                  {shiftRecords.map((rec) => {
                    const student = rec.student;
                    const hasPickup = rec.pickups && rec.pickups.length > 0;
                    const pickup = hasPickup ? rec.pickups![0] : null;
                    const hasAuthorizedPeople =
                      student?.authorizedPeople && student.authorizedPeople.length > 0;

                    return (
                      <div
                        key={rec.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {rec.date}
                            </span>
                            <h4 className="font-black text-slate-900 text-sm sm:text-base">
                              {student ? `${student.lastName}, ${student.firstName}` : 'Alumna'}
                            </h4>
                            <span className="text-xs text-slate-500 font-medium">
                              (DNI: {student?.dni})
                            </span>
                            {rec.isMakeup && (
                              <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Recuperatorio
                              </span>
                            )}
                          </div>

                          {rec.isMakeup && (
                            <p className="text-xs text-purple-800 font-extrabold mt-1 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 inline-block">
                              🔄 Alumna recuperando clase en: <span className="underline">{rec.makeupShift || shiftName}</span> (Turno habitual: {student?.shift})
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs font-medium text-slate-500 pt-0.5">
                            <span>
                              Docente a cargo: <strong>{rec.recordedBy?.fullName || 'Profesora'}</strong>
                            </span>
                          </div>

                          {/* Detalle del Retiro si existió */}
                          {pickup ? (
                            <div className="mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-xs space-y-1">
                              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                Retirada por {pickup.authorizedPerson.fullName} ({pickup.authorizedPerson.relationship}) - DNI: {pickup.authorizedPerson.dni}
                              </p>
                              <div className="flex items-center justify-between text-slate-600 font-mono text-[11px] pt-1">
                                <span>
                                  Hora de retiro: <strong>{new Date(pickup.pickupTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong>
                                </span>
                                <span>
                                  Reg. por: <strong>{pickup.recordedBy?.fullName || 'Profe'}</strong>
                                </span>
                              </div>
                            </div>
                          ) : rec.status === 'PRESENT' && !hasAuthorizedPeople ? (
                            <p className="text-xs text-emerald-700 font-semibold mt-1">
                              ✓ Presente y listo (Sin persona a cargo registrada)
                            </p>
                          ) : null}
                        </div>

                        {/* Insignia Estado */}
                        <div className="self-end sm:self-center">
                          {rec.status === 'PRESENT' ? (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              {!hasAuthorizedPeople && !hasPickup ? 'Presente y listo' : 'Presente'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              Ausente
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
