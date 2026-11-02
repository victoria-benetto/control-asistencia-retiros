import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navbar } from '../components/Navbar';
import { PaymentControlView } from '../components/Admin/PaymentControlView';
import { RegisterPaymentView } from '../components/Admin/RegisterPaymentView';
import { PaymentConceptsManagement } from '../components/Admin/PaymentConceptsManagement';
import { FixedExpensesView } from '../components/Admin/FixedExpensesView';
import { RevenueReportsView } from '../components/Admin/RevenueReportsView';
import { Student, AdminUser, PaymentRecord, PaymentConcept, FixedExpense } from '../types';

describe('Navbar Gestiones & Pagos Integration Tests', () => {
  const superAdminUser: AdminUser = {
    id: 'admin-1',
    dni: '44122509',
    fullName: 'Victoria SuperAdmin',
    role: 'SUPER_ADMIN',
    permissions: { canAttendance: true, canPickups: true, canHistory: true },
  };

  it('replaces direct Alumnas and Profesores tabs with unified Gestiones and adds Control de Pagos tab', () => {
    const setActiveTab = vi.fn();
    const onLogout = vi.fn();

    render(
      <Navbar
        user={superAdminUser}
        activeTab="attendance"
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />
    );

    // No debe haber pestañas directas de "Alumnas" o "Gestión Profesores" en la navegación principal
    const directStudentTab = screen.queryByRole('button', { name: /^Alumnas$/i });
    expect(directStudentTab).not.toBeInTheDocument();

    // Debe existir la pestaña unificada "Gestiones"
    const gestionesBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Gestiones'));
    expect(gestionesBtn).toBeDefined();

    // Debe existir la pestaña de "Control de Pagos"
    const paymentsBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Pagos'));
    expect(paymentsBtn).toBeDefined();

    // Al hacer clic en Pagos debe activar la pestaña 'payments'
    fireEvent.click(paymentsBtn!);
    expect(setActiveTab).toHaveBeenCalledWith('payments');
  });

  it('opens Gestiones modal and allows switching between Alumnas, Profesores, ABM Pagos, Reportes y Gastos Fijos', () => {
    const setActiveTab = vi.fn();
    const onLogout = vi.fn();

    render(
      <Navbar
        user={superAdminUser}
        activeTab="attendance"
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />
    );

    // Clic en Gestiones
    const gestionesBtn = screen.getAllByRole('button').find((b) => b.textContent?.includes('Gestiones'));
    fireEvent.click(gestionesBtn!);

    // Debe abrir el modal con el título y las cinco opciones
    expect(screen.getByText(/¿Qué deseas gestionar hoy\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestión de Alumnas/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestión de Profesores/i)).toBeInTheDocument();
    expect(screen.getByText(/Gestión de Conceptos de Pago/i)).toBeInTheDocument();
    expect(screen.getByText(/Reportes de Ingresos y Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Gastos Fijos del Estudio/i)).toBeInTheDocument();

    // Al seleccionar "Reportes de Ingresos y Balance"
    fireEvent.click(screen.getByText(/Reportes de Ingresos y Balance/i));
    expect(setActiveTab).toHaveBeenCalledWith('reports');
  });
});

