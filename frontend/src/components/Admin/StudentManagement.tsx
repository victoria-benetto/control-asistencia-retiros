import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, UserPlus, X, Save, Search, Calendar, Users, Activity, CheckCircle2 } from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent, getShifts } from '../../services/api';
import { Student, AdminUser, StudentStatus, OFFICIAL_SHIFTS } from '../../types';

interface StudentManagementProps {
  user: AdminUser;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ user }) => {
  // Verificación estricta de Super Admin
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="font-extrabold text-rose-900 text-lg">Acceso Restringido</h3>
        <p className="text-xs text-rose-700 mt-2 font-medium">
          El módulo de Alumnas solo puede ser administrado por <strong>Victoria</strong>.
        </p>
      </div>
    );
  }

  const [students, setStudents] = useState<Student[]>([]);
  const [shifts, setShifts] = useState<string[]>(OFFICIAL_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Mes seleccionado para contabilizar asistencias mensuales (Super Admin)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [shift, setShift] = useState(OFFICIAL_SHIFTS[0]);
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [authorizedPeople, setAuthorizedPeople] = useState<
    Array<{ fullName: string; dni: string; relationship: string; phone: string }>
  >([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sList, shList] = await Promise.all([getStudents(), getShifts()]);
      setStudents(sList);
      if (shList && shList.length > 0) {
        setShifts(shList);
      }
    } catch (err) {
      alert('Error al cargar alumnas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreateModal = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setDni('');
    setShift(OFFICIAL_SHIFTS[0]);
    setStatus('ACTIVE');
    setNotes('');
    setAuthorizedPeople([
      { fullName: '', dni: '', relationship: 'Mamá', phone: '' },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setDni(s.dni);
    setShift(s.shift);
    setStatus(s.status || 'ACTIVE');
    setNotes(s.notes || '');
    setAuthorizedPeople(
      s.authorizedPeople && s.authorizedPeople.length > 0
        ? s.authorizedPeople.map((p) => ({
            fullName: p.fullName,
            dni: p.dni,
            relationship: p.relationship,
            phone: p.phone || '',
          }))
        : [{ fullName: '', dni: '', relationship: 'Mamá', phone: '' }]
    );
    setModalOpen(true);
  };

  const handleAddAuthorizedRow = () => {
    setAuthorizedPeople([
      ...authorizedPeople,
      { fullName: '', dni: '', relationship: 'Familiar', phone: '' },
    ]);
  };

  const handleRemoveAuthorizedRow = (index: number) => {
    setAuthorizedPeople(authorizedPeople.filter((_, i) => i !== index));
  };

  const handleAuthorizedChange = (index: number, field: string, value: string) => {
    const updated = [...authorizedPeople];
    updated[index] = { ...updated[index], [field]: value };
    setAuthorizedPeople(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !dni.trim() || !shift) {
      alert('Nombre, Apellido, DNI y Turno son requeridos.');
      return;
    }

    const validPeople = authorizedPeople.filter(
      (p) => p.fullName.trim() !== '' && p.dni.trim() !== ''
    );

    try {
      if (editingStudent) {
        await updateStudent(user.dni, editingStudent.id, {
          firstName,
          lastName,
          dni,
          shift,
          status,
          notes,
          authorizedPeople: validPeople,
        });
      } else {
        await createStudent(user.dni, {
          firstName,
          lastName,
          dni,
          shift,
          status,
          notes,
          authorizedPeople: validPeople,
        });
      }
      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la alumna.');
    }
  };

  const handleQuickStatusChange = async (studentId: string, newStatus: StudentStatus) => {
    try {
      await updateStudent(user.dni, studentId, { status: newStatus });
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado de la alumna.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente a ${name} de la base de datos?\n\n(Tip: Si solo dejó de asistir, podés cambiar su estado a "Inactiva" para conservar su historial).`)) return;
    try {
      await deleteStudent(user.dni, id);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar alumna.');
    }
  };

  const getSelectedMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    if (!y || !m) return monthStr;
    const d = new Date(y, m - 1, 1);
    const monthName = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const selectedMonthFormatted = getSelectedMonthName(selectedMonth);

  const getStudentMonthlyAttendanceCount = (s: Student) => {
    if (!s.attendances) return 0;
    return s.attendances.filter(
      (a) => a.status === 'PRESENT' && a.date && a.date.startsWith(selectedMonth)
    ).length;
  };

  const totalMonthlyPresences = students.reduce(
    (acc, s) => acc + getStudentMonthlyAttendanceCount(s),
    0
  );

  const activeCount = students.filter((s) => (s.status || 'ACTIVE') === 'ACTIVE').length;
  const tempInactiveCount = students.filter((s) => s.status === 'TEMPORARILY_INACTIVE').length;
  const inactiveCount = students.filter((s) => s.status === 'INACTIVE').length;

  const filteredStudents = students.filter((s) => {
    const currentStatus = s.status || 'ACTIVE';
    const matchesSearch =
      search.trim() === '' ||
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.dni.includes(search) ||
      s.shift.toLowerCase().includes(search.toLowerCase());

    const matchesShift =
      selectedShiftFilter === 'ALL' || s.shift === selectedShiftFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || currentStatus === selectedStatusFilter;

    return matchesSearch && matchesShift && matchesStatus;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Módulo Exclusivo Super Admin
          </span>
          <h2 className="text-xl sm:text-2xl font-black">Alumnas</h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
            Gestión de alumnas registradas en VULPIARE, estados y asistencias mensuales.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-3 bg-white text-amber-900 hover:bg-amber-50 font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-amber-600" />
          <span>Nueva Alumna</span>
        </button>
      </div>

      {/* Control Mensual de Asistencias & Resumen de Estados (Exclusivo Super Admin) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Selector de Mes */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Control Mensual de Asistencias (Super Admin)
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {selectedMonthFormatted}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold">Total clases asistidas este mes:</span>
            <span className="text-base font-black text-indigo-700 bg-indigo-50 px-3 py-0.5 rounded-xl border border-indigo-200">
              {totalMonthlyPresences} asistencias
            </span>
          </div>
        </div>

        {/* Resumen Alumnas Activas */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Activas en turnos
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{activeCount}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Habilitadas en asistencia</span>
        </div>

        {/* Resumen Inactivas / Bajas */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            Inactivas / Bajas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{tempInactiveCount}</span>
            <span className="text-xs font-extrabold text-slate-400">temporales</span>
            <span className="text-2xl font-black text-rose-600 ml-2">{inactiveCount}</span>
            <span className="text-xs font-extrabold text-slate-400">bajas</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Conservadas en sistema</span>
        </div>
      </div>

      {/* Buscador y Filtros por Turno y Estado */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumna por nombre o DNI..."
            className="w-full text-xs font-bold border-none focus:outline-none bg-transparent"
          />
        </div>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center min-w-[200px]">
          <select
            value={selectedShiftFilter}
            onChange={(e) => setSelectedShiftFilter(e.target.value)}
            className="w-full text-xs font-bold bg-transparent border-none focus:outline-none text-slate-700 px-2 cursor-pointer"
          >
            <option value="ALL">✨ Todos los Turnos</option>
            {shifts.map((sh) => (
              <option key={sh} value={sh}>
                {sh}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center min-w-[180px]">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full text-xs font-bold bg-transparent border-none focus:outline-none text-slate-700 px-2 cursor-pointer"
          >
            <option value="ALL">✨ Todos los Estados</option>
            <option value="ACTIVE">🟢 Sólo Activas ({activeCount})</option>
            <option value="TEMPORARILY_INACTIVE">🟡 Sólo Inactiva temporal ({tempInactiveCount})</option>
            <option value="INACTIVE">🔴 Sólo Inactivas ({inactiveCount})</option>
          </select>
        </div>
      </div>

      {/* Lista de Alumnas */}
      {loading ? (
        <p className="text-center py-8 text-slate-500 text-xs">Cargando alumnas...</p>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              No se encontraron alumnas con los filtros aplicados.
            </div>
          ) : (
            filteredStudents.map((s) => {
              const currentStatus = s.status || 'ACTIVE';
              const monthlyAttendanceCount = getStudentMonthlyAttendanceCount(s);

              return (
                <div
                  key={s.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-900 text-base">
                        {s.firstName} {s.lastName}
                      </h4>
                      <span className="bg-purple-50 text-purple-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-purple-100">
                        {s.shift}
                      </span>

                      {/* Badge de Estado */}
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                          currentStatus === 'INACTIVE'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : currentStatus === 'TEMPORARILY_INACTIVE'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {currentStatus === 'INACTIVE'
                          ? 'Inactiva'
                          : currentStatus === 'TEMPORARILY_INACTIVE'
                          ? 'Inactiva temporal'
                          : 'Activa'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      DNI Alumna: <span className="font-mono text-slate-700 font-bold">{s.dni}</span>
                    </p>

                    {/* Contabilizador de Clases Asistidas en el Mes (Super Admin) */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1 rounded-xl text-xs font-black">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          Asistencias en {selectedMonthFormatted}:{' '}
                          <strong className="text-indigo-700">{monthlyAttendanceCount}</strong> clases
                        </span>
                      </span>

                      {/* Selector Rápido de Estado para Super Admin */}
                      <div className="inline-flex items-center gap-1 text-xs">
                        <span className="text-[11px] font-bold text-slate-400">Cambiar estado:</span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleQuickStatusChange(s.id, e.target.value as StudentStatus)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-2 py-0.5 rounded-lg border border-slate-200 cursor-pointer"
                        >
                          <option value="ACTIVE">Activa</option>
                          <option value="TEMPORARILY_INACTIVE">Inactiva temporal</option>
                          <option value="INACTIVE">Inactiva</option>
                        </select>
                      </div>
                    </div>

                    {/* Autorizados */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Autorizados:</span>
                      {s.authorizedPeople.length === 0 ? (
                        <span className="text-[11px] text-rose-500 font-bold">Ninguno</span>
                      ) : (
                        s.authorizedPeople.map((p) => (
                          <span key={p.id} className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold border border-slate-200">
                            👤 {p.fullName} ({p.relationship}) - DNI: {p.dni}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2.5 rounded-2xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1 min-h-[40px]"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)}
                      className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1 min-h-[40px]"
                      title="Eliminar permanentemente de la base de datos"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Alta / Edición de Alumna */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl my-8 p-6 sm:p-8 relative animate-fadeIn">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-5">
              {editingStudent ? 'Editar Alumna' : 'Nueva Alumna'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej: Pepa"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej: Pérez"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">DNI Alumna</label>
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej: 55111222"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">Turno Asignado</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  >
                    {shifts.map((sh) => (
                      <option key={sh} value={sh}>
                        {sh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estado de la Alumna */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Estado de la Alumna
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                >
                  <option value="ACTIVE">Activa (Habilitada en las listas de turnos para tomar asistencia)</option>
                  <option value="TEMPORARILY_INACTIVE">Inactiva temporal (No asiste por tiempo prolongado con aviso previo - Inhabilitada en turnos)</option>
                  <option value="INACTIVE">Inactiva (Deja de asistir sin aviso de retorno - Inhabilitada en turnos pero conservada en BD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Ninguna..."
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                />
              </div>

              {/* Personas Autorizadas a Retirar */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Personas Autorizadas</h4>
                  <button
                    type="button"
                    onClick={handleAddAuthorizedRow}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Agregar</span>
                  </button>
                </div>

                {authorizedPeople.map((person, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Nombre Completo"
                        value={person.fullName}
                        onChange={(e) => handleAuthorizedChange(idx, 'fullName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="DNI"
                        value={person.dni}
                        onChange={(e) => handleAuthorizedChange(idx, 'dni', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        placeholder="Vínculo"
                        value={person.relationship}
                        onChange={(e) => handleAuthorizedChange(idx, 'relationship', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      {authorizedPeople.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAuthorizedRow(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón Guardar */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 min-h-[42px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 min-h-[42px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
