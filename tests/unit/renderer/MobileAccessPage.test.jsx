/**
 * Тесты для компонента MobileAccessPage
 * 
 * Проверяем:
 * 1. Генерацию QR-кода с использованием qrcode.react
 * 2. Отображение QR-кода после генерации
 * 3. Работу с QRCodeCanvas компонентом
 * 4. Интеграцию с Electron API для мобильного сервера
 */

import { describe, test, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileAccessPage from '../../../src/renderer/pages/MobileAccessPage.jsx';

// Моки для хуков
vi.mock('../../../src/renderer/components/Layout', () => ({
  useHeaderButtons: vi.fn(() => ({
    setButtons: vi.fn(),
  })),
}));

// Моки для react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/mobile-access',
      state: null,
      search: '',
      hash: '',
    }),
  };
});

// Моки для qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value, size, level, marginSize, bgColor, fgColor }) => {
    // Создаем мок canvas элемента
    const canvas = document.createElement('canvas');
    canvas.width = size || 300;
    canvas.height = size || 300;
    
    // Симулируем отрисовку QR-кода
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bgColor || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fgColor || '#000000';
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    }
    
    // Устанавливаем data URL для тестирования
    canvas.toDataURL = vi.fn(() => 'data:image/png;base64,test-qr-code-data');
    
    return React.createElement('canvas', {
      'data-testid': 'qrcode-canvas',
      width: size || 300,
      height: size || 300,
    });
  },
}));