describe('PaymentControlView Component Integration Tests', () => {
  const superAdminUser: AdminUser = {
    id: 'admin-1',
    dni: '44122509',
    fullName: 'Victoria',
    role: 'SUPER_ADMIN',
    permissions: { canAttendance: true, canPickups: true, canHistory: true },
  };

  const mockActiveStudents: Student[] = [
    {
      id: 'student-1',
      firstName: 'Violeta',
      lastName: 'Arco',
      dni: '54922186',
      shift: 'Lunes, miércoles y viernes de 16:45 a 18',
      status: 'ACTIVE',
      authorizedPeople: [
        { id: 'auth-1', studentId: 'student-1', fullName: 'Mamá Violeta', dni: '30000001', relationship: 'Madre', phone: '1133445566' },
      ],
    },
    {
      id: 'student-2',
      firstName: 'Angelina',
      lastName: 'Acosta',
      dni: '52934462',
      shift: 'Martes y Jueves de 16 a 18',
      status: 'ACTIVE',
      authorizedPeople: [
        { id: 'auth-2', studentId: 'student-2', fullName: 'Papá Angelina', dni: '30000002', relationship: 'Padre', phone: '1144556677' },
      ],
    },
  ];

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const mockPayments: PaymentRecord[] = [
    {
      id: 'pay-1',
      studentId: 'student-1',
      month: currentMonthStr,
      amount: 22000,
      paymentMethod: 'TRANSFER',
      receiptUrl: 'data:image/png;base64,mock',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/students/shifts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ['Lunes, miércoles y viernes de 16:45 a 18', 'Martes y Jueves de 16 a 18'],
        });
      }
      if (url.includes('/api/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockActiveStudents,
        });
      }
      if (url.includes('/api/payments')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPayments,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders control de pagos with students, buttons and triggers navigation to register payment', async () => {
    const onNavigate = vi.fn();
    render(<PaymentControlView user={superAdminUser} onNavigateToRegisterPayment={onNavigate} />);

    await waitFor(() => {
      expect(screen.getByText(/Control de Pagos/i)).toBeInTheDocument();
      expect(screen.getByText(/Violeta Arco/i)).toBeInTheDocument();
      expect(screen.getByText(/Angelina Acosta/i)).toBeInTheDocument();
    });

    // Botón "+ Registrar Nuevo Pago" en banner
    const nuevoPagoBtn = screen.getByRole('button', { name: /\+ Registrar Nuevo Pago/i });
    expect(nuevoPagoBtn).toBeInTheDocument();
    fireEvent.click(nuevoPagoBtn);
    expect(onNavigate).toHaveBeenCalledTimes(1);

    // Violeta tiene pago -> debe mostrar estado "Al día"
    expect(screen.getAllByText(/Al día/i).length).toBeGreaterThan(0);

    // Angelina no tiene pago registrado -> debe mostrar botón "Pagado" y "Recordar"
    const pagadoButtons = screen.getAllByRole('button', { name: /Pagado/i });
    expect(pagadoButtons.length).toBeGreaterThan(0);

    const recordarButtons = screen.getAllByRole('button', { name: /Recordar/i });
    expect(recordarButtons.length).toBeGreaterThan(0);
  });

  it('accumulates multiple payments for the same student in the same month and marks cuota as saldada', async () => {
    const multiPayments: PaymentRecord[] = [
      {
        id: 'pay-1',
        studentId: 'student-1',
        month: currentMonthStr,
        amount: 20000,
        expectedAmount: 22000,
        remainingDebt: 2000,
        isPartial: true,
        paymentMethod: 'TRANSFER',
        paidAt: new Date().toISOString(),
      },
      {
        id: 'pay-2',
        studentId: 'student-1',
        month: currentMonthStr,
        amount: 2000,
        expectedAmount: 22000,
        remainingDebt: 0,
        isPartial: false,
        paymentMethod: 'CASH',
        paidAt: new Date().toISOString(),
      },
    ];

    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/students/shifts')) {
        return Promise.resolve({ ok: true, json: async () => ['Martes y Jueves de 16 a 18'] });
      }
      if (url.includes('/api/students')) {
        return Promise.resolve({ ok: true, json: async () => [mockActiveStudents[0]] });
      }
      if (url.includes('/api/payments')) {
        return Promise.resolve({ ok: true, json: async () => multiPayments });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<PaymentControlView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Violeta Arco/i)).toBeInTheDocument();
      // Total acumulado: 20000 + 2000 = 22000
      expect(screen.getAllByText(/22\.000/i).length).toBeGreaterThan(0);
      // Debe figurar como Al día (sin deuda restante)
      expect(screen.getAllByText(/Al día/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/2 pagos acumulados/i)).toBeInTheDocument();
      expect(screen.getByText(/Transf\./i)).toBeInTheDocument();
      expect(screen.getAllByText(/Efectivo/i).length).toBeGreaterThan(0);
    });
  });
});

