import { LoginResponse, AdminUser, Student, TodayStudentAttendance, AttendanceRecord, PickupRecord } from '../types';

const API_BASE = '/api';

export async function loginWithDNI(dni: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al iniciar sesión');
  }
  return res.json();
}

// Admins (Profesores)
export async function getTeachers(userDni: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/teachers`, {
    headers: { 'x-user-dni': userDni },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al obtener lista de profesores');
  }
  return res.json();
}

export async function createTeacher(userDni: string, teacherData: { dni: string; fullName: string; permissions: any }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(teacherData),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al crear profesor');
  }
  return res.json();
}

export async function updateTeacher(userDni: string, id: string, teacherData: { fullName?: string; permissions?: any }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(teacherData),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al actualizar profesor');
  }
  return res.json();
}

export async function deleteTeacher(userDni: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-dni': userDni },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al eliminar profesor');
  }
}

// Alumnas
export async function getStudents(shift?: string): Promise<Student[]> {
  const url = shift ? `${API_BASE}/students?shift=${encodeURIComponent(shift)}` : `${API_BASE}/students`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener alumnas');
  return res.json();
}

export async function createStudent(userDni: string, studentData: any): Promise<Student> {
  const res = await fetch(`${API_BASE}/admin/students`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al crear alumna');
  }
  return res.json();
}

export async function updateStudent(userDni: string, id: string, studentData: any): Promise<Student> {
  const res = await fetch(`${API_BASE}/admin/students/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(studentData),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al actualizar alumna');
  }
  return res.json();
}

export async function deleteStudent(userDni: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/students/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-dni': userDni },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al eliminar alumna');
  }
}

// Turnos
export async function getShifts(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/students/shifts`);
  if (!res.ok) throw new Error('Error al obtener turnos');
  return res.json();
}

// Asistencia
export async function getTodayAttendance(shift?: string): Promise<{ date: string; shift: string; todayDayName: string; students: TodayStudentAttendance[] }> {
  const url = shift ? `${API_BASE}/attendance/today?shift=${encodeURIComponent(shift)}` : `${API_BASE}/attendance/today`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al consultar asistencia de hoy');
  return res.json();
}

export async function saveAttendance(studentId: string, status: 'PRESENT' | 'ABSENT', recordedByAdminId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, status, recordedByAdminId }),
  });
  if (!res.ok) throw new Error('Error al guardar asistencia');
  return res.json();
}

export async function getAttendanceHistory(date?: string, shift?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (shift) params.append('shift', shift);
  const res = await fetch(`${API_BASE}/attendance/history?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener historial');
  return res.json();
}

// Retiros
export async function savePickup(data: { attendanceId: string; authorizedPersonId: string; recordedByAdminId?: string; notes?: string }): Promise<PickupRecord> {
  const res = await fetch(`${API_BASE}/pickups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al registrar retiro');
  }
  return res.json();
}
