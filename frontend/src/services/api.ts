import { LoginResponse, AdminUser, Student, TodayStudentAttendance, AttendanceRecord, PickupRecord, ShiftAssistant } from '../types';

const API_BASE = '/api';

async function parseResponse(res: Response): Promise<any> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error('Error en el servidor Supabase. Por favor intentá ingresar nuevamente.');
    }
    throw new Error('Respuesta no válida del servidor.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Error en la base de datos Supabase');
  }

  return data;
}

export async function loginWithDNI(dni: string, password?: string, roleChoice?: 'ADMIN' | 'STUDENT'): Promise<LoginResponse> {
  const cleanDni = dni.trim();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni: cleanDni, password, roleChoice }),
  });
  return parseResponse(res);
}

// Admins (Profesores)
export async function getTeachers(userDni: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/admin/teachers`, {
    headers: { 'x-user-dni': userDni },
  });
  return parseResponse(res);
}

export async function createTeacher(userDni: string, teacherData: { dni: string; fullName: string; password?: string; permissions: any }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/teachers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(teacherData),
  });
  return parseResponse(res);
}

export async function updateTeacher(userDni: string, id: string, teacherData: { fullName?: string; password?: string; permissions?: any }): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-dni': userDni,
    },
    body: JSON.stringify(teacherData),
  });
  return parseResponse(res);
}

export async function deleteTeacher(userDni: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/teachers/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-dni': userDni },
  });
  return parseResponse(res);
}

// Alumnas
export async function getStudents(shift?: string, status?: string): Promise<Student[]> {
  const params = new URLSearchParams();
  if (shift) params.append('shift', shift);
  if (status) params.append('status', status);
  const queryString = params.toString();
  const url = queryString ? `${API_BASE}/students?${queryString}` : `${API_BASE}/students`;
  const res = await fetch(url);
  return parseResponse(res);
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
  return parseResponse(res);
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
  return parseResponse(res);
}

export async function deleteStudent(userDni: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/students/${id}`, {
    method: 'DELETE',
    headers: { 'x-user-dni': userDni },
  });
  return parseResponse(res);
}

// Turnos
export async function getShifts(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/students/shifts`);
  return parseResponse(res);
}

// Asistencia
export async function getTodayAttendance(shift?: string, date?: string): Promise<{ date: string; shift: string; todayDayName: string; students: TodayStudentAttendance[]; assistants?: ShiftAssistant[] }> {
  const params = new URLSearchParams();
  if (shift) params.append('shift', shift);
  if (date) params.append('date', date);
  const url = `${API_BASE}/attendance/today?${params.toString()}`;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function saveAttendance(studentId: string, status: 'PRESENT' | 'ABSENT', recordedByAdminId?: string, date?: string, isMakeup?: boolean, makeupShift?: string, shift?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, status, recordedByAdminId, date, isMakeup, makeupShift, shift }),
  });
  return parseResponse(res);
}

export async function getAttendanceHistory(date?: string, shift?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (shift) params.append('shift', shift);
  const res = await fetch(`${API_BASE}/attendance/history?${params.toString()}`);
  return parseResponse(res);
}

// Retiros
export async function savePickup(data: { attendanceId: string; authorizedPersonId: string; recordedByAdminId?: string; notes?: string }): Promise<PickupRecord> {
  const res = await fetch(`${API_BASE}/pickups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}

// Profesoras Acompañantes / Ayudantes
export async function getPublicTeachers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE}/attendance/teachers`);
  return parseResponse(res);
}

export async function getShiftAssistants(date?: string, shift?: string): Promise<ShiftAssistant[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (shift) params.append('shift', shift);
  const res = await fetch(`${API_BASE}/attendance/assistants?${params.toString()}`);
  return parseResponse(res);
}

export async function addShiftAssistant(date: string, shift: string, teacherId: string): Promise<ShiftAssistant> {
  const res = await fetch(`${API_BASE}/attendance/assistants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, shift, teacherId }),
  });
  return parseResponse(res);
}

export async function removeShiftAssistant(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/attendance/assistants/${id}`, {
    method: 'DELETE',
  });
  return parseResponse(res);
}
