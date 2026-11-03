import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginView } from '../components/LoginView';
import { Navbar } from '../components/Navbar';
import { ParentPortal } from '../components/Parent/ParentPortal';
import { PickupsView } from '../components/Admin/PickupsView';
import { Student, AdminUser } from '../types';

describe('Frontend Component Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('LoginView Component', () => {
    it('renders input for DNI and submits login request', async () => {
      const mockLoginSuccess = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'ADMIN',
          user: { id: 'admin-1', dni: '44122509', fullName: 'Super Admin', role: 'SUPER_ADMIN' },
        }),
        text: async () =>
          JSON.stringify({
            type: 'ADMIN',
            user: { id: 'admin-1', dni: '44122509', fullName: 'Super Admin', role: 'SUPER_ADMIN' },
          }),
      });

      render(<LoginView onLoginSuccess={mockLoginSuccess} />);

      const input = screen.getByPlaceholderText(/ingresá el dni/i);
      const submitBtn = screen.getByRole('button', { name: /ingresar/i });

      fireEvent.change(input, { target: { value: '44122509' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
        expect(mockLoginSuccess).toHaveBeenCalledWith({
          type: 'ADMIN',
          user: { id: 'admin-1', dni: '44122509', fullName: 'Super Admin', role: 'SUPER_ADMIN' },
        });
      });
    });

    it('shows error toast when login fails with invalid DNI', async () => {
      const mockLoginSuccess = vi.fn();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'DNI no registrado en el sistema' }),
        text: async () => JSON.stringify({ error: 'DNI no registrado en el sistema' }),
      });

      render(<LoginView onLoginSuccess={mockLoginSuccess} />);

      const input = screen.getByPlaceholderText(/ingresá el dni/i);
      const submitBtn = screen.getByRole('button', { name: /ingresar/i });

      fireEvent.change(input, { target: { value: '00000000' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/dni no registrado en el sistema/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navbar Component', () => {
    const mockUser: AdminUser = {
      id: 'admin-1',
      dni: '44122509',
      fullName: 'Docente Test',
      role: 'SUPER_ADMIN',
      permissions: { canAttendance: true, canPickups: true, canHistory: true },
    };

    it('renders active tabs and handles logout click', () => {
      const setActiveTab = vi.fn();
      const onLogout = vi.fn();

      render(
        <Navbar
          user={mockUser}
          activeTab="attendance"
          setActiveTab={setActiveTab}
          onLogout={onLogout}
        />
      );

      expect(screen.getByText(/Docente Test/i)).toBeInTheDocument();

      const logoutBtn = screen.getByRole('button', { name: /salir/i });
      fireEvent.click(logoutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('ParentPortal Component', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const mockStudent: Student & { attendances: any[] } = {
      id: 's-1',
      dni: '12345678',
      firstName: 'Alumna',
      lastName: 'Prueba',
      shift: 'MARTES Y JUEVES 17:00 A 19:00',
      authorizedPeople: [{ id: 'p-1', studentId: 's-1', fullName: 'Mama Test', dni: '99999999', relationship: 'Madre', phone: '12345' }],
      attendances: [
        {
          id: 'att-1',
          studentId: 's-1',
          date: todayStr,
          status: 'PRESENT',
          timeIn: '17:05',
          isMakeup: false,
        },
        {
          id: 'att-2',
          studentId: 's-1',
          date: '2026-10-20',
          status: 'PRESENT',
          timeIn: '17:00',
        },
        {
          id: 'att-3',
          studentId: 's-1',
          date: '2026-10-15',
          status: 'ABSENT',
        },
      ],
    };

    it('displays student profile with app logo, fees, notice with profesora Victoria and no whatsapp button', async () => {
      const onLogout = vi.fn();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/payments/concepts')) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: 'c1', name: 'Cuota Mensual', amount: 22000, isActive: true }],
          });
        }
        if (url.includes('/api/payments')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'pay-1',
                studentId: 's-1',
                month: currentMonthStr,
                amount: 22000,
                expectedAmount: 22000,
                paymentMethod: 'TRANSFER',
                paidAt: '2026-11-02T10:00:00Z',
                notes: 'Pago con excedente de $3.000 acreditado a Diciembre 2026.',
              },
              {
                id: 'pay-surplus',
                studentId: 's-1',
                month: '2026-12',
                amount: 3000,
                expectedAmount: 22000,
                paymentMethod: 'TRANSFER',
                paidAt: '2026-11-02T10:00:00Z',
                notes: '[ORIGIN:pay-1] Excedente acreditado del pago de 2026-11',
              },
              {
                id: 'pay-2',
                studentId: 's-1',
                month: '2026-10',
                amount: 22000,
                paymentMethod: 'CASH',
                paidAt: '2026-10-05T10:00:00Z',
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      render(<ParentPortal student={mockStudent} onLogout={onLogout} />);

      // Verificar logo oficial de la app
      const logoImg = screen.getByAltText(/vulpiare logo/i);
      expect(logoImg).toBeInTheDocument();
      expect(logoImg).toHaveAttribute('src', '/vulpiare_logo.png');

      expect(screen.getAllByText(/Alumna/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Prueba/i)).toBeInTheDocument();
      expect(screen.getAllByText(/MARTES Y JUEVES 17:00 A 19:00/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/¡PRESENTE en clase!/i)).toBeInTheDocument();

      // Verificar métricas del mes en Inicio
      expect(screen.getByText(/Clases del mes/i)).toBeInTheDocument();
      expect(screen.getByText(/Para recuperar/i)).toBeInTheDocument();

      // Navegar a la pestaña Pagos mediante el BottomNav
      const pagosTabBtn = screen.getByRole('button', { name: /pestaña pagos/i });
      fireEvent.click(pagosTabBtn);

      // Verificar estado de cuenta y cuotas en la pestaña Pagos
      await waitFor(() => {
        expect(screen.getAllByText(/Cuota al día/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Estado de Cuenta y Cuotas/i)).toBeInTheDocument();
        expect(screen.getByText(/comunicate con la profesora Victoria/i)).toBeInTheDocument();
        // Verificar que en el historial aparecen TANTO Noviembre como Diciembre (excedente)
        expect(screen.getAllByText(/Noviembre.*2026/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Diciembre.*2026/i).length).toBeGreaterThan(0);
      });

      // Verificar que NO existe botón de WhatsApp ni secretaría
      expect(screen.queryByText(/Secretaría Vulpiare/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Atención a familias/i)).not.toBeInTheDocument();
    });

    it('switches between bottom navigation tabs (Inicio, Pagos, Asistencias) and opens makeup modal', async () => {
      const onLogout = vi.fn();
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/payments/concepts')) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: 'c1', name: 'Cuota Mensual', amount: 22000, isActive: true }],
          });
        }
        if (url.includes('/api/payments')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: 'p1', studentId: 's-1', month: '2026-10', amount: 22000, paymentMethod: 'CASH' },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      render(<ParentPortal student={mockStudent} onLogout={onLogout} />);

      // 1. En Inicio: está la tarjeta grande de perfil y estado de la clase
      expect(screen.getByText(/Estado de la clase de hoy/i)).toBeInTheDocument();
      expect(screen.getByText(/DNI Alumna:/i)).toBeInTheDocument();

      // 2. Cambiar a Asistencias con BottomNav
      const asistenciasTabBtn = screen.getByRole('button', { name: /pestaña asistencias/i });
      fireEvent.click(asistenciasTabBtn);

      expect(screen.getByText(/Historial de Asistencias/i)).toBeInTheDocument();
      // En Asistencias NO debe renderizarse la tarjeta grande de perfil
      expect(screen.queryByText(/DNI Alumna:/i)).not.toBeInTheDocument();

      // 3. Abrir modal de recuperar clase
      const recuperarBtn = screen.getByRole('button', { name: /recuperar clase/i });
      fireEvent.click(recuperarBtn);

      expect(screen.getByText(/Paso 1: ¿A qué horario vas a asistir?/i)).toBeInTheDocument();
      expect(screen.getByText(/Paso 2: ¿Qué día vas a ir?/i)).toBeInTheDocument();

      // Cerrar modal
      const closeBtn = screen.getByRole('button', { name: /^cancelar$/i });
      fireEvent.click(closeBtn);

      // 4. Volver a Inicio
      const inicioTabBtn = screen.getByRole('button', { name: /pestaña inicio/i });
      fireEvent.click(inicioTabBtn);

      expect(screen.getByText(/Estado de la clase de hoy/i)).toBeInTheDocument();
      expect(screen.getByText(/DNI Alumna:/i)).toBeInTheDocument();
    });
  });
  describe('PickupsView Component & Otro Adulto Flow', () => {
    const mockAdmin: AdminUser = {
      id: 'admin-1',
      dni: '44122509',
      fullName: 'Victoria Profe',
      role: 'SUPER_ADMIN',
      permissions: { canAttendance: true, canPickups: true, canHistory: true },
    };

    it('opens modal when selecting Otro adulto and submits pickup with newAuthorizedPerson', async () => {
      global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
        if (url.includes('/api/attendance/today')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              date: '2026-11-02',
              shift: 'Lunes y miércoles de 8 a 10',
              todayDayName: 'Lunes',
              students: [
                {
                  student: {
                    id: 's-1',
                    firstName: 'Lucía',
                    lastName: 'Martínez',
                    dni: '45123456',
                    shift: 'Lunes y miércoles de 8 a 10',
                    authorizedPeople: [
                      { id: 'ap-1', studentId: 's-1', fullName: 'Carlos Martínez', relationship: 'Padre', dni: '22111333' },
                    ],
                  },
                  attendanceId: 'att-1',
                  status: 'PRESENT',
                  pickups: [],
                },
              ],
            }),
          });
        }
        if (url.includes('/api/pickups') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'pk-new',
              attendanceId: 'att-1',
              pickupTime: new Date().toISOString(),
              authorizedPerson: { id: 'ap-new', fullName: 'Marta Gómez', relationship: 'Tía', dni: '28123456' },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<PickupsView shift="Lunes y miércoles de 8 a 10" user={mockAdmin} />);

      await waitFor(() => {
        expect(screen.getByText(/Lucía Martínez/i)).toBeInTheDocument();
      });

      // Find the select for authorized person and select OTHER
      const selects = screen.getAllByRole('combobox');
      const authorizedSelect = selects[selects.length - 1];
      expect(screen.getByText(/➕ Otro adulto/i)).toBeInTheDocument();

      fireEvent.change(authorizedSelect, { target: { value: 'OTHER' } });

      // Modal should be visible
      await waitFor(() => {
        expect(screen.getByText(/Registrar Retiro/i)).toBeInTheDocument();
        expect(screen.getByText(/Otro adulto responsable/i)).toBeInTheDocument();
      });

      // Fill in modal inputs
      const nameInput = screen.getByPlaceholderText(/Ej: Laura Gómez/i);
      const relationshipInput = screen.getByPlaceholderText(/Ej: Tía, Abuela/i);
      const dniInput = screen.getByPlaceholderText(/Ej: 32456789/i);

      fireEvent.change(nameInput, { target: { value: 'Marta Gómez' } });
      fireEvent.change(relationshipInput, { target: { value: 'Tía' } });
      fireEvent.change(dniInput, { target: { value: '28123456' } });

      const submitBtn = screen.getByRole('button', { name: /^confirmar retiro$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/pickups',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Marta Gómez'),
          })
        );
      });
    });
  });
});