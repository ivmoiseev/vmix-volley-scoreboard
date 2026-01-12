# Форматы вывода результатов тестов

Jest поддерживает несколько форматов вывода результатов тестов, удобных для машинного анализа и интеграции с CI/CD системами.

---

## Доступные форматы

### 1. JSON формат

**Использование:**
```bash
npm run test:json
```

**Выходной файл:** `test-results.json`

**Структура JSON:**
```json
{
  "numFailedTestSuites": 0,
  "numFailedTests": 0,
  "numPassedTestSuites": 3,
  "numPassedTests": 107,
  "numPendingTestSuites": 0,
  "numPendingTests": 0,
  "numRuntimeErrorTestSuites": 0,
  "numTotalTestSuites": 3,
  "numTotalTests": 107,
  "startTime": 1234567890,
  "success": true,
  "testResults": [
    {
      "name": "volleyballRules.test.js",
      "status": "passed",
      "message": "",
      "startTime": 1234567890,
      "endTime": 1234567900,
      "assertionResults": [
        {
          "ancestorTitles": ["volleyballRules", "isSetball"],
          "fullName": "volleyballRules isSetball должен возвращать false для низкого счета",
          "status": "passed",
          "title": "должен возвращать false для низкого счета",
          "duration": 5,
          "failureMessages": []
        }
      ]
    }
  ]
}
```

**Преимущества:**
- Легко парсится программами
- Содержит всю информацию о тестах
- Удобен для создания отчетов
- Подходит для интеграции с системами мониторинга

---

### 2. JUnit XML формат

**Использование:**
```bash
npm run test:junit
```

**Выходной файл:** `junit.xml` (в корне проекта)

**Структура XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="jest tests" tests="107" failures="0" errors="0" time="2.345">
  <testsuite name="volleyballRules.test.js" errors="0" failures="0" skipped="0" timestamp="2024-01-15T10:00:00" time="1.234" tests="44">
    <testcase classname="volleyballRules.isSetball" name="должен возвращать false для низкого счета" time="0.005">
    </testcase>
  </testsuite>
</testsuites>
```

**Преимущества:**
- Стандартный формат для CI/CD систем
- Поддерживается большинством систем (Jenkins, GitLab CI, GitHub Actions, Azure DevOps)
- Легко интегрируется с инструментами визуализации
- Подходит для исторического анализа результатов

**Настройка для CI/CD:**

**GitHub Actions:**
```yaml
- name: Run tests
  run: npm run test:junit
- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: junit.xml
```

**GitLab CI:**
```yaml
test:
  script:
    - npm run test:junit
  artifacts:
    reports:
      junit: junit.xml
```

---

### 3. LCOV формат (для покрытия кода)

**Использование:**
```bash
npm run test:coverage
```

**Выходной файл:** `coverage/lcov.info`

**Преимущества:**
- Стандартный формат для инструментов покрытия кода
- Поддерживается Codecov, Coveralls, SonarQube
- Легко интегрируется с CI/CD

**Интеграция с Codecov:**
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

---

### 4. Комбинированный формат для CI/CD

**Использование:**
```bash
npm run test:ci
```

**Что делает:**
- Запускает все тесты
- Генерирует покрытие кода
- Создает JSON отчет (`test-results.json`)
- Создает JUnit XML (`junit.xml`)
- Оптимизирован для CI/CD окружений

**Рекомендуется использовать в CI/CD пайплайнах.**

---

## Примеры использования

### Анализ результатов в Node.js скрипте

```javascript
const fs = require('fs');
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log(`Всего тестов: ${results.numTotalTests}`);
console.log(`Пройдено: ${results.numPassedTests}`);
console.log(`Провалено: ${results.numFailedTests}`);
console.log(`Успешность: ${(results.numPassedTests / results.numTotalTests * 100).toFixed(2)}%`);

// Анализ проваленных тестов
if (results.numFailedTests > 0) {
  console.log('\nПроваленные тесты:');
  results.testResults.forEach(suite => {
    suite.assertionResults
      .filter(test => test.status === 'failed')
      .forEach(test => {
        console.log(`- ${test.fullName}`);
        console.log(`  ${test.failureMessages.join('\n')}`);
      });
  });
}
```

### Парсинг JUnit XML

```javascript
const fs = require('fs');
const { parseString } = require('xml2js');

parseString(fs.readFileSync('junit.xml', 'utf8'), (err, result) => {
  if (err) {
    console.error('Ошибка парсинга XML:', err);
    return;
  }
  
  const testsuites = result.testsuites;
  console.log(`Всего тестов: ${testsuites.$.tests}`);
  console.log(`Провалено: ${testsuites.$.failures}`);
  console.log(`Ошибок: ${testsuites.$.errors}`);
  
  testsuites.testsuite.forEach(suite => {
    console.log(`\n${suite.$.name}:`);
    console.log(`  Тестов: ${suite.$.tests}`);
    console.log(`  Провалено: ${suite.$.failures}`);
  });
});
```

---

## Настройка вывода в CI/CD

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: |
            test-results.json
            junit.xml
            coverage/
      
      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: junit.xml
```

### GitLab CI

```yaml
test:
  stage: test
  image: node:18
  
  before_script:
    - npm ci
  
  script:
    - npm run test:ci
  
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - test-results.json
      - coverage/
    expire_in: 1 week
```

---

## Сравнение форматов

| Формат | Файл | Использование | CI/CD поддержка |
|--------|------|---------------|-----------------|
| JSON | `test-results.json` | Программный анализ, кастомные отчеты | ✅ |
| JUnit XML | `junit.xml` | CI/CD системы, визуализация | ✅✅ |
| LCOV | `coverage/lcov.info` | Инструменты покрытия кода | ✅✅ |
| HTML | `coverage/index.html` | Человекочитаемый отчет | ❌ |
| Text | Консоль | Быстрый просмотр | ❌ |

---

## Рекомендации

1. **Для локальной разработки:**
   ```bash
   npm test              # Обычный вывод
   npm run test:watch    # Режим watch
   ```

2. **Для CI/CD:**
   ```bash
   npm run test:ci       # Все форматы сразу
   ```

3. **Для анализа результатов:**
   ```bash
   npm run test:json     # JSON для программного анализа
   npm run test:junit    # XML для CI/CD систем
   ```

4. **Для покрытия кода:**
   ```bash
   npm run test:coverage # HTML + LCOV
   ```

---

## Установка дополнительных зависимостей

Для JUnit XML формата требуется `jest-junit`:

```bash
npm install --save-dev jest-junit
```

(Уже добавлено в `package.json`)

---

## Дополнительные настройки

### Настройка имени файла JUnit

Создайте файл `jest-junit.config.js`:

```javascript
module.exports = {
  suiteName: 'VolleyScore Master Tests',
  outputDirectory: './test-results',
  outputName: 'junit.xml',
  classNameTemplate: '{classname}',
  titleTemplate: '{title}',
  ancestorSeparator: ' > ',
  usePathForSuiteName: 'true',
};
```

### Настройка формата JSON

Можно настроить структуру JSON через переменные окружения или конфигурацию Jest.

---

**Дата создания:** 2024  
**Версия:** 1.0
