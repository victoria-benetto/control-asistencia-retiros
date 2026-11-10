import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { InstallPwaPrompt } from '../components/Common/InstallPwaPrompt';

describe('PWA Configuration and Manifest Tests', () => {
  it('validates manifest.json content and structure', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifestContent.name).toBe('VULPIARE Acrobacia Aérea');
    expect(manifestContent.short_name).toBe('Vulpiare');
    expect(manifestContent.start_url).toBe('/');
    expect(manifestContent.display).toBe('standalone');
    expect(manifestContent.theme_color).toBe('#4c1d95');
    expect(manifestContent.background_color).toBe('#ffffff');
    expect(manifestContent.icons.length).toBeGreaterThan(0);
    expect(manifestContent.icons.some((i: any) => i.sizes === '192x192')).toBe(true);
    expect(manifestContent.icons.some((i: any) => i.sizes === '512x512')).toBe(true);
  });

  it('validates Service Worker (sw.js) existence and critical routing logic', () => {
    const swPath = path.resolve(__dirname, '../../public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    // Verifica que nunca cachee datos de API
    expect(swContent).toContain("url.pathname.startsWith('/api')");
    // Verifica activación inmediata y control de clientes
    expect(swContent).toContain('self.skipWaiting()');
    expect(swContent).toContain('self.clients.claim()');
  });

  it('validates index.html contains PWA and iOS Apple mobile web app tags', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    expect(indexContent).toContain('rel="manifest" href="/manifest.json"');
    expect(indexContent).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(indexContent).toContain('name="theme-color" content="#4c1d95"');
    expect(indexContent).toContain('rel="apple-touch-icon"');
  });
});

describe('InstallPwaPrompt Component Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not render when running inside standalone mode (already installed)', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<InstallPwaPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders install prompt when beforeinstallprompt event is dispatched and allows installing', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const fakeEvent = new Event('beforeinstallprompt');
    (fakeEvent as any).prompt = promptMock;
    (fakeEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });

    render(<InstallPwaPrompt />);

    // Dispatch the beforeinstallprompt event
    window.dispatchEvent(fakeEvent);

    // Debe mostrar el banner de instalación
    expect(await screen.findByText(/Instalá VULPIARE en tu celular/i)).toBeInTheDocument();
    expect(screen.getByText(/Instalar Aplicación/i)).toBeInTheDocument();

    // Clic en instalar
    fireEvent.click(screen.getByText(/Instalar Aplicación/i));
    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses prompt when clicking Ahora no', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const fakeEvent = new Event('beforeinstallprompt');
    (fakeEvent as any).prompt = vi.fn();
    (fakeEvent as any).userChoice = Promise.resolve({ outcome: 'dismissed' });

    render(<InstallPwaPrompt />);
    window.dispatchEvent(fakeEvent);

    expect(await screen.findByText(/Instalá VULPIARE en tu celular/i)).toBeInTheDocument();

    const dismissBtn = screen.getByText(/Ahora no/i);
    fireEvent.click(dismissBtn);

    expect(sessionStorage.getItem('vulpiare_pwa_prompt_dismissed')).toBe('true');
    expect(screen.queryByText(/Instalá VULPIARE en tu celular/i)).not.toBeInTheDocument();
  });
});
