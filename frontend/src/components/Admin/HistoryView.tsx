import React, { useState, useEffect } from 'react';
import { History, Calendar, CheckCircle2, XCircle, ShieldCheck, Search, RefreshCw } from 'lucide-react';
import { getAttendanceHistory } from '../../services/api';
import { AttendanceRecord } from '../../types';

interface HistoryViewProps {
  shift: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ shift }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const data = await getAttendanceHistory(selectedDate || undefined, shift);
      setRecords(data);
    } catch (err) {
      alert('Error al consultar historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [shift, selectedDate]);

  const filteredRecords = records.filter(r => {
    if (!r.student) return false;
    const fullName = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return fullName.includes(q);
  });

  return (
    <div className="space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold backdrop-blur-sm mb-2">
            <History className="w-3.5 h-3.5" />
            <span>Registro Histórico</span>
          </div>
          <h2 className="text-2xl font-extrabold">Historial de Clases y Retiros</h2>
          <p className="text-slate-300 text-sm mt-1">
            Consulta registros pasados de asistencia, horarios de retiros y profesores a cargo.
          </p>
        </div>

        <button
          onClick={fetchHistoryData}
          className="self-start sm:self-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Buscador Dinámico por Nombre de Alumna */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de alumna..."
            className="w-full text-xs font-semibold border-none focus:outline-none bg-transparent"
          />
        </div>

        {/* Filtro por Fecha Específica */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-xs font-semibold border-none focus:outline-none bg-transparent"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              Ver Todas
            </button>
          )}
        </div>
      </div>

      {/* Tabla / Lista de Registros */}
      {loading ? (
        <p className="text-center py-8 text-slate-500 text-sm">Cargando registros históricos...</p>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No hay registros para los filtros seleccionados.
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const student = rec.student;
              const hasPickup = rec.pickups && rec.pickups.length > 0;
              const pickup = hasPickup ? rec.pickups![0] : null;
              const hasAuthorizedPeople = student?.authorizedPeople && student.authorizedPeople.length > 0;

              return (
                <div key={rec.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {rec.date}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {student ? `${student.firstName} ${student.lastName}` : 'Alumna'}
                      </h4>
                      <span className="text-xs text-slate-500">
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
                        🔄 La alumna recupera una clase en el turno: <span className="underline">{rec.makeupShift || shift}</span> (Turno habitual: {student?.shift})
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                      <span>Profe que tomó asistencia: <strong>{rec.recordedBy?.fullName || 'Registrado'}</strong></span>
                    </div>

                    {/* Detalle del Retiro si existió */}
                    {pickup ? (
                      <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs space-y-1">
                        <p className="font-bold text-emerald-900 flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Retirada por {pickup.authorizedPerson.fullName} ({pickup.authorizedPerson.relationship}) - DNI: {pickup.authorizedPerson.dni}
                        </p>
                        <div className="flex items-center justify-between text-slate-600 font-mono text-[11px] pt-1">
                          <span>Hora de retiro: <strong>{new Date(pickup.pickupTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong></span>
                          <span>Reg. por: <strong>{pickup.recordedBy?.fullName || 'Profe'}</strong></span>
                        </div>
                      </div>
                    ) : rec.status === 'PRESENT' && !hasAuthorizedPeople ? (
                      <p className="text-xs text-emerald-700 font-semibold mt-1">
                        ✓ Presente y listo (Sin persona a cargo registrada)
                      </p>
                    ) : null}
                  </div>

                  {/* Insignia Presente/Ausente */}
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
            })
          )}
        </div>
      )}
    </div>
  );
};
