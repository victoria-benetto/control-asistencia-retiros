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
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
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
      ],
    };

    it('displays student profile with attendance dates and times', () => {
      const onLogout = vi.fn();
      render(<ParentPortal student={mockStudent} onLogout={onLogout} />);

      expect(screen.getAllByText(/Alumna/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Prueba/i)).toBeInTheDocument();
      expect(screen.getAllByText(/MARTES Y JUEVES 17:00 A 19:00/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/¡PRESENTE en clase!/i)).toBeInTheDocument();
    });
  });
});
