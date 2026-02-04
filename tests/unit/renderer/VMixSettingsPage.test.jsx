/**
 * Тесты для VMixSettingsPage: сохранение настроек, навигация с forceUpdateVMix,
 * перетаскивание порядка инпутов (DnD).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VMixSettingsPage from '../../../src/renderer/pages/VMixSettingsPage.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../src/renderer/components/Layout', () => ({
  useHeaderButtons: vi.fn(() => ({
    setButtons: vi.fn(),
  })),
}));

describe('VMixSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getVMixConfig: vi.fn().mockResolvedValue({
        host: 'localhost',
        port: 8088,
        connectionState: 'disconnected',
        inputOrder: [],
        inputs: {},
      }),
      setVMixConfig: vi.fn().mockResolvedValue(undefined),
      testVMixConnection: vi.fn().mockResolvedValue({ success: true }),
      vmixConnect: vi.fn().mockResolvedValue({ success: true }),
      vmixDisconnect: vi.fn().mockResolvedValue(undefined),
      getVMixGTInputs: vi.fn().mockResolvedValue({ success: true, inputs: [] }),
      getVMixInputFields: vi.fn().mockResolvedValue({ success: true, fields: [] }),
    };
  });

  const renderWithRouter = (initialEntries = ['/vmix-settings']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <VMixSettingsPage />
      </MemoryRouter>
    );
  };

  test('при сохранении вызывается setVMixConfig и navigate с state.forceUpdateVMix', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: '192.168.1.1',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: ['id1'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'Scoreboard', enabled: true, fields: {} },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(window.electronAPI.getVMixConfig).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole('button', { name: /Сохранить/ });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(window.electronAPI.setVMixConfig).toHaveBeenCalled();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/match', { state: { forceUpdateVMix: true } });
  });

  test('отображает раздел «Подключение» и поля host/port', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Подключение/)).toBeInTheDocument();
    });

    const hostInput = screen.getByPlaceholderText(/192\.168\.1\.100/);
    const portInput = screen.getByPlaceholderText(/8088/);
    expect(hostInput).toBeInTheDocument();
    expect(portInput).toBeInTheDocument();
  });

  test('при отсутствии electronAPI не падает', async () => {
    const originalAPI = window.electronAPI;
    window.electronAPI = undefined;

    expect(() => renderWithRouter()).not.toThrow();

    window.electronAPI = originalAPI;
  });

  test('кнопка «Сохранить» присутствует в интерфейсе', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Сохранить/ })).toBeInTheDocument();
    });
  });

  test('отображает список инпутов с draggable при наличии inputOrder', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: ['id1', 'id2'],
      inputs: {
        id1: { displayName: 'Счёт', vmixTitle: 'T1', enabled: true, fields: {} },
        id2: { displayName: 'Судья', vmixTitle: 'T2', enabled: true, fields: {} },
      },
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Счёт')).toBeInTheDocument();
    });
    expect(screen.getByText('Судья')).toBeInTheDocument();

    const draggables = document.querySelectorAll('[draggable="true"]');
    expect(draggables.length).toBe(2);
  });

  test('при пустом inputOrder показывается «Нет инпутов»', async () => {
    window.electronAPI.getVMixConfig.mockResolvedValue({
      host: 'localhost',
      port: 8088,
      connectionState: 'disconnected',
      inputOrder: [],
      inputs: {},
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Нет инпутов/)).toBeInTheDocument();
    });
  });
});
