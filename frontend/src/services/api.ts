import {
  AdminUser,
  Student,
  TodayStudentAttendance,
  AttendanceRecord,
  PickupRecord,
  LoginResponse,
  ShiftAssistant,
  PaymentRecord,
  PaymentConcept,
  FixedExpense,
} from '../types';

const API_BASE = '/api';

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && data.error) errorMsg = data.error;
    } catch (e) {
      // Ignorar fallo de parseo JSON
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

// Autenticación Unificada (Profesores, Super Admin y Padres)
export async function loginWithDNI(dni: string, password?: string, roleChoice?: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password, roleChoice }),
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

export async function getStudentById(id: string): Promise<Student> {
  const res = await fetch(`${API_BASE}/students/${id}`);
  return parseResponse(res);
}
export async function acceptStudentTerms(studentId: string, version: string = '2026.11'): Promise<{ success: boolean; student: Partial<Student> }> {
  const res = await fetch(`${API_BASE}/students/${studentId}/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version }),
  });
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

export async function saveAttendance(studentId: string, status: 'PRESENT' | 'ABSENT' | 'PENDING', recordedByAdminId?: string, date?: string, isMakeup?: boolean, makeupShift?: string, shift?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, status, recordedByAdminId, date, isMakeup, makeupShift, shift }),
  });
  return parseResponse(res);
}

export async function requestMakeupClass(studentId: string, date: string, shift: string): Promise<AttendanceRecord> {
  const res = await fetch(`${API_BASE}/attendance/makeup-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, date, shift }),
  });
  return parseResponse(res);
}

export async function cancelMakeupClass(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/attendance/makeup-request/${id}`, {
    method: 'DELETE',
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

export async function getStudentAttendances(studentId: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${API_BASE}/attendance/student/${studentId}`);
  return parseResponse(res);
}

export async function deleteAttendance(id: string, userDni?: string): Promise<{ success: boolean; message: string }> {
  const headers: Record<string, string> = {};
  if (userDni) headers['x-user-dni'] = userDni;
  const res = await fetch(`${API_BASE}/attendance/${id}`, {
    method: 'DELETE',
    headers,
  });
  return parseResponse(res);
}

// Retiros
export interface SavePickupPayload {
  attendanceId: string;
  authorizedPersonId?: string;
  newAuthorizedPerson?: {
    fullName: string;
    relationship: string;
    dni?: string;
    phone?: string;
  };
  recordedByAdminId?: string;
  notes?: string;
}

export async function savePickup(data: SavePickupPayload): Promise<PickupRecord> {
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

// =========================================================================
// ABM Conceptos de Pago (Gestión de Aranceles)
// =========================================================================

export async function getPaymentConcepts(): Promise<PaymentConcept[]> {
  const res = await fetch(`${API_BASE}/payments/concepts`);
  return parseResponse(res);
}

export async function createPaymentConcept(data: { name: string; amount: number; description?: string }): Promise<PaymentConcept> {
  const res = await fetch(`${API_BASE}/payments/concepts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}

export async function updatePaymentConcept(
  id: string,
  data: { name?: string; amount?: number; description?: string; isActive?: boolean }
): Promise<PaymentConcept> {
  const res = await fetch(`${API_BASE}/payments/concepts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}

export async function deletePaymentConcept(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/payments/concepts/${id}`, {
    method: 'DELETE',
  });
  return parseResponse(res);
}

// =========================================================================
// Control de Pagos
// =========================================================================

export async function getPayments(month?: string, studentId?: string): Promise<PaymentRecord[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (studentId) params.append('studentId', studentId);
  const queryString = params.toString();
  const url = queryString ? `${API_BASE}/payments?${queryString}` : `${API_BASE}/payments`;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function savePayment(paymentData: {
  studentId: string;
  month: string;
  amount: number;
  expectedAmount?: number;
  concept?: string;
  operationNumber?: string;
  paymentMethod: 'TRANSFER' | 'CASH';
  receiptUrl?: string | null;
  notes?: string | null;
  recordedByAdminId?: string;
  paidAt?: string;
}): Promise<PaymentRecord> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return parseResponse(res);
}

export async function updatePayment(
  id: string,
  paymentData: {
    amount?: number;
    expectedAmount?: number;
    concept?: string;
    operationNumber?: string;
    paymentMethod?: 'TRANSFER' | 'CASH';
    receiptUrl?: string | null;
    notes?: string | null;
    paidAt?: string;
  }
): Promise<PaymentRecord> {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  return parseResponse(res);
}

export async function deletePayment(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'DELETE',
  });
  return parseResponse(res);
}

export async function resetMonthPayments(studentId: string, month: string): Promise<{ success: boolean; message: string }> {
  const params = new URLSearchParams({ studentId, month });
  const res = await fetch(`${API_BASE}/payments/reset-month?${params.toString()}`, {
    method: 'DELETE',
  });
  return parseResponse(res);
}


// =========================================================================
// Gastos Fijos (Super Admin)
// =========================================================================

export async function getExpenses(month?: string): Promise<FixedExpense[]> {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  const queryString = params.toString();
  const url = queryString ? `${API_BASE}/expenses?${queryString}` : `${API_BASE}/expenses`;
  const res = await fetch(url);
  return parseResponse(res);
}

export async function createExpense(expenseData: {
  title: string;
  amount: number;
  date?: string;
  month?: string;
  category?: string;
  receiptUrl?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recordedByAdminId?: string;
}): Promise<FixedExpense> {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
  return parseResponse(res);
}

export async function updateExpense(
  id: string,
  expenseData: Partial<FixedExpense>
): Promise<FixedExpense> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
  return parseResponse(res);
}

export async function deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
  });
  return parseResponse(res);
}

export async function replicateExpense(
  id: string,
  targetMonth: string,
  amount?: number
): Promise<FixedExpense> {
  const res = await fetch(`${API_BASE}/expenses/${id}/replicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetMonth, amount }),
  });
  return parseResponse(res);
}

export async function replicateMonthExpenses(
  fromMonth: string,
  toMonth: string,
  expenseIds?: string[],
  customAmounts?: Record<string, number>
): Promise<{ success: boolean; message: string; expenses: FixedExpense[] }> {
  const res = await fetch(`${API_BASE}/expenses/replicate-month`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromMonth, toMonth, expenseIds, customAmounts }),
  });
  return parseResponse(res);
}
