import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, X, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from '../../services/api';
import { AdminUser } from '../../types';

interface AdminManagementProps {
  user: AdminUser;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ user }) => {
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="font-extrabold text-rose-900 text-lg">Acceso Restringido</h3>
        <p className="text-xs text-rose-700 mt-2 font-medium">
          El módulo de ABM de Profesores y Permisos solo puede ser administrado por <strong>Victoria</strong>.
        </p>
      </div>
    );
  }

  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<AdminUser | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Form State
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [canAttendance, setCanAttendance] = useState(true);
  const [canPickups, setCanPickups] = useState(true);
  const [canHistory, setCanHistory] = useState(true);

  const fetchTeachersList = async () => {
    setLoading(true);
    try {
      const data = await getTeachers(user.dni);
      setTeachers(data);
    } catch (err) {
      alert('Error al obtener lista de profesores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachersList();
  }, []);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFullName('');
    setDni('');
    setPassword('123456');
    setShowModalPassword(false);
    setCanAttendance(true);
    setCanPickups(true);
    setCanHistory(true);
    setModalOpen(true);
  };

  const openEditModal = (t: AdminUser) => {
    setEditingTeacher(t);
    setFullName(t.fullName);
    setDni(t.dni);
    setPassword(t.password || '');
    setShowModalPassword(false);
    const perms = t.permissions || {};
    setCanAttendance(perms.canAttendance !== false);
    setCanPickups(perms.canPickups !== false);
    setCanHistory(perms.canHistory !== false);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !dni.trim()) {
      alert('Nombre y DNI son requeridos.');
      return;
    }

    const permissionsObj = {
      canAttendance,
      canPickups,
      canHistory,
    };

    try {
      if (editingTeacher) {
        await updateTeacher(user.dni, editingTeacher.id, {
          fullName,
          password: password.trim(),
          permissions: permissionsObj,
        });
      } else {
        await createTeacher(user.dni, {
          fullName,
          dni,
          password: password.trim() || '123456',
          permissions: permissionsObj,
        });
      }
      setModalOpen(false);
      fetchTeachersList();
    } catch (err: any) {
      alert(err.message || 'Error al guardar profesor.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta de ${name}?`)) return;
    try {
      await deleteTeacher(user.dni, id);
      fetchTeachersList();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-pink-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Módulo Exclusivo Super Admin
          </span>
          <h2 className="text-xl sm:text-2xl font-black">Gestión de Profesores y Permisos</h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-0.5">
            Administrá las profesoras, contraseñas de acceso y permisos.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-3 bg-white text-purple-900 hover:bg-purple-50 font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Nuevo Profesor</span>
        </button>
      </div>

      {/* Lista de Profesores */}
      {loading ? (
        <p className="text-center py-8 text-slate-500 text-xs">Cargando profesores...</p>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
          {teachers.map((t) => {
            const isSelfSuperAdmin = t.dni === '44122509';
            const perms = t.permissions || {};
            const isPasswordVisible = !!visiblePasswords[t.id];

            return (
              <div key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-slate-900 text-base">{t.fullName}</h4>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isSelfSuperAdmin ? 'bg-amber-100 text-amber-900' : 'bg-purple-100 text-purple-900'
                      }`}
                    >
                      {isSelfSuperAdmin ? 'Super Admin' : 'Profesora'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>DNI: <strong className="font-mono text-slate-700">{t.dni}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <span>Clave:</span>
                      <strong className="font-mono text-slate-700">
                        {isPasswordVisible ? (t.password || '123456') : '••••••••'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(t.id)}
                        className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-purple-700 transition-colors"
                        title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-purple-600" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </span>
                  </div>

                  {/* Badges de Permisos */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {perms.canAttendance !== false && (
                      <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md font-bold">
                        ✓ Tomar Asistencia
                      </span>
                    )}
                    {perms.canPickups !== false && (
                      <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-100 px-2 py-0.5 rounded-md font-bold">
                        ✓ Registrar Retiros
                      </span>
                    )}
                    {perms.canHistory !== false && (
                      <span className="text-[11px] bg-purple-50 text-purple-800 border border-purple-100 px-2 py-0.5 rounded-md font-bold">
                        ✓ Ver Historial
                      </span>
                    )}
                  </div>
                </div>

                {!isSelfSuperAdmin && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2.5 rounded-2xl bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDelete(t.id, t.fullName)}
                      className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Profesor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg p-6 relative animate-fadeIn">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-5">
              {editingTeacher ? 'Modificar Profesor' : 'Nuevo Profesor'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Profe María"
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">DNI de Acceso</label>
                <input
                  type="text"
                  value={dni}
                  disabled={!!editingTeacher}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 43213538"
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-60 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Contraseña de Acceso</span>
                </label>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ej: 123456"
                    className="w-full px-3.5 py-3 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[44px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                    title={showModalPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4 text-purple-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkboxes de Permisos */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-extrabold text-slate-800">
                  Permisos Habilitados:
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={canAttendance}
                      onChange={(e) => setCanAttendance(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Tomar Asistencia</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={canPickups}
                      onChange={(e) => setCanPickups(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Registrar Retiros</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={canHistory}
                      onChange={(e) => setCanHistory(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Ver Historial</span>
                  </label>
                </div>
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
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 min-h-[42px]"
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
