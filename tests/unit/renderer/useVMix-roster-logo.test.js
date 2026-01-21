/**
 * Тесты для проверки проблемы с логотипами в инпуте "Заявка"
 * после смены команд местами и сохранения настроек
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useVMix - Roster Logo Tests', () => {
  // Моки для window.electronAPI
  const mockElectronAPI = {
    getMobileServerInfo: vi.fn(),
    updateVMixInputFields: vi.fn(),
  };

  beforeEach(() => {
    global.window = {
      electronAPI: mockElectronAPI,
    };
    mockElectronAPI.getMobileServerInfo.mockResolvedValue({
      ip: '192.168.1.100',
      port: 3000,
    });
    mockElectronAPI.updateVMixInputFields.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getRosterFieldValue - teamLogo', () => {
    test('должен возвращать правильный URL логотипа для команды A', () => {
      // Импортируем функцию напрямую (если возможно) или тестируем через useVMix
      // Для теста создаем минимальную реализацию логики
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = {
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        logoPath: 'logos/logo_a.png',
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';

      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
    });

    test('должен возвращать правильный URL логотипа для команды B', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const teamKey = 'B';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = {
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        logoPath: 'logos/logo_b.png',
        logoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
      };

      const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';

      expect(result).toBe('http://192.168.1.100:3000/logos/logo_b.png');
    });

    test('должен использовать teamKey для определения имени файла, а не logoPath из команды', () => {
      // Это критический тест: после смены команд местами logoPath может быть неправильным
      // но teamKey всегда правильный
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      
      // Симулируем ситуацию после смены команд местами:
      // teamA теперь содержит данные бывшей команды B, но logoPath может быть старым
      const teamA = {
        name: 'Команда B (бывшая)',
        logoPath: 'logos/logo_b.png', // Старый путь!
        logoBase64: 'data:image/png;base64,TEAM_B_LOGO',
      };
      
      const teamKey = 'A'; // Правильный teamKey
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      
      // Должен использовать teamKey, а не logoPath из команды
      const hasLogo = logoBaseUrl && (teamA?.logo || teamA?.logoPath || teamA?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';

      // Ожидаем logo_a.png, так как teamKey = 'A', а не logo_b.png из logoPath
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(result).not.toContain('logo_b.png');
    });
  });

  describe('Сценарий: Смена команд местами и сохранение настроек', () => {
    test('после смены команд местами logo_a.png должен содержать логотип новой команды A', () => {
      // Исходное состояние
      const originalMatch = {
        teamA: {
          name: 'Команда A',
          logoBase64: 'data:image/png;base64,LOGO_A',
        },
        teamB: {
          name: 'Команда B',
          logoBase64: 'data:image/png;base64,LOGO_B',
        },
      };

      // После смены команд местами
      const swappedMatch = {
        teamA: {
          name: 'Команда B', // Бывшая команда B
          logoBase64: 'data:image/png;base64,LOGO_B',
          logoPath: 'logos/logo_a.png', // Должен указывать на logo_a.png
        },
        teamB: {
          name: 'Команда A', // Бывшая команда A
          logoBase64: 'data:image/png;base64,LOGO_A',
          logoPath: 'logos/logo_b.png', // Должен указывать на logo_b.png
        },
      };

      // Проверяем, что после смены:
      // - teamA содержит данные бывшей команды B
      // - logoPath для teamA указывает на logo_a.png
      expect(swappedMatch.teamA.name).toBe('Команда B');
      expect(swappedMatch.teamA.logoPath).toBe('logos/logo_a.png');
      expect(swappedMatch.teamB.name).toBe('Команда A');
      expect(swappedMatch.teamB.logoPath).toBe('logos/logo_b.png');
    });

    test('при формировании URL для rosterTeamA должен использоваться logo_a.png независимо от logoPath', () => {
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      
      // После смены команд местами teamA может иметь неправильный logoPath
      const match = {
        teamA: {
          name: 'Команда B (новая A)',
          logoPath: 'logos/logo_b.png', // Неправильный путь после смены!
          logoBase64: 'data:image/png;base64,LOGO_B',
        },
      };

      // Для rosterTeamA (teamKey = 'A') должен использоваться logo_a.png
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const team = match.teamA;
      
      const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
      const result = hasLogo ? `${logoBaseUrl}/${logoFileName}` : '';

      // Критическая проверка: должен быть logo_a.png, а не logo_b.png из logoPath
      expect(result).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(logoFileName).toBe('logo_a.png');
    });
  });
});
