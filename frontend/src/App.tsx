import React, { useState, useEffect } from 'react';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { AttendanceView } from './components/Admin/AttendanceView';
import { PickupsView } from './components/Admin/PickupsView';
import { StudentManagement } from './components/Admin/StudentManagement';
import { AdminManagement } from './components/Admin/AdminManagement';
import { HistoryView } from './components/Admin/HistoryView';
import { ParentPortal } from './components/Parent/ParentPortal';
import { LoginResponse, AdminUser, Student, AttendanceRecord, OFFICIAL_SHIFTS } from './types';

const SESSION_STORAGE_KEY = 'vulpiare_session_active';

export function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [parentStudent, setParentStudent] = useState<
    (Student & { attendances: AttendanceRecord[] }) | null
  >(null);

  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [selectedShift, setSelectedShift] = useState<string>(OFFICIAL_SHIFTS[0]);

  // Restaurar sesión persistente al abrir la aplicación
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.type === 'ADMIN' && parsed.user) {
          setCurrentUser(parsed.user);
        } else if (parsed.type === 'PARENT' && parsed.student) {
          setParentStudent(parsed.student);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  const handleLoginSuccess = (data: LoginResponse) => {
    if (data.type === 'ADMIN' && data.user) {
      setCurrentUser(data.user);
      setParentStudent(null);
      setActiveTab('attendance');
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ type: 'ADMIN', user: data.user }));
    } else if (data.type === 'PARENT' && data.student) {
      setParentStudent(data.student);
      setCurrentUser(null);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ type: 'PARENT', student: data.student }));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setParentStudent(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
          onLogout={handleLogout}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'attendance' && (
            <AttendanceView
              shift={selectedShift}
              user={currentUser}
              onShiftChange={(newShift) => setSelectedShift(newShift)}
              onNavigateToPickups={() => setActiveTab('pickups')}
            />
          )}

          {activeTab === 'pickups' && (
            <PickupsView
              shift={selectedShift}
              user={currentUser}
              onShiftChange={(newShift) => setSelectedShift(newShift)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              shift={selectedShift}
              onShiftChange={(newShift) => setSelectedShift(newShift)}
            />
          )}

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
