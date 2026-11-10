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
  plan?: string | null;
  monthlyFee?: number | null;
  schedule?: { day: string; shift: string }[] | null;
}

export type StudentStatus = 'ACTIVE' | 'TEMPORARILY_INACTIVE' | 'INACTIVE';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  shift: string;
  status?: StudentStatus;
  notes?: string;
  phone?: string;
  plan?: string | null;
  monthlyFee?: number | null;
  schedule?: { day: string; shift: string }[] | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  authorizedPeople: AuthorizedPerson[];
  attendances?: AttendanceRecord[];
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
  studentId?: string;
  date: string;
  shift?: string;
  status: 'PRESENT' | 'ABSENT' | 'PENDING';
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
  status: 'PRESENT' | 'ABSENT' | 'PENDING' | null;
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

export type PaymentMethod = 'TRANSFER' | 'CASH';

export interface PaymentConcept {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  month: string; // Formato YYYY-MM
  amount: number;
  expectedAmount?: number;
  remainingDebt?: number;
  isPartial?: boolean;
  concept?: string;
  operationNumber?: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string | null;
  notes?: string | null;
  paidAt: string;
  createdAt?: string;
  updatedAt?: string;
  student?: Student;
  recordedBy?: {
    id?: string;
    fullName: string;
    dni?: string;
  };
}


export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  date: string; // Formato YYYY-MM-DD
  month: string; // Formato YYYY-MM
  category?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recordedByAdminId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  recordedBy?: {
    id?: string;
    fullName: string;
    dni?: string;
  };
}
