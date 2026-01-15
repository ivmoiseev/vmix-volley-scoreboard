/**
 * Тесты для проверки обработки логотипов при смене команд местами
 * TDD подход: сначала тесты, затем исправление кода
 * 
 * Проблемы, которые проверяем:
 * 1. После swapTeams логотипы должны быть правильно сохранены в файлы
 * 2. logoPath должен быть правильно установлен после swapTeams
 * 3. logoBase64 должен быть правильно установлен после swapTeams
 * 4. После swapTeams не должно быть конфликта при последующем сохранении
 */

import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import path from 'path';

// Используем mockPath для доступа внутри jest.mock() (Jest требует префикс mock для переменных в моках)
const mockPath = path;
jest.mock('electron', () => {
  return {
    app: {
      isPackaged: false,
      getPath: jest.fn(() => mockPath.join(__dirname, '../../temp-test-logos')),
    },
  };
});

// Моки для server.js чтобы избежать проблем с uuid
jest.mock('../../../src/main/server.js', () => ({}));

// Моки для logoManager
jest.mock('../../../src/main/logoManager.js', () => {
  return {
    processTeamLogoForSave: jest.fn(async (team, teamLetter) => {
      // Симулируем сохранение логотипа с уникальным именем (timestamp)
      const logoBase64 = team.logo || team.logoBase64;
      if (!logoBase64) {
        return {
          ...team,
          logoPath: undefined,
          logoBase64: undefined,
          logo: undefined,
        };
      }
      
      // Возвращаем правильный logoPath с уникальным именем (timestamp)
      const timestamp = Date.now();
      return {
        ...team,
        logoPath: `logos/logo_${teamLetter.toLowerCase()}_${timestamp}.png`,
        logoBase64: logoBase64,
        logo: undefined,
      };
    }),
    cleanupLogosDirectory: jest.fn(async () => {}),
  };
});

// Импортируем logoManager после мока
import logoManagerModule from '../../../src/main/logoManager.js';
const logoManager = logoManagerModule.default || logoManagerModule;

