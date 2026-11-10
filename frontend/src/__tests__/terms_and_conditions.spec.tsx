import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TermsAndConditionsModal } from '../components/Parent/TermsAndConditionsModal';
import { ParentPortal } from '../components/Parent/ParentPortal';
import { Student, AttendanceRecord } from '../types';

describe('Términos y Condiciones / Reglamento Interno - VULPIARE', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('TermsAndConditionsModal Component', () => {
    it('renders the critical mandatory insurance clause prominently', () => {
      render(
        <TermsAndConditionsModal
          isOpen={true}
          onClose={vi.fn()}
          isBinding={true}
          onAccept={vi.fn()}
        />
      );

      // Cláusula crítica e intransigible del seguro
      expect(screen.getByText(/Punto Crítico e Intransigible/i)).toBeInTheDocument();
      expect(screen.getByText(/Seguro de Cobertura Médica/i)).toBeInTheDocument();
      expect(
        screen.getByText(/SIN EL SEGURO ABONADO NO PODRÁ REALIZAR NINGUNA ACTIVIDAD ACROBÁTICA NI SUBIRSE A LOS ELEMENTOS/i)
      ).toBeInTheDocument();

      // En modo vinculante no debe haber botón X de cierre
      expect(screen.queryByLabelText(/cerrar reglamento/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Aceptación Obligatoria/i)).toBeInTheDocument();
    });

    it('displays the sequential continuous legal document with all articles in one place', () => {
      render(
        <TermsAndConditionsModal
          isOpen={true}
          onClose={vi.fn()}
          isBinding={false}
          acceptedAt="2026-11-01T12:00:00.000Z"
        />
      );

      // Todos los artículos visibles en texto continuo sin tabs ni cortes
      expect(screen.getByText(/1. Seguridad y Seguro Obligatorio de Accidentes Personales/i)).toBeInTheDocument();
      expect(screen.getByText(/2. Salud, Aptitud Física y Declaración Médica/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Seguridad y Protocolo de Retiro de Menores/i)).toBeInTheDocument();
      expect(screen.getByText(/4. Aranceles, Vencimientos, Recargos y Ausencias/i)).toBeInTheDocument();
      expect(screen.getByText(/5. Privacidad, Confidencialidad y Derechos de Imagen/i)).toBeInTheDocument();

      // Estado de aceptación previa visible
      expect(screen.getByText(/Reglamento aceptado con valor de declaración jurada/i)).toBeInTheDocument();
    });

    it('enforces checkbox agreement before allowing Confirmar y Continuar in binding mode', () => {
      const onAccept = vi.fn();
      render(
        <TermsAndConditionsModal
          isOpen={true}
          onClose={vi.fn()}
          isBinding={true}
          onAccept={onAccept}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /confirmar y continuar/i });
      expect(confirmBtn).toBeDisabled();

      // Marcar checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(confirmBtn).toBeEnabled();

      fireEvent.click(confirmBtn);
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('allows closing in open consultation mode via button', () => {
      const onClose = vi.fn();
      render(
        <TermsAndConditionsModal
          isOpen={true}
          onClose={onClose}
          isBinding={false}
        />
      );

      const closeBtn = screen.getByRole('button', { name: /entendido/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ParentPortal Acceptance Flow Integration', () => {
    const mockStudentUnaccepted: Student & { attendances: AttendanceRecord[] } = {
      id: 'student-new-terms-1',
      dni: '99887766',
      firstName: 'Camila',
      lastName: 'Acrobata',
      shift: 'Martes y Jueves de 16 a 18',
      termsAcceptedAt: null,
      termsVersion: null,
      authorizedPeople: [],
      attendances: [],
    };

    it('blocks portal with mandatory terms modal when student has not accepted terms yet, and unblocks upon acceptance', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, opts?: any) => {
        if (url.includes('/terms') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              student: {
                id: 'student-new-terms-1',
                termsAcceptedAt: new Date().toISOString(),
                termsVersion: '2026.11',
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      });
      global.fetch = fetchMock;

      render(<ParentPortal student={mockStudentUnaccepted} onLogout={vi.fn()} />);

      // Debe aparecer el modal bloqueante de términos
      expect(screen.getByText(/Aceptación Obligatoria/i)).toBeInTheDocument();
      expect(
        screen.getByText(/SIN EL SEGURO ABONADO NO PODRÁ REALIZAR NINGUNA ACTIVIDAD ACROBÁTICA NI SUBIRSE A LOS ELEMENTOS/i)
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: /confirmar y continuar/i });
      expect(confirmBtn).toBeDisabled();

      // Marcar conformidad del checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(confirmBtn).toBeEnabled();

      // Confirmar aceptación
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/students/student-new-terms-1/terms'),
          expect.objectContaining({ method: 'POST' })
        );
        expect(localStorage.getItem('vulpiare_terms_accepted_student-new-terms-1')).toBe('2026.11');
      });

      // El modal bloqueante debe desaparecer y mostrar el toast de éxito
      await waitFor(() => {
        expect(screen.queryByText(/Aceptación Obligatoria/i)).not.toBeInTheDocument();
        expect(screen.getByText(/¡Reglamento y Términos aceptados con éxito!/i)).toBeInTheDocument();
      });
    });

    it('allows open consultation of terms at any time from footer links', async () => {
      const mockStudentAccepted: Student & { attendances: AttendanceRecord[] } = {
        ...mockStudentUnaccepted,
        termsAcceptedAt: '2026-11-05T10:00:00.000Z',
        termsVersion: '2026.11',
      };

      global.fetch = vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: async () => [] }));

      render(<ParentPortal student={mockStudentAccepted} onLogout={vi.fn()} />);

      // No debe estar bloqueado
      expect(screen.queryByText(/Aceptación Obligatoria/i)).not.toBeInTheDocument();

      // Abrir consulta desde el footer
      const footerLink = screen.getByRole('button', { name: /reglamento interno/i });
      fireEvent.click(footerLink);

      // Ahora el modal de consulta abierta está visible
      expect(screen.getByText(/Reglamento Oficial/i)).toBeInTheDocument();
      expect(screen.getByText(/Reglamento aceptado con valor de declaración jurada/i)).toBeInTheDocument();

      // Cerrar consulta
      const closeBtn = screen.getByRole('button', { name: /entendido/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByText(/Reglamento Oficial/i)).not.toBeInTheDocument();
    });
  });
});
