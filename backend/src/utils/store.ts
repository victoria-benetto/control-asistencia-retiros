import fs from 'fs';
import path from 'path';

// Interfaces de datos
export interface AdminUser {
  id: string;
  dni: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  permissions: {
    canAttendance?: boolean;
    canPickups?: boolean;
    canHistory?: boolean;
  };
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

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT';
  recordedByAdminId?: string;
}

export interface PickupRecord {
  id: string;
  attendanceId: string;
  authorizedPersonId: string;
  pickupTime: string; // ISO DateTime
  recordedByAdminId?: string;
  notes?: string;
}

interface DatabaseSchema {
  admins: AdminUser[];
  students: Student[];
  attendances: AttendanceRecord[];
  pickups: PickupRecord[];
}

// Datos iniciales de sembrado (Victoria Super Admin 44122509, Profe María, Alumnas Pepa, Pepita, Popa, Sofía)
const INITIAL_DATA: DatabaseSchema = {
  admins: [
    {
      id: 'admin-victoria-44122509',
      dni: '44122509',
      fullName: 'Victoria',
      role: 'SUPER_ADMIN',
      permissions: { canAttendance: true, canPickups: true, canHistory: true },
    },
    {
      id: 'admin-maria-43213538',
      dni: '43213538',
      fullName: 'Profe María',
      role: 'ADMIN',
      permissions: { canAttendance: true, canPickups: true, canHistory: true },
    },
  ],
  students: [
    {
      id: 'student-pepa',
      firstName: 'Pepa',
      lastName: 'Pérez',
      dni: '55111222',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: [
        { id: 'auth-1', studentId: 'student-pepa', fullName: 'Juan Pérez', dni: '30111222', relationship: 'Papá', phone: '1144556677' },
        { id: 'auth-2', studentId: 'student-pepa', fullName: 'Ana Gómez', dni: '30111223', relationship: 'Mamá', phone: '1144556678' },
      ],
    },
    {
      id: 'student-pepita',
      firstName: 'Pepita',
      lastName: 'Gómez',
      dni: '55222333',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: [
        { id: 'auth-3', studentId: 'student-pepita', fullName: 'Carlos Gómez', dni: '30222333', relationship: 'Papá', phone: '1155667788' },
        { id: 'auth-4', studentId: 'student-pepita', fullName: 'María Rodríguez', dni: '20111222', relationship: 'Abuela', phone: '1155667789' },
      ],
    },
    {
      id: 'student-popa',
      firstName: 'Popa',
      lastName: 'López',
      dni: '55333444',
      shift: 'Lunes',
      notes: '',
      authorizedPeople: [
        { id: 'auth-5', studentId: 'student-popa', fullName: 'Lucía López', dni: '30333444', relationship: 'Mamá', phone: '1166778899' },
        { id: 'auth-6', studentId: 'student-popa', fullName: 'Esteban López', dni: '31333444', relationship: 'Tío', phone: '1166778800' },
      ],
    },
    {
      id: 'student-sofia',
      firstName: 'Sofía',
      lastName: 'Martínez',
      dni: '55444555',
      shift: 'Martes',
      notes: '',
      authorizedPeople: [
        { id: 'auth-7', studentId: 'student-sofia', fullName: 'Gonzalo Martínez', dni: '30444555', relationship: 'Papá', phone: '1177889900' },
      ],
    },
  ],
  attendances: [],
  pickups: [],
};

// Determinar ubicación del archivo de persistencia
const filePath = process.env.VERCEL === '1'
  ? '/tmp/vulpiare_store.json'
  : path.join(__dirname, '../../data.json');

// Memoria cache
let memoryStore: DatabaseSchema | null = null;

function loadStore(): DatabaseSchema {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      memoryStore = JSON.parse(content);
      // Garantizar que Victoria siempre existe
      if (!memoryStore!.admins.some(a => a.dni === '44122509')) {
        memoryStore!.admins.unshift(INITIAL_DATA.admins[0]);
      }
      return memoryStore!;
    }
  } catch (e) {
    console.error('Error al leer storage file:', e);
  }

  // Si no existe, inicializar con INITIAL_DATA
  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  saveStore();
  return memoryStore!;
}

