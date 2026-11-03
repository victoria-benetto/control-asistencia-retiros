import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, UserPlus, X, Save, Search, Calendar, Users, Activity, CheckCircle2, History, Phone, Clock, DollarSign } from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent, getShifts, getStudentAttendances, deleteAttendance, getPayments } from '../../services/api';
import { Student, AdminUser, StudentStatus, OFFICIAL_SHIFTS } from '../../types';
import { STUDENT_PLANS, StudentPlan, WEEK_DAYS, DAY_SHIFTS, formatMoney, describeSchedule, ENROLLMENT_FEE, ScheduleEntry } from '../../utils/plans';

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
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('ALL');

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
  const [plan, setPlan] = useState<StudentPlan>('DOS_VECES');
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([
    { day: 'MARTES', shift: OFFICIAL_SHIFTS[2] },
    { day: 'JUEVES', shift: OFFICIAL_SHIFTS[2] },
  ]);
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [authorizedPeople, setAuthorizedPeople] = useState<
    Array<{ fullName: string; dni: string; relationship: string; phone: string }>
  >([]);

  // Historial de Asistencias & Eliminación de Asistencia Incorrecta
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [studentAttendances, setStudentAttendances] = useState<any[]>([]);
  const [loadingAttendances, setLoadingAttendances] = useState(false);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<'ATTENDANCE' | 'PAYMENTS'>('ATTENDANCE');
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

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
    setPlan('DOS_VECES');
    setSchedule([
      { day: 'MARTES', shift: OFFICIAL_SHIFTS[2] },
      { day: 'JUEVES', shift: OFFICIAL_SHIFTS[2] },
    ]);
    setStatus('ACTIVE');
    setNotes('');
    setPhone('');
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
    setPhone(s.phone || '');

    const currentPlan = (s.plan as StudentPlan) || 'DOS_VECES';
    setPlan(currentPlan);

    const initialSchedule: ScheduleEntry[] = [];
    if (Array.isArray(s.schedule) && s.schedule.length > 0) {
      s.schedule.forEach((entry) => {
        if (entry.day && entry.shift) {
          initialSchedule.push({ day: entry.day, shift: entry.shift });
        }
      });
    } else {
      // Reconstrucción a partir del turno legado
      if (s.shift.includes('Martes y Jueves')) {
        initialSchedule.push({ day: 'MARTES', shift: OFFICIAL_SHIFTS[2] });
        initialSchedule.push({ day: 'JUEVES', shift: OFFICIAL_SHIFTS[2] });
      } else if (s.shift.includes('Lunes y mi') && s.shift.includes('8 a 10')) {
        initialSchedule.push({ day: 'LUNES', shift: OFFICIAL_SHIFTS[3] });
        initialSchedule.push({ day: 'MIERCOLES', shift: OFFICIAL_SHIFTS[3] });
      } else if (s.shift.includes('16:45 a 18')) {
        initialSchedule.push({ day: 'LUNES', shift: OFFICIAL_SHIFTS[0] });
        initialSchedule.push({ day: 'MIERCOLES', shift: OFFICIAL_SHIFTS[0] });
        initialSchedule.push({ day: 'VIERNES', shift: OFFICIAL_SHIFTS[0] });
      } else if (s.shift.includes('17:30 a 19')) {
        initialSchedule.push({ day: 'LUNES', shift: OFFICIAL_SHIFTS[1] });
        initialSchedule.push({ day: 'MIERCOLES', shift: OFFICIAL_SHIFTS[1] });
        initialSchedule.push({ day: 'VIERNES', shift: OFFICIAL_SHIFTS[1] });
      }
    }
    setSchedule(initialSchedule);

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

  const handlePlanChange = (newPlan: StudentPlan) => {
    setPlan(newPlan);
    const planDef = STUDENT_PLANS[newPlan];

    if (newPlan === 'CLASE_SUELTA') {
      setSchedule([]);
      return;
    }

    if (newPlan === 'PASE_LIBRE') {
      if (schedule.length === 0) {
        setSchedule(WEEK_DAYS.map((d) => ({ day: d.key, shift: DAY_SHIFTS[d.key][0].shift })));
      }
      return;
    }

    if (schedule.length > planDef.days) {
      setSchedule(schedule.slice(0, planDef.days));
    }
  };

  const handleToggleSlot = (dayKey: string, shiftVal: string) => {
    const isSelected = schedule.some((e) => e.day === dayKey && e.shift === shiftVal);
    if (isSelected) {
      setSchedule(schedule.filter((e) => !(e.day === dayKey && e.shift === shiftVal)));
    } else {
      const planDef = STUDENT_PLANS[plan];
      if (planDef.days > 0 && plan !== 'PASE_LIBRE' && schedule.length >= planDef.days) {
        alert(
          `El plan seleccionado "${planDef.label}" requiere exactamente ${planDef.days} clase(s)/turno(s) semanales. Desmarcá un turno previo para agregar este.`
        );
        return;
      }
      setSchedule([...schedule, { day: dayKey, shift: shiftVal }]);
    }
  };

  const openHistoryModal = async (s: Student) => {
    setHistoryStudent(s);
    setHistoryModalOpen(true);
    if (s.attendances) {
      setStudentAttendances(s.attendances);
    } else {
      setStudentAttendances([]);
    }
    setLoadingAttendances(true);
    try {
      const records = await getStudentAttendances(s.id);
      setStudentAttendances(records);
    } catch (err) {
      console.error('Error fetching student attendances:', err);
    } finally {
      setLoadingAttendances(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId: string, recordDate: string, recordShift: string) => {
    const confirmDelete = window.confirm(
      `¿Confirmás que querés eliminar la asistencia del día ${recordDate} (${recordShift})?\nEsta acción es irreversible y corregirá el registro si fue marcado de forma incorrecta.`
    );
    if (!confirmDelete) return;

    setDeletingAttId(attendanceId);
    try {
      await deleteAttendance(attendanceId, user.dni);
      setStudentAttendances((prev) => prev.filter((a) => a.id !== attendanceId));
      setStudents((prev) =>
        prev.map((st) => {
          if (st.id === historyStudent?.id) {
            return {
              ...st,
              attendances: (st.attendances || []).filter((a) => a.id !== attendanceId),
            };
          }
          return st;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la asistencia.');
    } finally {
      setDeletingAttId(null);
    }
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
    if (!firstName.trim() || !lastName.trim() || !dni.trim()) {
      alert('Nombre, Apellido y DNI son requeridos.');
      return;
    }

    const planDef = STUDENT_PLANS[plan];
    const selectedDaysCount = Object.keys(schedule).length;

    if (planDef.days > 0 && selectedDaysCount !== planDef.days) {
      alert(`El plan "${planDef.label}" requiere exactamente ${planDef.days} día(s). Tenés seleccionados ${selectedDaysCount}.`);
      return;
    }

    const scheduleEntries = Object.entries(schedule).map(([day, shiftVal]) => ({
      day,
      shift: shiftVal,
    }));

    const primaryShift = scheduleEntries[0]?.shift || shift || OFFICIAL_SHIFTS[0];

    const validPeople = authorizedPeople.filter(
      (p) => p.fullName.trim() !== '' && p.dni.trim() !== ''
    );

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dni: dni.trim(),
      shift: primaryShift,
      plan,
      monthlyFee: planDef.fee,
      schedule,
      status,
      notes: notes.trim(),
      phone: phone.trim() || undefined,
      authorizedPeople: validPeople,
    };

    try {
      if (editingStudent) {
        await updateStudent(user.dni, editingStudent.id, payload);
      } else {
        await createStudent(user.dni, payload);
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
      s.shift.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search));

    const matchesShift =
      selectedShiftFilter === 'ALL' || s.shift === selectedShiftFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || currentStatus === selectedStatusFilter;

    const matchesPlan =
      selectedPlanFilter === 'ALL' || s.plan === selectedPlanFilter;

    return matchesSearch && matchesShift && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="bg-purple-900 border border-purple-800/80 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Módulo Exclusivo Super Admin
          </span>
          <h2 className="text-xl sm:text-2xl font-black">Alumnas</h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
            Gestión de alumnas, planes de cuota, cronograma de turnos y facturación mensual.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-3 bg-white text-purple-900 hover:bg-purple-50 font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Nueva Alumna</span>
        </button>
      </div>

      {/* Control Mensual de Asistencias & Resumen de Estados */}
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

      {/* Buscador y Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o WhatsApp..."
            className="w-full text-xs font-bold border-none focus:outline-none bg-transparent"
          />
        </div>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center">
          <select
            value={selectedPlanFilter}
            onChange={(e) => setSelectedPlanFilter(e.target.value)}
            className="w-full text-xs font-bold bg-transparent border-none focus:outline-none text-slate-700 px-2 cursor-pointer"
          >
            <option value="ALL">✨ Todos los Planes</option>
            {(Object.keys(STUDENT_PLANS) as StudentPlan[]).map((pKey) => (
              <option key={pKey} value={pKey}>
                {STUDENT_PLANS[pKey].label} ({formatMoney(STUDENT_PLANS[pKey].fee)})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center">
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

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center">
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
              const studentPlanDef = s.plan && STUDENT_PLANS[s.plan as StudentPlan];

              return (
                <div
                  key={s.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-900 text-base">
                        {s.firstName} {s.lastName}
                      </h4>

                      {/* Badge de Plan */}
                      {studentPlanDef ? (
                        <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                          {studentPlanDef.label} · {formatMoney(s.monthlyFee || studentPlanDef.fee)}
                        </span>
                      ) : (
                        <span className="bg-purple-50 text-purple-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-purple-100">
                          {s.shift}
                        </span>
                      )}

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

                    {/* Cronograma de días y turnos específicos */}
                    {s.schedule && s.schedule.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-slate-800">{describeSchedule(s.schedule)}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium">
                        Turno fijo: <span className="text-slate-600 font-bold">{s.shift}</span>
                      </p>
                    )}

                    <p className="text-xs text-slate-500 font-medium">
                      DNI Alumna: <span className="font-mono text-slate-700 font-bold">{s.dni}</span>
                      {s.phone && (
                        <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {s.phone}
                        </span>
                      )}
                    </p>

                    {/* Contabilizador de Clases Asistidas en el Mes */}
                    <div className="pt-0.5 flex flex-wrap items-center gap-2">
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
                    <div className="mt-1 flex flex-wrap gap-1">
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
                      onClick={() => openHistoryModal(s)}
                      className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] border border-indigo-200 shadow-2xs"
                      title="Ver historial de asistencias y eliminar registros incorrectos"
                    >
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>Historial</span>
                    </button>

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

      {/* Modal Historial de Asistencias & Eliminación */}
      {historyModalOpen && historyStudent && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 md:top-[112px] z-40 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto pb-24 md:pb-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl my-3 sm:my-6 p-6 relative animate-fadeIn">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black flex-shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Historial de Asistencias
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {historyStudent.firstName} {historyStudent.lastName} (DNI: {historyStudent.dni})
                </p>
              </div>
            </div>

            {/* Selector de Pestaña: Asistencias vs Pagos */}
            <div className="flex gap-2 mt-4 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setHistoryTab('ATTENDANCE')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  historyTab === 'ATTENDANCE'
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>📅 Asistencias</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-bold">
                  {studentAttendances.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('PAYMENTS')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  historyTab === 'PAYMENTS'
                    ? 'bg-white text-purple-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>💳 Pagos y Seguros</span>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold">
                  {studentPayments.length}
                </span>
              </button>
            </div>

            {historyTab === 'ATTENDANCE' ? (
              <>
                <div className="mt-3 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                  <p className="font-bold">⚠️ Corrección de asistencias erróneas:</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Desde este apartado podés consultar las fechas a las que asistió la alumna y <strong>eliminar una asistencia</strong> si fue marcada de forma incorrecta.
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Registros de Asistencia ({studentAttendances.length})
                    </h4>
                  </div>

                  {loadingAttendances ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-bold">
                      Cargando asistencias...
                    </div>
                  ) : studentAttendances.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No hay asistencias registradas para esta alumna.
                    </div>
                  ) : (
                    <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                      {studentAttendances.map((att: any) => {
                        const isPresent = att.status === 'PRESENT';
                        const isDeleting = deletingAttId === att.id;
                        const dateObj = new Date(att.date + 'T12:00:00');
                        const formattedDate = dateObj.toLocaleDateString('es-AR', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });

                        return (
                          <div
                            key={att.id}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 flex items-center justify-between gap-3 transition-colors shadow-2xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    isPresent
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {isPresent ? 'Presente' : 'Ausente'}
                                </span>
                                <span className="text-xs font-black text-slate-800 capitalize">
                                  {formattedDate}
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  ({att.date})
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 font-medium pt-0.5">
                                <span>Turno: <strong className="text-slate-700">{att.shift || historyStudent.shift}</strong></span>
                                {att.isMakeup && (
                                  <span className="ml-1 text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 text-[10px]">
                                    Recuperatorio en {att.makeupShift || att.shift}
                                  </span>
                                )}
                                {att.recordedBy?.fullName && (
                                  <span className="ml-1 text-slate-400 text-[10px]">
                                    • Marcó: {att.recordedBy.fullName}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteAttendance(att.id, att.date, att.shift || historyStudent.shift)}
                              disabled={isDeleting}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 text-xs font-black flex items-center gap-1 transition-all border border-rose-200 shadow-2xs disabled:opacity-50"
                              title="Eliminar esta asistencia marcada erróneamente"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Historial de Pagos y Seguros ({studentPayments.length})
                  </h4>
                </div>

                {loadingPayments ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-bold">
                    Cargando pagos...
                  </div>
                ) : studentPayments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No hay pagos registrados para esta alumna.
                  </div>
                ) : (
                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                    {studentPayments.map((pay: any) => {
                      const c = (pay.concept || '').toLowerCase();
                      const isSeguro = c.includes('seguro');
                      const isInscrip = c.includes('inscrip') || c.includes('matr');
                      const isSuelta = c.includes('suelta') || c.includes('pase');
                      const payDate = pay.paidAt
                        ? new Date(pay.paidAt).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : pay.month;

                      return (
                        <div
                          key={pay.id}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 flex items-center justify-between gap-3 transition-colors shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  isSeguro
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : isInscrip
                                    ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                    : isSuelta
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}
                              >
                                {isSeguro ? '🛡️ Seguro' : isInscrip ? '📝 Inscripción' : isSuelta ? '🎟️ Suelta' : '🩰 Cuota'}
                              </span>
                              <span className="text-xs font-black text-slate-800">
                                {pay.concept || 'Cuota Mensual'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">
                                ({pay.month})
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                              <span>📅 {payDate}</span>
                              <span>•</span>
                              <span className="font-extrabold text-slate-700">
                                {pay.paymentMethod === 'TRANSFER' ? '💳 Transferencia' : '💵 Efectivo en Caja'}
                              </span>
                              {pay.recordedBy?.fullName && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 text-[10px]">
                                    Cobró: {pay.recordedBy.fullName}
                                  </span>
                                </>
                              )}
                              {pay.notes && (
                                <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 text-[10px]">
                                  {pay.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-slate-900 block">
                              ${pay.amount.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              Registrado
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Alumna */}
      {modalOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 md:top-[112px] z-40 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto pb-24 md:pb-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl my-3 sm:my-6 p-6 relative animate-fadeIn">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">
              {editingStudent ? 'Editar Alumna' : 'Nueva Alumna'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Configurá los datos de la alumna, su plan de cuotas, días y horarios de cursada.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Martina"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej. Gómez"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">DNI Alumna *</label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej. 52331442"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono de Contacto (WhatsApp)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. 11 2345-6789"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 pl-9"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Selector de Plan y Cuota Obligatoria */}
              <div className="bg-purple-50/70 p-4 rounded-3xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black text-purple-950 uppercase tracking-wider">
                      Plan y Cuota Mensual *
                    </label>
                    <p className="text-[11px] text-purple-800 font-medium">
                      Determina la cuota a cobrar en el estado de cuenta y los días habilitados.
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-900 bg-white px-3 py-1 rounded-full border border-amber-200 shadow-2xs">
                    {formatMoney(STUDENT_PLANS[plan].fee)}/mes
                  </span>
                </div>

                {/* Tarjetas de Planes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(STUDENT_PLANS) as StudentPlan[]).map((pKey) => {
                    const pInfo = STUDENT_PLANS[pKey];
                    const isSelected = plan === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => handlePlanChange(pKey)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black leading-tight">{pInfo.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />}
                        </div>
                        <p className={`text-sm font-black mt-1 ${isSelected ? 'text-amber-100' : 'text-amber-700'}`}>
                          {formatMoney(pInfo.fee)}
                        </p>
                        <p className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>
                          {pInfo.days === 0 ? 'Sin días fijos' : pInfo.days === 5 ? 'Todos los días hábiles' : `${pInfo.days} día(s) por semana`}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Banner Informativo de Inscripción Inicial */}
                <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-2xl border border-amber-200 text-xs">
                  <span className="text-slate-600 font-bold">
                    📌 Inscripción (pago inicial anual):
                  </span>
                  <span className="font-black text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-xl">
                    {formatMoney(ENROLLMENT_FEE)}
                  </span>
                </div>
              </div>

              {/* Asignación Dinámica de Días y Turnos */}
              {STUDENT_PLANS[plan].days > 0 ? (
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                        Días y Horarios de Asistencia *
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {plan === 'PASE_LIBRE' ? (
                          <span>Marcá todos los turnos a los que asiste la alumna ({schedule.length} seleccionados).</span>
                        ) : (
                          <span>
                            Seleccioná exactamente <strong>{STUDENT_PLANS[plan].days} clase(s)/turno(s)</strong> ({schedule.length}/{STUDENT_PLANS[plan].days} seleccionados).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {WEEK_DAYS.map((d) => {
                      const availableShifts = DAY_SHIFTS[d.key];
                      const daySlots = schedule.filter((e) => e.day === d.key);
                      const hasSelectedSlots = daySlots.length > 0;

                      return (
                        <div
                          key={d.key}
                          className={`p-3 rounded-2xl border transition-all ${
                            hasSelectedSlots
                              ? 'bg-white border-amber-400 shadow-xs ring-1 ring-amber-300'
                              : 'bg-white/60 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{d.label}</span>
                              {hasSelectedSlots && (
                                <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                  {daySlots.length} {daySlots.length === 1 ? 'turno' : 'turnos'}
                                </span>
                              )}
                            </div>

                            {/* Chips de turnos disponibles para este día */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {availableShifts.map((sh) => {
                                const isSlotActive = schedule.some((e) => e.day === d.key && e.shift === sh.shift);
                                return (
                                  <button
                                    key={sh.shift}
                                    type="button"
                                    onClick={() => handleToggleSlot(d.key, sh.shift)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer select-none ${
                                      isSlotActive
                                        ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400'
                                        : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                                    }`}
                                  >
                                    <span>{isSlotActive ? '✓' : '+'}</span>
                                    <span>{sh.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs">
                  ℹ️ <strong>Clase suelta:</strong> No requiere asignación de días fijos. La alumna abona por clase individual al momento de asistir.
                </div>
              )}

              {/* Estado de la Alumna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado de la Alumna (Visible para la alumna y familia)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ACTIVE">Activa (Aparece y puede registrarse en los turnos)</option>
                  <option value="TEMPORARILY_INACTIVE">Inactiva temporal (No asiste por tiempo prolongado y avisado)</option>
                  <option value="INACTIVE">Inactiva (Dejó de asistir sin aviso; se conserva historial)</option>
                </select>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  * Las alumnas inactivas o inactivas temporales no figurarán en la lista para tomar asistencia de los turnos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones / Alergias / Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Alérgica al maní, retira con autorización especial, etc."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Personas Autorizadas */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Personas Autorizadas para Retiro
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAuthorizedRow}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Persona</span>
                  </button>
                </div>

                {authorizedPeople.map((person, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
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
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
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
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 min-h-[42px] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 min-h-[42px] cursor-pointer"
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