describe('RegisterPaymentView Component Integration Tests', () => {
  const superAdminUser: AdminUser = {
    id: 'admin-1',
    dni: '44122509',
    fullName: 'Victoria',
    role: 'SUPER_ADMIN',
    permissions: { canAttendance: true, canPickups: true, canHistory: true },
  };

  const mockStudents: Student[] = [
    {
      id: 'student-1',
      firstName: 'Angelina',
      lastName: 'Acosta',
      dni: '52934462',
      shift: 'Martes y Jueves de 16 a 18',
      status: 'ACTIVE',
      authorizedPeople: [
        { id: 'auth-1', studentId: 'student-1', fullName: 'Carlos Acosta', dni: '28000000', relationship: 'Papá', phone: '1144556677' },
      ],
    },
  ];

  const mockConcepts: PaymentConcept[] = [
    { id: 'concept-1', name: 'Cuota Mensual', amount: 22000, isActive: true },
    { id: 'concept-2', name: 'Matrícula Anual', amount: 15000, isActive: true },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/payments/concepts')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockConcepts,
        });
      }
      if (url.includes('/api/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStudents,
        });
      }
      if (url.includes('/api/payments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'pay-new', amount: 15000 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('renders student search with magnifying glass, dynamic concepts and detects partial payment with pencil edit', async () => {
    const onBack = vi.fn();
    render(<RegisterPaymentView user={superAdminUser} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/Registrar Pago/i)).toBeInTheDocument();
      expect(screen.getByText(/Angelina Acosta/i)).toBeInTheDocument();
      expect(screen.getByText(/Cuota Mensual/i)).toBeInTheDocument();
      expect(screen.getByText(/Matrícula Anual/i)).toBeInTheDocument();
    });

    // Verificar medios de pago: SOLO Transferencia y Efectivo
    expect(screen.getByRole('button', { name: /Transferencia/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Efectivo/i })).toBeInTheDocument();
    expect(screen.queryByText(/Mercado Pago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tarjeta Débito/i)).not.toBeInTheDocument();

    // Cambiar monto con el lápiz para probar detección de Pago Parcial
    const editBtn = screen.getByRole('button', { name: /Editar/i });
    fireEvent.click(editBtn);

    const amountInput = screen.getByDisplayValue('22000');
    fireEvent.change(amountInput, { target: { value: '15000' } });

    // Debe detectar automáticamente "Pago Parcial" y mostrar la deuda restante ($7.000)
    await waitFor(() => {
      expect(screen.getAllByText(/Pago Parcial/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/\$7\.000/i)).toBeInTheDocument();
    });

    // Enviar recibo por WhatsApp
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Emitir Recibo/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/payments',
        expect.objectContaining({ method: 'POST' })
      );
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/'),
        '_blank'
      );
      expect(onBack).toHaveBeenCalled();
    });
  });

  it('detects payment surplus and credits excess amount to next month', async () => {
    const onBack = vi.fn();
    render(<RegisterPaymentView user={superAdminUser} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/Registrar Pago/i)).toBeInTheDocument();
      expect(screen.getByText(/Angelina Acosta/i)).toBeInTheDocument();
    });

    // Editar monto con excedente: de 22.000 a 30.000 (excedente de 8.000)
    const editBtn = screen.getByRole('button', { name: /Editar/i });
    fireEvent.click(editBtn);

    const amountInput = screen.getByDisplayValue('22000');
    fireEvent.change(amountInput, { target: { value: '30000' } });

    // Debe mostrar badge "Pago con Excedente" y mensaje de crédito para el mes siguiente
    await waitFor(() => {
      expect(screen.getByText(/Pago con Excedente/i)).toBeInTheDocument();
      expect(screen.getByText(/Monto mayor al debido detectado/i)).toBeInTheDocument();
      expect(screen.getByText(/\$8\.000/i)).toBeInTheDocument();
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const confirmBtn = screen.getByRole('button', { name: /Confirmar y Emitir Recibo/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/payments',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"amount":30000'),
        })
      );
      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('Excedente'),
        '_blank'
      );
      expect(onBack).toHaveBeenCalled();
    });
  });
});