function saveStore() {
  if (!memoryStore) return;
  try {
    fs.writeFileSync(filePath, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (e) {
    // Si /tmp o disco local no permite escritura en Serverless, se mantiene en memoria Lambda
  }
}

// --- METODOS DE ACCESO A DATOS ---

export const DataStore = {
  // Admins / Profesores
  getAdminByDni(dni: string): AdminUser | undefined {
    const store = loadStore();
    return store.admins.find((a) => a.dni === dni.trim());
  },

  getAllAdmins(): AdminUser[] {
    const store = loadStore();
    return store.admins;
  },

  createAdmin(data: { dni: string; fullName: string; permissions?: any }): AdminUser {
    const store = loadStore();
    const newAdmin: AdminUser = {
      id: `admin-${Date.now()}`,
      dni: data.dni.trim(),
      fullName: data.fullName.trim(),
      role: 'ADMIN',
      permissions: data.permissions || { canAttendance: true, canPickups: true, canHistory: true },
    };
    store.admins.push(newAdmin);
    saveStore();
    return newAdmin;
  },

  updateAdmin(id: string, data: { fullName?: string; permissions?: any }): AdminUser | null {
    const store = loadStore();
    const index = store.admins.findIndex((a) => a.id === id);
    if (index === -1) return null;
    if (store.admins[index].dni === '44122509') {
      data.fullName = 'Victoria'; // Mantener Victoria
    }
    store.admins[index] = {
      ...store.admins[index],
      fullName: data.fullName ? data.fullName.trim() : store.admins[index].fullName,
      permissions: data.permissions ? data.permissions : store.admins[index].permissions,
    };
    saveStore();
    return store.admins[index];
  },

  deleteAdmin(id: string): boolean {
    const store = loadStore();
    const admin = store.admins.find((a) => a.id === id);
    if (!admin || admin.dni === '44122509') return false;
    store.admins = store.admins.filter((a) => a.id !== id);
    saveStore();
    return true;
  },

  // Alumnas
  getStudentByDni(dni: string): Student | undefined {
    const store = loadStore();
    return store.students.find((s) => s.dni === dni.trim());
  },

  getStudentByAuthorizedDni(dni: string): Student | undefined {
    const store = loadStore();
    return store.students.find((s) =>
      s.authorizedPeople.some((ap) => ap.dni === dni.trim())
    );
  },

  getAllStudents(shift?: string): Student[] {
    const store = loadStore();
    if (shift) {
      return store.students.filter((s) => s.shift.toLowerCase() === shift.toLowerCase());
    }
    return store.students;
  },

  getStudentById(id: string): Student | undefined {
    const store = loadStore();
    return store.students.find((s) => s.id === id);
  },

  createStudent(data: { firstName: string; lastName: string; dni: string; shift: string; notes?: string; authorizedPeople?: any[] }): Student {
    const store = loadStore();
    const studentId = `student-${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      dni: data.dni.trim(),
      shift: data.shift.trim(),
      notes: data.notes ? data.notes.trim() : '',
      authorizedPeople: Array.isArray(data.authorizedPeople)
        ? data.authorizedPeople.map((ap: any, i: number) => ({
            id: `auth-${Date.now()}-${i}`,
            studentId,
            fullName: ap.fullName.trim(),
            dni: ap.dni.trim(),
            relationship: ap.relationship.trim(),
            phone: ap.phone ? ap.phone.trim() : '',
          }))
        : [],
    };
    store.students.push(newStudent);
    saveStore();
    return newStudent;
  },

  updateStudent(id: string, data: { firstName?: string; lastName?: string; shift?: string; notes?: string; authorizedPeople?: any[] }): Student | null {
    const store = loadStore();
    const index = store.students.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const current = store.students[index];
    store.students[index] = {
      ...current,
      firstName: data.firstName ? data.firstName.trim() : current.firstName,
      lastName: data.lastName ? data.lastName.trim() : current.lastName,
      shift: data.shift ? data.shift.trim() : current.shift,
      notes: data.notes !== undefined ? data.notes.trim() : current.notes,
      authorizedPeople: Array.isArray(data.authorizedPeople)
        ? data.authorizedPeople.map((ap: any, i: number) => ({
            id: ap.id || `auth-${Date.now()}-${i}`,
            studentId: id,
            fullName: ap.fullName.trim(),
            dni: ap.dni.trim(),
            relationship: ap.relationship.trim(),
            phone: ap.phone ? ap.phone.trim() : '',
          }))
        : current.authorizedPeople,
    };
    saveStore();
    return store.students[index];
  },

  deleteStudent(id: string): boolean {
    const store = loadStore();
    const index = store.students.findIndex((s) => s.id === id);
    if (index === -1) return false;
    store.students.splice(index, 1);

    // Eliminar asistencias y retiros vinculados
    store.attendances = store.attendances.filter((a) => a.studentId !== id);
    saveStore();
    return true;
  },

  // Turnos
  getAvailableShifts(): string[] {
    const store = loadStore();
    const defaultShifts = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const dbShifts = store.students.map((s) => s.shift);
    return Array.from(new Set([...defaultShifts, ...dbShifts]));
  },

  // Asistencia
  getTodayAttendance(date: string, shift: string) {
    const store = loadStore();
    const shiftStudents = store.students.filter((s) => s.shift.toLowerCase() === shift.toLowerCase());

    const result = shiftStudents.map((student) => {
      const record = store.attendances.find((a) => a.studentId === student.id && a.date === date);
      const adminObj = record?.recordedByAdminId ? store.admins.find((a) => a.id === record.recordedByAdminId) : null;
      
      // Retiros vinculados a esta asistencia
      const recordPickups = record
        ? store.pickups
            .filter((p) => p.attendanceId === record.id)
            .map((p) => {
              const ap = student.authorizedPeople.find((ap) => ap.id === p.authorizedPersonId);
              const teacherObj = p.recordedByAdminId ? store.admins.find((a) => a.id === p.recordedByAdminId) : null;
              return {
                ...p,
                authorizedPerson: ap || { id: p.authorizedPersonId, studentId: student.id, fullName: 'Persona Autorizada', dni: '', relationship: 'Familiar' },
                recordedBy: teacherObj ? { fullName: teacherObj.fullName, dni: teacherObj.dni } : { fullName: 'Victoria' },
              };
            })
        : [];

      return {
        student,
        attendanceId: record?.id || null,
        status: record?.status || null,
        date,
        recordedBy: adminObj ? { fullName: adminObj.fullName, dni: adminObj.dni } : null,
        pickups: recordPickups,
      };
    });

    return result;
  },

  saveAttendance(studentId: string, date: string, status: 'PRESENT' | 'ABSENT', recordedByAdminId?: string): AttendanceRecord {
    const store = loadStore();
    let record = store.attendances.find((a) => a.studentId === studentId && a.date === date);

    if (record) {
      record.status = status;
      record.recordedByAdminId = recordedByAdminId || record.recordedByAdminId;
    } else {
      record = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        studentId,
        date,
        status,
        recordedByAdminId,
      };
      store.attendances.push(record);
    }

    saveStore();
    return record;
  },

  getAttendanceHistory(date?: string, shift?: string) {
    const store = loadStore();
    let filtered = [...store.attendances];

    if (date) {
      filtered = filtered.filter((a) => a.date === date);
    }

    return filtered.map((rec) => {
      const student = store.students.find((s) => s.id === rec.studentId);
      const adminObj = rec.recordedByAdminId ? store.admins.find((a) => a.id === rec.recordedByAdminId) : null;

      const recordPickups = store.pickups
        .filter((p) => p.attendanceId === rec.id)
        .map((p) => {
          const ap = student?.authorizedPeople.find((ap) => ap.id === p.authorizedPersonId);
          const teacherObj = p.recordedByAdminId ? store.admins.find((a) => a.id === p.recordedByAdminId) : null;
          return {
            ...p,
            authorizedPerson: ap || { id: p.authorizedPersonId, studentId: rec.studentId, fullName: 'Persona Autorizada', dni: '', relationship: 'Familiar' },
            recordedBy: teacherObj ? { fullName: teacherObj.fullName } : { fullName: 'Victoria' },
          };
        });

      return {
        ...rec,
        student,
        recordedBy: adminObj ? { fullName: adminObj.fullName } : { fullName: 'Victoria' },
        pickups: recordPickups,
      };
    }).filter(r => !shift || (r.student && r.student.shift.toLowerCase() === shift.toLowerCase()));
  },

  // Retiros
  savePickup(attendanceId: string, authorizedPersonId: string, recordedByAdminId?: string, notes?: string): PickupRecord {
    const store = loadStore();
    const newPickup: PickupRecord = {
      id: `pickup-${Date.now()}`,
      attendanceId,
      authorizedPersonId,
      pickupTime: new Date().toISOString(),
      recordedByAdminId,
      notes,
    };
    store.pickups.push(newPickup);
    saveStore();
    return newPickup;
  },

  // Portal de Padres con Historial Completo
  getParentStudentData(studentId: string) {
    const store = loadStore();
    const student = store.students.find((s) => s.id === studentId);
    if (!student) return null;

    const studentAttendances = store.attendances
      .filter((a) => a.studentId === studentId)
      .map((rec) => {
        const adminObj = rec.recordedByAdminId ? store.admins.find((a) => a.id === rec.recordedByAdminId) : null;
        const recordPickups = store.pickups
          .filter((p) => p.attendanceId === rec.id)
          .map((p) => {
            const ap = student.authorizedPeople.find((ap) => ap.id === p.authorizedPersonId);
            const teacherObj = p.recordedByAdminId ? store.admins.find((a) => a.id === p.recordedByAdminId) : null;
            return {
              ...p,
              authorizedPerson: ap || { id: p.authorizedPersonId, studentId, fullName: 'Persona Autorizada', dni: '', relationship: 'Familiar' },
              recordedBy: teacherObj ? { fullName: teacherObj.fullName } : { fullName: 'Victoria' },
            };
          });

        return {
          ...rec,
          recordedBy: adminObj ? { fullName: adminObj.fullName } : { fullName: 'Victoria' },
          pickups: recordPickups,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      ...student,
      attendances: studentAttendances,
    };
  },
};
