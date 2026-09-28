import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, UserPlus, X, Save, Search } from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent, getShifts } from '../../services/api';
import { Student, AdminUser } from '../../types';

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
          El módulo de ABM de Alumnas solo puede ser administrado por <strong>Victoria</strong>.
        </p>
      </div>
    );
  }

  const [students, setStudents] = useState<Student[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [shift, setShift] = useState('Lunes');
  const [notes, setNotes] = useState('');
  const [authorizedPeople, setAuthorizedPeople] = useState<
    Array<{ fullName: string; dni: string; relationship: string; phone: string }>
  >([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sList, shList] = await Promise.all([getStudents(), getShifts()]);
      setStudents(sList);
      setShifts(shList);
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
    setShift('Lunes');
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
    setNotes(s.notes || '');
    setAuthorizedPeople(
      s.authorizedPeople.length > 0
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
          shift,
          notes,
          authorizedPeople: validPeople,
        });
      } else {
        await createStudent(user.dni, {
          firstName,
          lastName,
          dni,
          shift,
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de dar de baja a ${name}?`)) return;
    try {
      await deleteStudent(user.dni, id);
      fetchAll();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar alumna.');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.firstName.toLowerCase().includes(search.toLowerCase()) ||
      s.lastName.toLowerCase().includes(search.toLowerCase()) ||
      s.dni.includes(search) ||
      s.shift.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Módulo Exclusivo Super Admin
          </span>
          <h2 className="text-xl sm:text-2xl font-black">ABM de Alumnas y Autorizados</h2>
          <p className="text-amber-100 text-xs sm:text-sm mt-0.5">
            Gestión de alumnas registradas en VULPIARE y sus autorizados.
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

      {/* Buscador */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar alumna..."
          className="w-full text-xs font-bold border-none focus:outline-none bg-transparent"
        />
      </div>

      {/* Lista de Alumnas */}
      {loading ? (
        <p className="text-center py-8 text-slate-500 text-xs">Cargando alumnas...</p>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              No se encontraron alumnas.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 text-base">
                      {s.firstName} {s.lastName}
                    </h4>
                    <span className="bg-purple-50 text-purple-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-purple-100">
                      Turno {s.shift}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    DNI: <span className="font-mono text-slate-700 font-bold">{s.dni}</span>
                  </p>

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
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Baja</span>
                  </button>
                </div>
              </div>
            ))
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
                    disabled={!!editingStudent}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Ej: 55111222"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 min-h-[44px]"
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
                        Turno {sh}
                      </option>
                    ))}
                  </select>
                </div>
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
