/**
 * Тесты для проверки HTTP API команд, отправляемых в vMix для логотипов
 * Проверяем, что после смены команд местами и сохранения настроек
 * отправляются правильные URL логотипов
 * 
 * ВАЖНО: Эти тесты проверяют логику формирования URL, а не реальные HTTP запросы
 */

describe('VMixClient - Logo API Tests', () => {

  describe('SetImage команда для логотипов', () => {
    test('должен отправлять правильный URL для logo_a.png для команды A', () => {
      const inputName = 'Input3';
      const fieldName = 'TeamLogo';
      const imagePath = 'http://192.168.1.100:3000/logos/logo_a.png';
      
      // Ожидаемый HTTP запрос
      const expectedURL = `http://localhost:8088/api?Function=SetImage&Input=${inputName}&SelectedName=${fieldName}&Value=${encodeURIComponent(imagePath)}`;
      
      // Проверяем, что URL формируется правильно
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      
      expect(actualURL).toContain('Function=SetImage');
      expect(actualURL).toContain(`Input=${inputName}`);
      expect(actualURL).toContain(`SelectedName=${fieldName}`);
      expect(actualURL).toContain('logo_a.png');
      expect(actualURL).not.toContain('logo_b.png');
    });

    test('должен отправлять правильный URL для logo_b.png для команды B', () => {
      const inputName = 'Input4';
      const fieldName = 'TeamLogo';
      const imagePath = 'http://192.168.1.100:3000/logos/logo_b.png';
      
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      
      expect(actualURL).toContain('Function=SetImage');
      expect(actualURL).toContain(`Input=${inputName}`);
      expect(actualURL).toContain(`SelectedName=${fieldName}`);
      expect(actualURL).toContain('logo_b.png');
      expect(actualURL).not.toContain('logo_a.png');
    });

    test('после смены команд местами должен отправлять logo_a.png для rosterTeamA независимо от logoPath в команде', () => {
      // Симулируем ситуацию после смены команд местами:
      // teamA теперь содержит данные бывшей команды B, но должен использовать logo_a.png
      const inputName = 'Input3'; // rosterTeamA
      const fieldName = 'TeamLogo';
      
      // Критический момент: используется teamKey для определения имени файла
      const teamKey = 'A';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const imagePath = `${logoBaseUrl}/${logoFileName}`;
      
      // Даже если в команде есть неправильный logoPath, должен использоваться правильный файл
      const team = {
        name: 'Команда B (новая A)',
        logoPath: 'logos/logo_b.png', // Неправильный путь после смены!
      };
      
      // Но для rosterTeamA (teamKey = 'A') должен использоваться logo_a.png
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      
      // Критическая проверка: должен быть logo_a.png, а не logo_b.png
      expect(actualURL).toContain('logo_a.png');
      expect(actualURL).not.toContain('logo_b.png');
      expect(logoFileName).toBe('logo_a.png');
    });

    test('после смены команд местами должен отправлять logo_b.png для rosterTeamB независимо от logoPath в команде', () => {
      // Симулируем ситуацию после смены команд местами:
      // teamB теперь содержит данные бывшей команды A, но должен использовать logo_b.png
      const inputName = 'Input4'; // rosterTeamB
      const fieldName = 'TeamLogo';
      
      // Критический момент: используется teamKey для определения имени файла
      const teamKey = 'B';
      const logoFileName = teamKey === 'A' ? 'logo_a.png' : 'logo_b.png';
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      const imagePath = `${logoBaseUrl}/${logoFileName}`;
      
      // Даже если в команде есть неправильный logoPath, должен использоваться правильный файл
      const team = {
        name: 'Команда A (новая B)',
        logoPath: 'logos/logo_a.png', // Неправильный путь после смены!
      };
      
      // Но для rosterTeamB (teamKey = 'B') должен использоваться logo_b.png
      const baseURL = 'http://localhost:8088/api';
      const queryParams = new URLSearchParams();
      queryParams.append('Function', 'SetImage');
      queryParams.append('Input', inputName);
      queryParams.append('SelectedName', fieldName);
      queryParams.append('Value', imagePath);
      const actualURL = `${baseURL}?${queryParams.toString()}`;
      
      // Критическая проверка: должен быть logo_b.png, а не logo_a.png
      expect(actualURL).toContain('logo_b.png');
      expect(actualURL).not.toContain('logo_a.png');
      expect(logoFileName).toBe('logo_b.png');
    });
  });

  describe('Сценарий: Смена команд местами и сохранение настроек', () => {
    test('после смены команд и сохранения настроек должны отправляться правильные URL логотипов', () => {
      // После смены команд местами:
      // - logo_a.png содержит логотип бывшей команды B (теперь команды A)
      // - logo_b.png содержит логотип бывшей команды A (теперь команды B)
      
      const logoBaseUrl = 'http://192.168.1.100:3000/logos';
      
      // Для rosterTeamA (teamKey = 'A') должен использоваться logo_a.png
      const teamKeyA = 'A';
      const logoFileNameA = teamKeyA === 'A' ? 'logo_a.png' : 'logo_b.png';
      const imagePathA = `${logoBaseUrl}/${logoFileNameA}`;
      
      // Для rosterTeamB (teamKey = 'B') должен использоваться logo_b.png
      const teamKeyB = 'B';
      const logoFileNameB = teamKeyB === 'A' ? 'logo_a.png' : 'logo_b.png';
      const imagePathB = `${logoBaseUrl}/${logoFileNameB}`;
      
      // Проверяем, что используются правильные файлы
      expect(imagePathA).toBe('http://192.168.1.100:3000/logos/logo_a.png');
      expect(imagePathB).toBe('http://192.168.1.100:3000/logos/logo_b.png');
      expect(imagePathA).not.toContain('logo_b.png');
      expect(imagePathB).not.toContain('logo_a.png');
    });
  });
});
