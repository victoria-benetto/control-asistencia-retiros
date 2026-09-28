import React, { useState, useEffect } from 'react';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { AttendanceView } from './components/Admin/AttendanceView';
import { PickupsView } from './components/Admin/PickupsView';
import { StudentManagement } from './components/Admin/StudentManagement';
import { AdminManagement } from './components/Admin/AdminManagement';
import { HistoryView } from './components/Admin/HistoryView';
import { ParentPortal } from './components/Parent/ParentPortal';
import { LoginResponse, AdminUser, Student, AttendanceRecord } from './types';
import { getShifts } from './services/api';

export function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [parentStudent, setParentStudent] = useState<
    (Student & { attendances: AttendanceRecord[] }) | null
  >(null);

  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [selectedShift, setSelectedShift] = useState<string>('Lunes');
  const [availableShifts, setAvailableShifts] = useState<string[]>(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);

  // Cargar turnos disponibles al iniciar
  useEffect(() => {
    getShifts()
      .then((shifts) => {
        if (shifts && shifts.length > 0) {
          setAvailableShifts(shifts);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (data: LoginResponse) => {
    if (data.type === 'ADMIN' && data.user) {
      setCurrentUser(data.user);
      setParentStudent(null);
      setActiveTab('attendance');
    } else if (data.type === 'PARENT' && data.student) {
      setParentStudent(data.student);
      setCurrentUser(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setParentStudent(null);
  };

  // 1. Si no hay sesión iniciada, mostrar Login Único por DNI
  if (!currentUser && !parentStudent) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Si el usuario ingresó como Padre/Tutor
  if (parentStudent) {
    return <ParentPortal student={parentStudent} onLogout={handleLogout} />;
  }

  // 3. Si el usuario ingresó como Profesora / Super Admin
  if (currentUser) {
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar
          user={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedShift={selectedShift}
          setSelectedShift={setSelectedShift}
          availableShifts={availableShifts}
          onLogout={handleLogout}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'attendance' && (
            <AttendanceView
              shift={selectedShift}
              user={currentUser}
              onNavigateToPickups={() => setActiveTab('pickups')}
            />
          )}

          {activeTab === 'pickups' && (
            <PickupsView shift={selectedShift} user={currentUser} />
          )}

          {activeTab === 'history' && <HistoryView shift={selectedShift} />}

          {/* Módulos Exclusivos Super Admin */}
          {activeTab === 'students' && isSuperAdmin && (
            <StudentManagement user={currentUser} />
          )}

          {activeTab === 'teachers' && isSuperAdmin && (
            <AdminManagement user={currentUser} />
          )}
        </main>
      </div>
    );
  }

  return null;
}

export default App;
