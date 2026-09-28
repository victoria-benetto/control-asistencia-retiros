export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PARENT';

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
  date: string;
  recordedBy: { fullName: string; dni: string } | null;
  pickups: PickupRecord[];
}

export interface LoginResponse {
  type: 'ADMIN' | 'PARENT';
  user?: AdminUser;
  student?: Student & {
    attendances: AttendanceRecord[];
  };
}