describe('MobileAccessPage', () => {
  let mockElectronAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Моки для Electron API
    mockElectronAPI = {
      getMobileServerInfo: vi.fn(() => Promise.resolve({ success: false })),
      isMobileServerRunning: vi.fn(() => Promise.resolve(false)),
      startMobileServer: vi.fn(() => Promise.resolve({ success: true, port: 3000 })),
      stopMobileServer: vi.fn(() => Promise.resolve({ success: true })),
      generateMobileSession: vi.fn(() => Promise.resolve({
        success: true,
        sessionId: 'test-session-id',
        url: 'http://192.168.1.100:3000/mobile/test-session-id',
      })),
      getSavedMobileSession: vi.fn(() => Promise.resolve(null)),
      getNetworkInterfaces: vi.fn(() => Promise.resolve([
        { name: 'Ethernet', ip: '192.168.1.100', isPrivate: true, isVpn: false },
        { name: 'Wi-Fi', ip: '192.168.1.101', isPrivate: true, isVpn: false },
      ])),
      setSelectedIP: vi.fn(() => Promise.resolve({ success: true })),
      getSelectedIP: vi.fn(() => Promise.resolve(null)),
    };

    // Настройка global.window.electronAPI
    if (!global.window) {
      global.window = {};
    }
    if (!global.window.electronAPI) {
      global.window.electronAPI = mockElectronAPI;
    } else {
      Object.assign(global.window.electronAPI, mockElectronAPI);
    }

    // Моки для window.confirm
    if (!global.window.confirm) {
      global.window.confirm = vi.fn(() => true);
    } else {
      global.window.confirm = vi.fn(() => true);
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  test('должен отображать страницу мобильного доступа', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/мобильный доступ/i)).toBeInTheDocument();
    });
  });

  test('должен загружать сетевые интерфейсы при монтировании', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
    });
  });

  test('должен запускать сервер при нажатии на кнопку "Запустить сервер"', async () => {
    renderWithRouter(<MobileAccessPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/запустить сервер/i)).toBeInTheDocument();
    });

    const startButton = screen.getByText(/запустить сервер/i);
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockElectronAPI.startMobileServer).toHaveBeenCalledWith(3000);
    });
  });

  test('должен генерировать QR-код после запуска сервера и генерации сессии', async () => {
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve(null));
    
    renderWithRouter(<MobileAccessPage />);
    
    // Запускаем сервер
    await waitFor(() => {
      expect(screen.getByText(/запустить сервер/i)).toBeInTheDocument();
    });

    const startButton = screen.getByText(/запустить сервер/i);
    fireEvent.click(startButton);

    // Ждем генерации сессии
    await waitFor(() => {
      expect(mockElectronAPI.startMobileServer).toHaveBeenCalled();
    });

    // Ждем генерации QR-кода
    await waitFor(() => {
      expect(mockElectronAPI.generateMobileSession).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Проверяем, что QR-код отображается (может потребоваться дополнительное время для рендеринга canvas)
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      expect(canvas).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('должен отображать QR-код из сохраненной сессии', async () => {
    const savedSession = {
      sessionId: 'saved-session-id',
      url: 'http://192.168.1.100:3000/mobile/saved-session-id',
    };
    
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve(savedSession));
    mockElectronAPI.isMobileServerRunning = vi.fn(() => Promise.resolve(true));
    mockElectronAPI.getMobileServerInfo = vi.fn(() => Promise.resolve({
      success: true,
      port: 3000,
      isRunning: true,
    }));

    renderWithRouter(<MobileAccessPage />);

    // Ждем загрузки сохраненной сессии
    await waitFor(() => {
      expect(mockElectronAPI.getSavedMobileSession).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Проверяем, что QR-код отображается
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      expect(canvas).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('должен останавливать сервер при нажатии на кнопку "Остановить сервер"', async () => {
    mockElectronAPI.isMobileServerRunning = vi.fn(() => Promise.resolve(true));
    mockElectronAPI.getMobileServerInfo = vi.fn(() => Promise.resolve({
      success: true,
      port: 3000,
      isRunning: true,
    }));

    renderWithRouter(<MobileAccessPage />);

    await waitFor(() => {
      expect(screen.getByText(/остановить сервер/i)).toBeInTheDocument();
    });

    const stopButton = screen.getByText(/остановить сервер/i);
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopMobileServer).toHaveBeenCalled();
    });
  });

  test('должен очищать QR-код при остановке сервера', async () => {
    mockElectronAPI.isMobileServerRunning = vi.fn(() => Promise.resolve(true));
    mockElectronAPI.getMobileServerInfo = vi.fn(() => Promise.resolve({
      success: true,
      port: 3000,
      isRunning: true,
    }));
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve({
      sessionId: 'test-session',
      url: 'http://192.168.1.100:3000/mobile/test-session',
    }));

    renderWithRouter(<MobileAccessPage />);

    // Ждем загрузки QR-кода
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      return canvas !== null;
    }, { timeout: 2000 });

    // Останавливаем сервер
    await waitFor(() => {
      expect(screen.getByText(/остановить сервер/i)).toBeInTheDocument();
    });

    const stopButton = screen.getByText(/остановить сервер/i);
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockElectronAPI.stopMobileServer).toHaveBeenCalled();
    });

    // Проверяем, что QR-код больше не отображается
    await waitFor(() => {
      const canvas = document.querySelector('canvas[data-testid="qrcode-canvas"]');
      expect(canvas).not.toBeInTheDocument();
    });
  });

  test('должен отображать сетевые интерфейсы в выпадающем списке', async () => {
    renderWithRouter(<MobileAccessPage />);

    await waitFor(() => {
      expect(mockElectronAPI.getNetworkInterfaces).toHaveBeenCalled();
    });

    // Проверяем наличие выпадающего списка
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  test('должен обрабатывать ошибки при генерации QR-кода', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockElectronAPI.generateMobileSession = vi.fn(() => Promise.reject(new Error('Ошибка генерации сессии')));
    mockElectronAPI.getSavedMobileSession = vi.fn(() => Promise.resolve(null));

    renderWithRouter(<MobileAccessPage />);

    // Запускаем сервер
    await waitFor(() => {
      expect(screen.getByText(/запустить сервер/i)).toBeInTheDocument();
    });

    const startButton = screen.getByText(/запустить сервер/i);
    fireEvent.click(startButton);

    // Ждем обработки ошибки
    await waitFor(() => {
      expect(mockElectronAPI.generateMobileSession).toHaveBeenCalled();
    }, { timeout: 3000 });

    consoleErrorSpy.mockRestore();
  });
});
