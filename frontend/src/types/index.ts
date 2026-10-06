export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PARENT';

export const OFFICIAL_SHIFTS = [
  'Lunes, miércoles y viernes de 16:45 a 18',
  'Lunes, miércoles y viernes de 17:30 a 19',
  'Martes y Jueves de 16 a 18',
  'Lunes y miércoles de 8 a 10',
];

export interface AdminPermissions {
  canAttendance?: boolean;
  canPickups?: boolean;
  canHistory?: boolean;
}

export interface AdminUser {
  id: string;
  dni: string;
  fullName: string;
  role: UserRole;
  password?: string;
  permissions: AdminPermissions;
}

export interface AuthorizedPerson {
  id: string;
  studentId: string;
  fullName: string;
  dni: string;
  relationship: string;
  phone?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  shift: string;
  notes?: string;
  authorizedPeople: AuthorizedPerson[];
}

export interface PickupRecord {
  id: string;
  attendanceId: string;
  authorizedPersonId: string;
  pickupTime: string;
  notes?: string;
  authorizedPerson: AuthorizedPerson;
  recordedBy?: {
    fullName: string;
    dni?: string;
  };
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
  isMakeup?: boolean;
  makeupShift?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: Student;
  recordedBy?: {
    fullName: string;
  };
  pickups?: PickupRecord[];
}

export interface TodayStudentAttendance {
  student: Student;
  attendanceId: string | null;
  status: 'PRESENT' | 'ABSENT' | null;
  isMakeup?: boolean;
  makeupShift?: string;
  date: string;
  recordedBy: { fullName: string; dni: string } | null;
  pickups: PickupRecord[];
}

export interface ShiftAssistant {
  id: string;
  date: string;
  shift: string;
  teacherId: string;
  createdAt?: string;
  teacher: {
    id: string;
    fullName: string;
    dni: string;
  };
}

export interface LoginResponse {
  type: 'ADMIN' | 'PARENT' | 'PASSWORD_REQUIRED' | 'DUAL_ROLE_REQUIRED';
  user?: AdminUser;
  fullName?: string;
  adminName?: string;
  studentName?: string;
  role?: UserRole;
  student?: Student & {
    attendances: AttendanceRecord[];
  };
}