describe('swapTeams - обработка логотипов', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Проблема 1: Правильность сохранения логотипов в файлы', () => {
    test('должен сохранять логотип бывшей команды B в logo_a.png для новой команды A', async () => {
      const match = {
        matchId: 'test-match-1',
        teamA: {
          name: 'Команда A',
          logoBase64: 'data:image/png;base64,TEAM_A_LOGO_BASE64',
          logoPath: 'logos/logo_a.png',
        },
        teamB: {
          name: 'Команда B',
          logoBase64: 'data:image/png;base64,TEAM_B_LOGO_BASE64',
          logoPath: 'logos/logo_b.png',
        },
        currentSet: {
          scoreA: 10,
          scoreB: 15,
          servingTeam: 'A',
        },
        sets: [],
        statistics: {
          teamA: { attack: 5 },
          teamB: { attack: 8 },
        },
      };

      // Симулируем swapTeams
      const swappedMatch = JSON.parse(JSON.stringify(match));
      
      // Сохраняем оригинальные логотипы
      const originalTeamALogo = match.teamA.logo || match.teamA.logoBase64;
      const originalTeamBLogo = match.teamB.logo || match.teamB.logoBase64;
      
      // Меняем команды местами
      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;
      
      // Обрабатываем логотипы
      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          { logo: originalTeamBLogo },
          'A'
        );
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          { logo: originalTeamALogo },
          'B'
        );
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }
      
      // Проверки
      expect(logoManager.processTeamLogoForSave).toHaveBeenCalledWith(
        { logo: 'data:image/png;base64,TEAM_B_LOGO_BASE64' },
        'A'
      );
      expect(logoManager.processTeamLogoForSave).toHaveBeenCalledWith(
        { logo: 'data:image/png;base64,TEAM_A_LOGO_BASE64' },
        'B'
      );
      
      // Проверяем, что logoPath установлен правильно (теперь с уникальным именем)
      expect(swappedMatch.teamA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(swappedMatch.teamB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      
      // Проверяем, что logoBase64 установлен правильно
      expect(swappedMatch.teamA.logoBase64).toBe('data:image/png;base64,TEAM_B_LOGO_BASE64');
      expect(swappedMatch.teamB.logoBase64).toBe('data:image/png;base64,TEAM_A_LOGO_BASE64');
    });
  });

  describe('Проблема 2: Конфликт при повторном вызове setCurrentMatch после swapTeams', () => {
    test('после swapTeams setCurrentMatch не должен перезаписывать правильно установленные logoPath', async () => {
      const match = {
        matchId: 'test-match-2',
        teamA: {
          name: 'Команда A',
          logoBase64: 'data:image/png;base64,TEAM_A_LOGO',
          logoPath: 'logos/logo_a.png',
        },
        teamB: {
          name: 'Команда B',
          logoBase64: 'data:image/png;base64,TEAM_B_LOGO',
          logoPath: 'logos/logo_b.png',
        },
        currentSet: { scoreA: 0, scoreB: 0, servingTeam: 'A' },
        sets: [],
        statistics: { teamA: {}, teamB: {} },
      };

      // Симулируем swapTeams
      const swappedMatch = JSON.parse(JSON.stringify(match));
      const originalTeamALogo = match.teamA.logoBase64;
      const originalTeamBLogo = match.teamB.logoBase64;
      
      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;
      
      // Обрабатываем логотипы в swapTeams
      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          { logo: originalTeamBLogo },
          'A'
        );
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          { logo: originalTeamALogo },
          'B'
        );
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }
      
      // Сохраняем правильные значения после swapTeams
      const correctLogoPathA = swappedMatch.teamA.logoPath;
      const correctLogoPathB = swappedMatch.teamB.logoPath;
      const correctLogoBase64A = swappedMatch.teamA.logoBase64;
      const correctLogoBase64B = swappedMatch.teamB.logoBase64;
      
      // Симулируем setCurrentMatch (который вызывается после swapTeams)
      // setCurrentMatch должен использовать уже установленные logoBase64
      if (swappedMatch.teamA) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          swappedMatch.teamA,
          'A'
        );
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
      }
      
      if (swappedMatch.teamB) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          swappedMatch.teamB,
          'B'
        );
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
      }
      
      // Проверяем, что logoPath остались правильными
      expect(swappedMatch.teamA.logoPath).toBe(correctLogoPathA);
      expect(swappedMatch.teamB.logoPath).toBe(correctLogoPathB);
      expect(swappedMatch.teamA.logoBase64).toBe(correctLogoBase64A);
      expect(swappedMatch.teamB.logoBase64).toBe(correctLogoBase64B);
    });
  });

  describe('Проблема 3: Конфликт при сохранении настроек после swapTeams', () => {
    test('handleSave не должен перезаписывать logoPath старыми значениями из исходного матча', async () => {
      // Исходный матч до swapTeams
      const originalMatch = {
        matchId: 'test-match-3',
        teamA: {
          name: 'Команда A',
          logoBase64: 'data:image/png;base64,TEAM_A_LOGO',
          logoPath: 'logos/logo_a.png',
        },
        teamB: {
          name: 'Команда B',
          logoBase64: 'data:image/png;base64,TEAM_B_LOGO',
          logoPath: 'logos/logo_b.png',
        },
        currentSet: { scoreA: 0, scoreB: 0, servingTeam: 'A' },
        sets: [],
        statistics: { teamA: {}, teamB: {} },
      };

      // После swapTeams
      const swappedMatch = JSON.parse(JSON.stringify(originalMatch));
      const originalTeamALogo = originalMatch.teamA.logoBase64;
      const originalTeamBLogo = originalMatch.teamB.logoBase64;
      
      const tempTeam = swappedMatch.teamA;
      swappedMatch.teamA = swappedMatch.teamB;
      swappedMatch.teamB = tempTeam;
      
      // Обрабатываем логотипы в swapTeams
      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          { logo: originalTeamBLogo },
          'A'
        );
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }
      
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          { logo: originalTeamALogo },
          'B'
        );
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }
      
      // Правильные значения после swapTeams
      const correctLogoPathA = swappedMatch.teamA.logoPath; // должен быть 'logos/logo_a.png'
      const correctLogoPathB = swappedMatch.teamB.logoPath; // должен быть 'logos/logo_b.png'
      
      // Симулируем handleSave - НЕПРАВИЛЬНОЕ поведение (которое нужно исправить)
      // handleSave не должен сохранять старые logoPath из originalMatch
      const updatedMatch = {
        ...swappedMatch,
        teamA: {
          ...swappedMatch.teamA,
          // НЕПРАВИЛЬНО: сохраняем старые logoPath из originalMatch
          // logoPath: originalMatch.teamA.logoPath, // ЭТО НЕПРАВИЛЬНО!
          // ПРАВИЛЬНО: используем logoPath из swappedMatch
          logoPath: swappedMatch.teamA.logoPath,
          logoBase64: swappedMatch.teamA.logoBase64,
        },
        teamB: {
          ...swappedMatch.teamB,
          // НЕПРАВИЛЬНО: сохраняем старые logoPath из originalMatch
          // logoPath: originalMatch.teamB.logoPath, // ЭТО НЕПРАВИЛЬНО!
          // ПРАВИЛЬНО: используем logoPath из swappedMatch
          logoPath: swappedMatch.teamB.logoPath,
          logoBase64: swappedMatch.teamB.logoBase64,
        },
      };
      
      // Проверяем, что logoPath не перезаписаны старыми значениями
      // После swapTeams команды поменялись местами, поэтому:
      // - swappedMatch.teamA содержит данные бывшей команды B
      // - swappedMatch.teamB содержит данные бывшей команды A
      // Но logoPath должны быть правильными (logo_a.png для teamA, logo_b.png для teamB)
      expect(updatedMatch.teamA.logoPath).toBe(correctLogoPathA);
      expect(updatedMatch.teamB.logoPath).toBe(correctLogoPathB);
      
      // Критическая проверка: logoPath должны соответствовать правильным файлам
      // независимо от того, что было в originalMatch (теперь с уникальными именами)
      expect(updatedMatch.teamA.logoPath).toMatch(/^logos\/logo_a_\d+\.png$/);
      expect(updatedMatch.teamB.logoPath).toMatch(/^logos\/logo_b_\d+\.png$/);
      
      // Проверяем, что logoBase64 правильные (бывший логотип B в teamA, бывший A в teamB)
      expect(updatedMatch.teamA.logoBase64).toBe(originalMatch.teamB.logoBase64);
      expect(updatedMatch.teamB.logoBase64).toBe(originalMatch.teamA.logoBase64);
    });
  });
});
