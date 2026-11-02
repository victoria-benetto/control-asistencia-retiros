import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginView } from '../components/LoginView';
import { Navbar } from '../components/Navbar';
import { ParentPortal } from '../components/Parent/ParentPortal';
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

    it('displays student profile with attendance dates, fees, and does not show whatsapp button', async () => {
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
              },
              {
                id: 'pay-2',
                studentId: 's-1',
                month: '2026-10',
                amount: 22000,
                paymentMethod: 'CASH',
                paidAt: '2026-10-05T10:00:00Z',
              },
              {
                id: 'pay-3',
                studentId: 's-1',
                month: '2026-09',
                amount: 22000,
                paymentMethod: 'TRANSFER',
                paidAt: '2026-09-04T10:00:00Z',
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      render(<ParentPortal student={mockStudent} onLogout={onLogout} />);

      expect(screen.getAllByText(/Alumna/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Prueba/i)).toBeInTheDocument();
      expect(screen.getAllByText(/MARTES Y JUEVES 17:00 A 19:00/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/¡PRESENTE en clase!/i)).toBeInTheDocument();

      // Verificar trazabilidad de cuotas
      await waitFor(() => {
        expect(screen.getByText(/Cuota al día/i)).toBeInTheDocument();
        expect(screen.getByText(/Estado de Cuenta y Cuotas/i)).toBeInTheDocument();
      });

      // Verificar que NO existe botón de WhatsApp ni secretaría
      expect(screen.queryByText(/Secretaría Vulpiare/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Atención a familias/i)).not.toBeInTheDocument();
    });

    it('navigates to full history screen when clicking ver mas and returns with back button', async () => {
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
              { id: 'p2', studentId: 's-1', month: '2026-09', amount: 22000, paymentMethod: 'CASH' },
              { id: 'p3', studentId: 's-1', month: '2026-08', amount: 22000, paymentMethod: 'CASH' },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });

      render(<ParentPortal student={mockStudent} onLogout={onLogout} />);

      await waitFor(() => {
        const verMasButtons = screen.getAllByRole('button', { name: /ver más/i });
        expect(verMasButtons.length).toBeGreaterThan(0);
      });

      // Navegar a asistencias completas (el botón "Ver más" de asistencias)
      const verMasButtons = screen.getAllByRole('button', { name: /ver más/i });
      fireEvent.click(verMasButtons[verMasButtons.length - 1]);

      expect(screen.getByText(/Historial de Asistencias/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();

      // Volver a la pantalla principal
      fireEvent.click(screen.getByRole('button', { name: /volver/i }));
      expect(screen.getByText(/Estado de la clase de hoy/i)).toBeInTheDocument();
    });
  });
});