describe('FixedExpensesView Component Tests', () => {
  const superAdminUser: AdminUser = {
    id: 'admin-1',
    dni: '44122509',
    fullName: 'Victoria',
    role: 'SUPER_ADMIN',
    permissions: { canAttendance: true, canPickups: true, canHistory: true },
  };

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const mockExpenses: FixedExpense[] = [
    {
      id: 'exp-1',
      title: 'Alquiler Estudio y Gimnasio',
      amount: 150000,
      month: currentMonthStr,
      date: `${currentMonthStr}-05`,
      category: 'Alquiler',
      notes: 'Pago mensual alquiler',
      isRecurring: true,
      receiptUrl: 'data:image/png;base64,mockReceipt',
      recordedByAdminId: 'admin-1',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'exp-2',
      title: 'Servicio de Internet y WiFi',
      amount: 25000,
      month: currentMonthStr,
      date: `${currentMonthStr}-10`,
      category: 'Servicios',
      isRecurring: true,
      recordedByAdminId: 'admin-1',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes('/api/expenses') && (!opts || opts.method === 'GET' || !opts.method)) {
        return Promise.resolve({
          ok: true,
          json: async () => mockExpenses,
        });
      }
      if (url.includes('/api/expenses') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'exp-new', ...JSON.parse(opts.body) }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  it('renders fixed expenses list and KPI totals', async () => {
    render(<FixedExpensesView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Control de Gastos del Estudio/i)).toBeInTheDocument();
      expect(screen.getByText(/Alquiler Estudio y Gimnasio/i)).toBeInTheDocument();
      expect(screen.getByText(/Servicio de Internet y WiFi/i)).toBeInTheDocument();
    });

    // Total egresos: 150.000 + 25.000 = $175.000
    expect(screen.getByText(/\$175\.000/i)).toBeInTheDocument();
    expect(screen.getByText(/2 mensuales/i)).toBeInTheDocument();
  });

  it('opens new expense modal and submits expense', async () => {
    render(<FixedExpensesView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Gasto/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nuevo Gasto/i));

    expect(screen.getByText(/Registrar Nuevo Gasto Fijo/i)).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Ej: Alquiler del gimnasio/i);
    const amountInput = screen.getByPlaceholderText(/Ej: 150000/i);

    fireEvent.change(titleInput, { target: { value: 'Seguro de Responsabilidad' } });
    fireEvent.change(amountInput, { target: { value: '35000' } });

    const submitBtn = screen.getByRole('button', { name: /Registrar Gasto/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/expenses',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"Seguro de Responsabilidad"'),
        })
      );
    });
  });

  it('allows granular replication of selected expenses with adjusted amounts', async () => {
    render(<FixedExpensesView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Alquiler Estudio y Gimnasio/i)).toBeInTheDocument();
    });

    // Abrir modal "Replicar Gastos"
    const replicateBtn = screen.getByRole('button', { name: /Replicar Gastos/i });
    fireEvent.click(replicateBtn);

    expect(screen.getByText(/Replicar Gastos a Otro Período/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué gastos querés replicar\?/i)).toBeInTheDocument();

    // Comprobar botones de selección rápida (Todos, Solo recurrentes, Ninguno)
    const selectNoneBtn = screen.getByRole('button', { name: /Ninguno/i });
    fireEvent.click(selectNoneBtn);
    expect(screen.getByText(/0 de 2 gastos seleccionados/i)).toBeInTheDocument();

    const selectAllBtn = screen.getByRole('button', { name: /Todos/i });
    fireEvent.click(selectAllBtn);
    expect(screen.getByText(/2 de 2 gastos seleccionados/i)).toBeInTheDocument();

    // Confirmar réplica
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Réplica/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/expenses/replicate-month',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"expenseIds"'),
        })
      );
    });
  });

  it('allows single expense replication with custom month and custom amount', async () => {
    render(<FixedExpensesView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Alquiler Estudio y Gimnasio/i)).toBeInTheDocument();
    });

    // Abrir réplica individual desde el botón de la tarjeta
    const copyBtns = screen.getAllByTitle(/Replicar este gasto/i);
    fireEvent.click(copyBtns[0]);

    expect(screen.getByRole('heading', { name: /Replicar Gasto/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Alquiler Estudio y Gimnasio/i).length).toBeGreaterThanOrEqual(1);

    // Modificar monto porque varió para el mes siguiente (ej. de 150000 a 165000)
    const amountInput = screen.getByPlaceholderText(/Ej: 150000/i);
    fireEvent.change(amountInput, { target: { value: '165000' } });

    // Confirmar réplica individual
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Réplica/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/expenses/exp-1/replicate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"amount":165000'),
        })
      );
    });
  });
});

describe('RevenueReportsView Component Tests', () => {
  const superAdminUser: AdminUser = {
    id: 'admin-1',
    dni: '44122509',
    fullName: 'Victoria',
    role: 'SUPER_ADMIN',
    permissions: { canAttendance: true, canPickups: true, canHistory: true },
  };

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const mockPayments: PaymentRecord[] = [
    {
      id: 'pay-1',
      studentId: 'student-1',
      month: currentMonthStr,
      amount: 40000,
      paymentMethod: 'TRANSFER',
      concept: 'Cuota Mensual',
      paidAt: `${currentMonthStr}-03T10:00:00Z`,
      createdAt: `${currentMonthStr}-03T10:00:00Z`,
    },
    {
      id: 'pay-2',
      studentId: 'student-2',
      month: currentMonthStr,
      amount: 20000,
      paymentMethod: 'CASH',
      concept: 'Matrícula Anual',
      paidAt: `${currentMonthStr}-05T12:00:00Z`,
      createdAt: `${currentMonthStr}-05T12:00:00Z`,
    },
  ];

  const mockExpenses: FixedExpense[] = [
    {
      id: 'exp-1',
      title: 'Alquiler',
      amount: 30000,
      month: currentMonthStr,
      date: `${currentMonthStr}-01`,
      category: 'Alquiler',
      isRecurring: true,
      recordedByAdminId: 'admin-1',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/payments')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPayments,
        });
      }
      if (url.includes('/api/expenses')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockExpenses,
        });
      }
      if (url.includes('/api/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 'student-1' }, { id: 'student-2' }],
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  it('renders revenue reports, calculates net balance and triggers export', async () => {
    render(<RevenueReportsView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Reportes de Ingresos y Balance/i)).toBeInTheDocument();
      // Total ingresos = $60.000
      expect(screen.getByText(/\$60\.000/i)).toBeInTheDocument();
      // Gastos fijos = $30.000 y Balance neto = +$30.000
      expect(screen.getAllByText(/\$30\.000/i).length).toBeGreaterThanOrEqual(1);
    });

    // Comprobar desglose de medios de pago: Transferencia Bancaria y Efectivo en Caja
    expect(screen.getByText(/Transferencia Bancaria/i)).toBeInTheDocument();
    expect(screen.getByText(/Efectivo en Caja/i)).toBeInTheDocument();

    // Exportar Excel
    const exportBtn = screen.getByRole('button', { name: /Excel \(CSV\)/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
  });

  it('removes gastos fijos button from period selector, supports annual scope with years and trend chart navigation', async () => {
    render(<RevenueReportsView user={superAdminUser} />);

    await waitFor(() => {
      expect(screen.getByText(/Reportes de Ingresos y Balance/i)).toBeInTheDocument();
    });

    // 1. Verificar que NO existe el botón de "Gestionar Gastos Fijos" dentro de los reportes
    expect(screen.queryByText(/Gestionar Gastos Fijos/i)).not.toBeInTheDocument();

    // 2. En vista mensual por defecto: verificar selector 6M / 12M y controles de navegación de meses anteriores
    expect(screen.getByRole('button', { name: '6 Meses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12 Meses' })).toBeInTheDocument();
    expect(screen.getByTitle(/Ver meses anteriores/i)).toBeInTheDocument();

    // Cambiar a vista 12 Meses
    fireEvent.click(screen.getByRole('button', { name: '12 Meses' }));
    expect(screen.getByText(/Últimos 12 meses/i)).toBeInTheDocument();

    // 3. Cambiar a vista Anual
    const annualBtn = screen.getByRole('button', { name: 'Anual' });
    fireEvent.click(annualBtn);

    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    // En vista anual el período seleccionado debe mostrar el año (ej. "Año 2026")
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`Año ${currentYear}`, 'i'))).toBeInTheDocument();
      expect(screen.getByText(/Evolución de Ingresos Anuales/i)).toBeInTheDocument();
      expect(screen.getByText(/Histórico de recaudación anual/i)).toBeInTheDocument();
    });

    // Probar navegación con flechas de año (Año anterior)
    const prevYearBtn = screen.getByRole('button', { name: /Año anterior/i });
    fireEvent.click(prevYearBtn);

    expect(screen.getByText(new RegExp(`Año ${prevYear}`, 'i'))).toBeInTheDocument();

    // Probar retorno al año siguiente
    const nextYearBtn = screen.getByRole('button', { name: /Año siguiente/i });
    fireEvent.click(nextYearBtn);

    expect(screen.getByText(new RegExp(`Año ${currentYear}`, 'i'))).toBeInTheDocument();
  });
});
