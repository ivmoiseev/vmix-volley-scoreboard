const express = require('express');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const path = require('path');
const errorHandler = require('../shared/errorHandler');
const settingsManager = require('./settingsManager');

/**
 * HTTP сервер для мобильного доступа
 */
class MobileServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = 3000;
    this.sessions = new Map(); // Хранилище активных сессий
    this.currentMatch = null; // Текущий матч
    this.onMatchUpdate = null; // Callback для уведомления об изменениях матча
    this.savedSessionId = null; // Сохраненный sessionId из настроек
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Настройка middleware
   */
  setupMiddleware() {
    // CORS для мобильных устройств
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Парсинг JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Статические файлы (для мобильного интерфейса)
    this.app.use(express.static('public'));
    
    // Статические файлы для логотипов
    const logosPath = path.join(__dirname, '../../logos');
    this.app.use('/logos', express.static(logosPath));
  }

  /**
   * Настройка маршрутов
   */
  setupRoutes() {
    // Главная страница мобильной панели
    this.app.get('/panel/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      
      if (!this.validateSession(sessionId)) {
        return res.status(403).send('Неверная или истекшая сессия');
      }

      // Отправляем HTML страницу мобильной панели
      res.send(this.getMobilePanelHTML(sessionId));
    });

    // API: Получение данных матча
    this.app.get('/api/match/:sessionId', (req, res) => {
      const { sessionId } = req.params;
      
      if (!this.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!this.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      res.json(this.currentMatch);
    });

    // API: Проверка доступности логотипов (для отладки)
    this.app.get('/api/logos/check', (req, res) => {
      const fs = require('fs').promises;
      const logosPath = path.join(__dirname, '../../logos');
      
      Promise.all([
        fs.access(path.join(logosPath, 'logo_a.png')).then(() => true).catch(() => false),
        fs.access(path.join(logosPath, 'logo_b.png')).then(() => true).catch(() => false),
      ]).then(([logoA, logoB]) => {
        res.json({
          logosPath,
          logoA: { exists: logoA, url: `${this.getLocalIP()}:${this.port}/logos/logo_a.png` },
          logoB: { exists: logoB, url: `${this.getLocalIP()}:${this.port}/logos/logo_b.png` },
          serverIP: this.getLocalIP(),
          serverPort: this.port,
        });
      }).catch((error) => {
        res.status(500).json({ error: error.message });
      });
    });

    // API: Обновление счета
    this.app.post('/api/match/:sessionId/score', (req, res) => {
      try {
        const { sessionId } = req.params;
        const { team, delta } = req.body;
        
        if (!this.validateSession(sessionId)) {
          return res.status(403).json({ error: 'Неверная или истекшая сессия' });
        }

        if (!this.currentMatch) {
          return res.status(404).json({ error: 'Матч не найден' });
        }

        if (!team || (team !== 'A' && team !== 'B')) {
          return res.status(400).json({ error: 'Неверный параметр команды' });
        }

        // Обновляем счет
        if (team === 'A') {
          this.currentMatch.currentSet.scoreA = Math.max(0, 
            this.currentMatch.currentSet.scoreA + (delta || 0));
          if (delta > 0) {
            this.currentMatch.currentSet.servingTeam = 'A';
          }
        } else if (team === 'B') {
          this.currentMatch.currentSet.scoreB = Math.max(0, 
            this.currentMatch.currentSet.scoreB + (delta || 0));
          if (delta > 0) {
            this.currentMatch.currentSet.servingTeam = 'B';
          }
        }

        this.currentMatch.updatedAt = new Date().toISOString();

        // Уведомляем основное приложение об изменении матча
        if (this.onMatchUpdate) {
          this.onMatchUpdate(this.currentMatch);
        }

        res.json({ success: true, match: this.currentMatch });
      } catch (error) {
        const friendlyError = errorHandler.handleError(error, 'API: update score');
        res.status(500).json({ error: friendlyError });
      }
    });

    // API: Завершение партии
    this.app.post('/api/match/:sessionId/set', (req, res) => {
      try {
        const { sessionId } = req.params;
        
        if (!this.validateSession(sessionId)) {
          return res.status(403).json({ error: 'Неверная или истекшая сессия' });
        }

        if (!this.currentMatch) {
          return res.status(404).json({ error: 'Матч не найден' });
        }

        const { scoreA, scoreB } = this.currentMatch.currentSet;
        
        // Проверяем, можно ли завершить партию
        const maxScore = Math.max(scoreA, scoreB);
        const minScore = Math.min(scoreA, scoreB);
        if (maxScore < 25 || (maxScore - minScore) < 2) {
          return res.status(400).json({ 
            error: 'Партия не может быть завершена. Необходимо набрать 25 очков с разницей минимум 2 очка.' 
          });
        }
        
        // Сохраняем завершенную партию
        const completedSet = {
          setNumber: this.currentMatch.currentSet.setNumber,
          scoreA,
          scoreB,
          completed: true,
        };
        
        this.currentMatch.sets.push(completedSet);
        
        // Переходим к следующей партии
        const nextSetNumber = this.currentMatch.currentSet.setNumber + 1;
        const winner = scoreA > scoreB ? 'A' : 'B';
        
        this.currentMatch.currentSet = {
          setNumber: nextSetNumber,
          scoreA: 0,
          scoreB: 0,
          servingTeam: winner,
        };
        
        this.currentMatch.updatedAt = new Date().toISOString();

        // Уведомляем основное приложение об изменении матча
        if (this.onMatchUpdate) {
          this.onMatchUpdate(this.currentMatch);
        }

        res.json({ success: true, match: this.currentMatch });
      } catch (error) {
        const friendlyError = errorHandler.handleError(error, 'API: finish set');
        res.status(500).json({ error: friendlyError });
      }
    });

    // API: Изменение подачи
    this.app.post('/api/match/:sessionId/serve', (req, res) => {
      const { sessionId } = req.params;
      const { team } = req.body; // Принимаем команду ('A' или 'B')
      
      if (!this.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!this.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Проверяем, что передана корректная команда
      if (team === 'A' || team === 'B') {
        // Если подача уже у этой команды, ничего не делаем
        if (this.currentMatch.currentSet.servingTeam !== team) {
          this.currentMatch.currentSet.servingTeam = team;
          this.currentMatch.updatedAt = new Date().toISOString();

          // Уведомляем основное приложение об изменении матча
          if (this.onMatchUpdate) {
            this.onMatchUpdate(this.currentMatch);
          }
        }
      } else {
        return res.status(400).json({ error: 'Некорректная команда. Ожидается "A" или "B"' });
      }

      res.json({ success: true, match: this.currentMatch });
    });

    // API: Отмена последнего действия (упрощенная версия)
    this.app.post('/api/match/:sessionId/undo', (req, res) => {
      const { sessionId } = req.params;
      
      if (!this.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!this.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Упрощенная версия отмены - просто перезагружаем данные из основного приложения
      // В реальном приложении можно добавить систему истории действий
      res.json({ success: true, match: this.currentMatch });
    });
  }

  /**
   * Генерирует HTML для мобильной панели
   */
  getMobilePanelHTML(sessionId) {
    const serverPort = this.port;
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>vMix Volley Scoreboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 0.5rem;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background: rgba(44, 62, 80, 0.95);
      color: white;
      padding: 1rem;
      text-align: center;
      border-radius: 12px 12px 0 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .header h1 {
      font-size: 1.3rem;
      font-weight: 600;
    }
    .match-info {
      background: rgba(255, 255, 255, 0.95);
      padding: 0.75rem;
      text-align: center;
      font-size: 0.85rem;
      color: #7f8c8d;
      border-radius: 0;
    }
    .score-section {
      background: white;
      padding: 1.5rem 1rem;
      text-align: center;
      border: 3px solid #3498db;
      border-radius: 12px;
      margin: 0.5rem 0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .teams {
      display: flex;
      justify-content: space-around;
      margin-bottom: 1rem;
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
    }
    .team-name {
      flex: 1;
      padding: 0.5rem;
    }
    .score {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 5rem;
      font-weight: bold;
      color: #2c3e50;
      line-height: 1;
      margin: 0.5rem 0;
      position: relative;
    }
    .score-team {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 80px;
    }
    .score-separator {
      font-size: 5rem;
      line-height: 1;
    }
    .indicator-badge {
      position: absolute;
      top: -15px;
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: bold;
      color: white;
      white-space: nowrap;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .indicator-badge.setball {
      background: #f39c12;
    }
    .indicator-badge.matchball {
      background: #e74c3c;
    }
    .score-team:first-child .indicator-badge {
      right: -25px;
    }
    .score-team:last-child .indicator-badge {
      left: -25px;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 8px;
      padding: 0.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin: 0 0.5rem;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .set-info {
      font-size: 0.9rem;
      color: #7f8c8d;
      margin-top: 0.5rem;
    }
    .serve-info {
      background: #ecf0f1;
      padding: 0.75rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .serve-info .serving {
      color: #f39c12;
      font-weight: bold;
    }
    .indicators {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin: 0.5rem 0;
      flex-wrap: wrap;
    }
    .indicator {
      padding: 0.4rem 0.8rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: bold;
      color: white;
    }
    .indicator.setball {
      background: #f39c12;
    }
    .indicator.matchball {
      background: #e74c3c;
    }
    .buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .button {
      padding: 1.25rem;
      font-size: 1.8rem;
      font-weight: bold;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      color: white;
      touch-action: manipulation;
      user-select: none;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .button:active {
      transform: scale(0.95);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .button-minus {
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }
    .button-plus {
      background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    }
    .button-label {
      font-size: 0.7rem;
      font-weight: normal;
      display: block;
      margin-top: 0.25rem;
    }
    .sets {
      background: white;
      padding: 1rem;
      border-radius: 12px;
      margin: 1rem 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .sets h3 {
      font-size: 1rem;
      margin-bottom: 0.75rem;
      color: #2c3e50;
    }
    .set-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      border-bottom: 1px solid #ecf0f1;
      font-size: 0.95rem;
    }
    .set-item:last-child {
      border-bottom: none;
    }
    .set-item.current {
      background: #e8f4f8;
      border-radius: 6px;
      margin: 0.25rem 0;
      font-weight: 600;
    }
    .action-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .action-button {
      padding: 1rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      color: white;
      touch-action: manipulation;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .action-button:active {
      transform: scale(0.95);
    }
    .action-button.finish {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }
    .action-button.undo {
      background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
    }
    .action-button:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .status {
      text-align: center;
      padding: 0.75rem;
      margin: 1rem 0;
      border-radius: 12px;
      font-weight: 500;
      font-size: 0.9rem;
    }
    .status.connected {
      background: #27ae60;
      color: white;
    }
    .status.disconnected {
      background: #e74c3c;
      color: white;
    }
    .status.syncing {
      background: #f39c12;
      color: white;
    }
    @media (max-width: 480px) {
      .score {
        font-size: 4rem;
      }
      .button {
        padding: 1rem;
        font-size: 1.5rem;
      }
    }
    @media (orientation: landscape) and (max-height: 500px) {
      .score {
        font-size: 3rem;
      }
      .button {
        padding: 0.75rem;
        font-size: 1.3rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>vMix Volley Scoreboard</h1>
    </div>
    
    <div class="match-info" id="matchInfo">
      Загрузка...
    </div>
    
    <div class="score-section">
      <div class="teams">
        <div class="team-name" id="teamA">Команда А</div>
        <div class="team-name" id="teamB">Команда Б</div>
      </div>
      <div class="score">
        <div class="logo-container" id="logoA"></div>
        <div class="score-team">
          <span id="scoreA">0</span>
          <div class="indicator-badge" id="indicatorA" style="display: none;"></div>
        </div>
        <span class="score-separator">:</span>
        <div class="score-team">
          <span id="scoreB">0</span>
          <div class="indicator-badge" id="indicatorB" style="display: none;"></div>
        </div>
        <div class="logo-container" id="logoB"></div>
      </div>
      <div class="set-info" id="setInfo">Партия 1</div>
      <div class="serve-info" style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
        <span>Подача:</span>
        <span class="serving" id="servingTeam" style="color: #f39c12; font-weight: bold;">-</span>
        <div style="display: flex; gap: 0.5rem;">
          <button 
            id="serveLeftBtn" 
            onclick="changeServingTeam('A')"
            style="
              padding: 0.5rem 0.75rem;
              font-size: 1.2rem;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              touch-action: manipulation;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            "
          >
            ◄
          </button>
          <button 
            id="serveRightBtn" 
            onclick="changeServingTeam('B')"
            style="
              padding: 0.5rem 0.75rem;
              font-size: 1.2rem;
              background-color: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              touch-action: manipulation;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            "
          >
            ►
          </button>
        </div>
      </div>
    </div>

    <div class="buttons">
      <button class="button button-minus" onclick="changeScore('A', -1)">
        -1
        <span class="button-label" id="labelA">Команда А</span>
      </button>
      <button class="button button-minus" onclick="changeScore('B', -1)">
        -1
        <span class="button-label" id="labelB">Команда Б</span>
      </button>
      <button class="button button-plus" onclick="changeScore('A', 1)">
        +1
        <span class="button-label" id="labelA2">Команда А</span>
      </button>
      <button class="button button-plus" onclick="changeScore('B', 1)">
        +1
        <span class="button-label" id="labelB2">Команда Б</span>
      </button>
    </div>

    <div class="sets">
      <h3>Счет по партиям:</h3>
      <div id="setsList"></div>
    </div>

    <div class="action-buttons">
      <button class="action-button finish" id="finishBtn" onclick="finishSet()">
        Завершить партию
      </button>
      <button class="action-button undo" id="undoBtn" onclick="undoAction()" disabled>
        Отменить
      </button>
    </div>

    <div class="status connected" id="status">
      Синхронизировано
    </div>
  </div>

  <script>
    const sessionId = '${sessionId}';
    let matchData = null;
    let updateInterval = null;
    let lastUpdateTime = Date.now();
    let actionHistory = [];

    async function loadMatch() {
      try {
        const response = await fetch(\`/api/match/\${sessionId}\`);
        if (response.ok) {
          const data = await response.json();
          if (JSON.stringify(data) !== JSON.stringify(matchData)) {
            matchData = data;
            lastUpdateTime = Date.now();
            updateUI();
            updateStatus('connected', null, false); // Обновление с сервера
          }
        } else if (response.status === 403) {
          updateStatus('disconnected', 'Сессия истекла');
        } else {
          updateStatus('disconnected', 'Ошибка загрузки данных');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        updateStatus('disconnected', 'Ошибка подключения');
      }
    }

    function updateUI() {
      if (!matchData) return;

      // Информация о матче
      const matchInfo = [];
      if (matchData.tournament) matchInfo.push(matchData.tournament);
      if (matchData.venue) matchInfo.push(matchData.venue);
      document.getElementById('matchInfo').textContent = 
        matchInfo.length > 0 ? matchInfo.join(' | ') : 'Матч';

      // Команды
      document.getElementById('teamA').textContent = matchData.teamA.name;
      document.getElementById('teamB').textContent = matchData.teamB.name;
      document.getElementById('labelA').textContent = matchData.teamA.name;
      document.getElementById('labelB').textContent = matchData.teamB.name;
      document.getElementById('labelA2').textContent = matchData.teamA.name;
      document.getElementById('labelB2').textContent = matchData.teamB.name;

      // Счет
      document.getElementById('scoreA').textContent = matchData.currentSet.scoreA;
      document.getElementById('scoreB').textContent = matchData.currentSet.scoreB;
      
      // Логотипы команд
      const logoA = document.getElementById('logoA');
      const logoB = document.getElementById('logoB');
      
      // Для команды A: приоритет HTTP URL (фиксированное имя), затем base64
      let logoAUrl = null;
      // Всегда пробуем использовать фиксированное имя logo_a.png
      logoAUrl = \`http://\${window.location.hostname}:${serverPort}/logos/logo_a.png\`;
      
      // Если нет base64, используем HTTP URL (может быть 404, но браузер обработает)
      if (matchData.teamA.logoBase64) {
        // Используем base64 из JSON (более надежно)
        logoAUrl = matchData.teamA.logoBase64;
      } else if (matchData.teamA.logo) {
        // Старый формат (обратная совместимость)
        logoAUrl = matchData.teamA.logo;
      }
      
      if (logoAUrl) {
        logoA.innerHTML = \`<img src="\${logoAUrl}" alt="\${matchData.teamA.name}" onerror="this.parentElement.style.display='none'" />\`;
        logoA.style.display = 'flex';
      } else {
        logoA.innerHTML = '';
        logoA.style.display = 'none';
      }
      
      // Для команды B: приоритет HTTP URL (фиксированное имя), затем base64
      let logoBUrl = null;
      // Всегда пробуем использовать фиксированное имя logo_b.png
      logoBUrl = \`http://\${window.location.hostname}:${serverPort}/logos/logo_b.png\`;
      
      // Если нет base64, используем HTTP URL (может быть 404, но браузер обработает)
      if (matchData.teamB.logoBase64) {
        // Используем base64 из JSON (более надежно)
        logoBUrl = matchData.teamB.logoBase64;
      } else if (matchData.teamB.logo) {
        // Старый формат (обратная совместимость)
        logoBUrl = matchData.teamB.logo;
      }
      
      if (logoBUrl) {
        logoB.innerHTML = \`<img src="\${logoBUrl}" alt="\${matchData.teamB.name}" onerror="this.parentElement.style.display='none'" />\`;
        logoB.style.display = 'flex';
      } else {
        logoB.innerHTML = '';
        logoB.style.display = 'none';
      }
      
      // Партия
      document.getElementById('setInfo').textContent = 
        \`Партия #\${matchData.currentSet.setNumber}\`;
      
      // Подача
      const servingTeam = matchData.currentSet.servingTeam === 'A' 
        ? matchData.teamA.name 
        : matchData.teamB.name;
      document.getElementById('servingTeam').textContent = servingTeam;
      
      // Обновляем состояние кнопок управления подачей
      const serveLeftBtn = document.getElementById('serveLeftBtn');
      const serveRightBtn = document.getElementById('serveRightBtn');
      const isLeftDisabled = matchData.currentSet.servingTeam === 'A';
      const isRightDisabled = matchData.currentSet.servingTeam === 'B';
      
      if (serveLeftBtn) {
        serveLeftBtn.disabled = isLeftDisabled;
        serveLeftBtn.style.backgroundColor = isLeftDisabled ? '#bdc3c7' : '#3498db';
        serveLeftBtn.style.opacity = isLeftDisabled ? '0.5' : '1';
        serveLeftBtn.style.cursor = isLeftDisabled ? 'not-allowed' : 'pointer';
      }
      
      if (serveRightBtn) {
        serveRightBtn.disabled = isRightDisabled;
        serveRightBtn.style.backgroundColor = isRightDisabled ? '#bdc3c7' : '#3498db';
        serveRightBtn.style.opacity = isRightDisabled ? '0.5' : '1';
        serveRightBtn.style.cursor = isRightDisabled ? 'not-allowed' : 'pointer';
      }

      // Индикаторы сетбола и матчбола
      updateIndicators();

      // Список партий
      updateSetsList();

      // Кнопка завершения партии
      const canFinish = canFinishSet(matchData.currentSet.scoreA, matchData.currentSet.scoreB, matchData.currentSet.setNumber);
      document.getElementById('finishBtn').disabled = !canFinish;
    }

    function updateIndicators() {
      const indicatorA = document.getElementById('indicatorA');
      const indicatorB = document.getElementById('indicatorB');
      
      const scoreA = matchData.currentSet.scoreA;
      const scoreB = matchData.currentSet.scoreB;
      const setNumber = matchData.currentSet.setNumber;
      
      // Получаем информацию о сетболе/матчболе
      const setballInfo = getSetballInfo(scoreA, scoreB, setNumber);
      const matchballInfo = getMatchballInfo(setNumber, scoreA, scoreB);
      
      // Индикатор для команды A
      if ((matchballInfo.isMatchball && matchballInfo.team === 'A') || 
          (setballInfo.isSetball && setballInfo.team === 'A' && !matchballInfo.isMatchball)) {
        indicatorA.style.display = 'block';
        indicatorA.className = \`indicator-badge \${matchballInfo.isMatchball ? 'matchball' : 'setball'}\`;
        indicatorA.textContent = matchballInfo.isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ';
      } else {
        indicatorA.style.display = 'none';
      }
      
      // Индикатор для команды B
      if ((matchballInfo.isMatchball && matchballInfo.team === 'B') || 
          (setballInfo.isSetball && setballInfo.team === 'B' && !matchballInfo.isMatchball)) {
        indicatorB.style.display = 'block';
        indicatorB.className = \`indicator-badge \${matchballInfo.isMatchball ? 'matchball' : 'setball'}\`;
        indicatorB.textContent = matchballInfo.isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ';
      } else {
        indicatorB.style.display = 'none';
      }
    }

    function getSetballInfo(scoreA, scoreB, setNumber) {
      // Порог для сетбола: 24 в обычных сетах, 14 в 5-м сете
      const setballThreshold = setNumber === 5 ? 14 : 24;
      
      const maxScore = Math.max(scoreA, scoreB);
      const minScore = Math.min(scoreA, scoreB);
      
      // Сетбол: команда на сетболе, если она набрала пороговое значение или больше
      // и ведет минимум на 1 очко
      // НО НЕ когда счет равный (24:24 или 14:14) - там сетбола нет
      if (maxScore >= setballThreshold && (maxScore - minScore) >= 1) {
        // Если счет равный (24:24, 25:25, 14:14 и т.д.) - сетбола нет
        if (scoreA === scoreB) {
          return {
            isSetball: false,
            team: null
          };
        }
        
        // Команда на сетболе, если она ведет
        return {
          isSetball: true,
          team: scoreA > scoreB ? 'A' : 'B'
        };
      }
      
      return {
        isSetball: false,
        team: null
      };
    }

    function getMatchballInfo(setNumber, scoreA, scoreB) {
      const winsA = matchData.sets.filter(s => s.completed && s.scoreA > s.scoreB).length;
      const winsB = matchData.sets.filter(s => s.completed && s.scoreB > s.scoreA).length;
      
      // Матчбол возможен, если одна из команд уже выиграла 2 сета
      // и находится на сетболе в текущем сете
      if (winsA === 2 || winsB === 2) {
        const setballInfo = getSetballInfo(scoreA, scoreB, setNumber);
        if (setballInfo.isSetball) {
          // Проверяем, какая команда на сетболе и ведет ли она по сетам
          if (setballInfo.team === 'A' && winsA === 2) {
            return {
              isMatchball: true,
              team: 'A'
            };
          }
          if (setballInfo.team === 'B' && winsB === 2) {
            return {
              isMatchball: true,
              team: 'B'
            };
          }
        }
      }
      
      return {
        isMatchball: false,
        team: null
      };
    }

    function canFinishSet(scoreA, scoreB, setNumber) {
      const maxScore = Math.max(scoreA, scoreB);
      const minScore = Math.min(scoreA, scoreB);
      
      // Пороги для завершения сета: 25 в обычных сетах, 15 в 5-м сете
      const finishThreshold = setNumber === 5 ? 15 : 25;
      const tieThreshold = setNumber === 5 ? 14 : 24;
      
      // Если одна команда набрала пороговое значение и разница минимум 2
      if (maxScore >= finishThreshold && (maxScore - minScore) >= 2) {
        return true;
      }
      
      // Если счет достиг порога тай-брейка (24:24 или 14:14), игра продолжается до разницы в 2
      if (maxScore >= tieThreshold && minScore >= tieThreshold) {
        if ((maxScore - minScore) >= 2) {
          return true;
        }
      }
      
      return false;
    }

    function updateSetsList() {
      const setsList = document.getElementById('setsList');
      setsList.innerHTML = '';
      
      const currentSetNum = matchData.currentSet.setNumber;
      
      for (let i = 1; i <= 5; i++) {
        const set = matchData.sets.find(s => s.setNumber === i);
        const setItem = document.createElement('div');
        setItem.className = 'set-item';
        
        if (set && set.completed) {
          setItem.textContent = \`Партия \${i}: \${set.scoreA} - \${set.scoreB}\`;
        } else if (i === currentSetNum) {
          setItem.className = 'set-item current';
          setItem.textContent = \`Партия \${i}: Текущая (\${matchData.currentSet.scoreA} - \${matchData.currentSet.scoreB})\`;
        } else {
          setItem.textContent = \`Партия \${i}: -\`;
          setItem.style.color = '#bdc3c7';
        }
        
        setsList.appendChild(setItem);
      }
    }

    let lastLocalUpdate = null; // Время последнего локального обновления (отправка на сервер)
    let lastServerUpdate = null; // Время последнего обновления с сервера (получение данных)

    function updateStatus(type, message, isLocalUpdate = false) {
      const statusEl = document.getElementById('status');
      statusEl.className = \`status \${type}\`;
      
      if (type === 'connected') {
        if (isLocalUpdate) {
          // Локальное обновление (отправка на сервер)
          lastLocalUpdate = Date.now();
          statusEl.textContent = 'Синхронизация...';
        } else {
          // Обновление с сервера (получение данных)
          lastServerUpdate = Date.now();
          const timeSinceUpdate = lastServerUpdate ? Math.floor((Date.now() - lastServerUpdate) / 1000) : 0;
          if (timeSinceUpdate < 2) {
            statusEl.textContent = 'Синхронизировано ✓';
          } else {
            statusEl.textContent = \`Обновлено \${timeSinceUpdate}с назад\`;
          }
        }
      } else {
        statusEl.textContent = message || 'Не подключено';
      }
    }

    async function changeScore(team, delta) {
      // Сохраняем состояние для отмены
      if (matchData) {
        actionHistory.push({
          type: 'score',
          team,
          delta,
          previousState: JSON.parse(JSON.stringify(matchData)),
        });
        document.getElementById('undoBtn').disabled = false;
      }

      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/score\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team, delta }),
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось изменить счет'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function changeServingTeam(team) {
      // Проверяем, что передана корректная команда
      if (team !== 'A' && team !== 'B') {
        console.error('changeServingTeam: некорректная команда', team);
        return;
      }
      
      // Если подача уже у этой команды, ничего не делаем
      if (matchData && matchData.currentSet.servingTeam === team) {
        return;
      }
      
      // Сохраняем состояние для отмены
      if (matchData) {
        actionHistory.push({
          type: 'serve',
          team,
          previousState: JSON.parse(JSON.stringify(matchData)),
        });
        document.getElementById('undoBtn').disabled = false;
      }

      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/serve\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team }),
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось изменить подачу'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function finishSet() {
      const setNumber = matchData.currentSet.setNumber;
      if (!canFinishSet(matchData.currentSet.scoreA, matchData.currentSet.scoreB, setNumber)) {
        const threshold = setNumber === 5 ? 15 : 25;
        alert(\`Партия не может быть завершена. Необходимо набрать \${threshold} очков с разницей минимум 2 очка.\`);
        return;
      }
      
      if (!confirm('Завершить текущую партию?')) return;
      
      updateStatus('syncing', 'Синхронизация...', true); // Локальное обновление
      
      try {
        const response = await fetch(\`/api/match/\${sessionId}/set\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (response.ok) {
          const result = await response.json();
          matchData = result.match;
          updateUI();
          updateStatus('connected', null, false); // Обновление с сервера
          actionHistory = []; // Очищаем историю после завершения партии
          document.getElementById('undoBtn').disabled = true;
        } else {
          const error = await response.json();
          alert('Ошибка: ' + (error.error || 'Не удалось завершить партию'));
          updateStatus('disconnected', 'Ошибка');
        }
      } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка подключения');
        updateStatus('disconnected', 'Ошибка');
      }
    }

    async function undoAction() {
      if (actionHistory.length === 0) return;
      
      const lastAction = actionHistory.pop();
      
      // Восстанавливаем предыдущее состояние
      // Для упрощения просто перезагружаем данные
      // В реальном приложении можно добавить API endpoint для отмены
      await loadMatch();
      
      if (actionHistory.length === 0) {
        document.getElementById('undoBtn').disabled = true;
      }
    }

    // Загружаем данные при загрузке страницы
    loadMatch();
    
    // Обновляем данные каждые 2 секунды
    updateInterval = setInterval(loadMatch, 2000);
    
    // Обновляем статус каждую секунду
    setInterval(() => {
      if (matchData) {
        updateStatus('connected', null, false); // Обновление с сервера
      }
    }, 1000);

    // Очистка при закрытии
    window.addEventListener('beforeunload', () => {
      if (updateInterval) clearInterval(updateInterval);
    });

    // Предотвращаем случайное закрытие при свайпе
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });
    document.addEventListener('touchmove', (e) => {
      if (window.scrollY === 0 && e.touches[0].clientY > touchStartY) {
        e.preventDefault();
      }
    }, { passive: false });
  </script>
</body>
</html>
    `;
  }

  /**
   * Валидация сессии
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Проверяем, не истекла ли сессия (24 часа)
    const now = Date.now();
    if (now - session.createdAt > 24 * 60 * 60 * 1000) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Генерирует новую сессию
   */
  async generateSession() {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    this.savedSessionId = sessionId;
    
    // Сохраняем sessionId в настройки
    try {
      const mobileSettings = await settingsManager.getMobileSettings();
      await settingsManager.setMobileSettings({
        ...mobileSettings,
        sessionId: sessionId,
      });
    } catch (error) {
      console.error('Ошибка при сохранении sessionId:', error);
    }
    
    return sessionId;
  }

  /**
   * Загружает сохраненную сессию из настроек
   */
  async loadSavedSession() {
    try {
      const mobileSettings = await settingsManager.getMobileSettings();
      if (mobileSettings.sessionId) {
        // Восстанавливаем сессию
        const session = {
          id: mobileSettings.sessionId,
          createdAt: Date.now(), // Обновляем время создания
        };
        this.sessions.set(mobileSettings.sessionId, session);
        this.savedSessionId = mobileSettings.sessionId;
        return mobileSettings.sessionId;
      }
    } catch (error) {
      console.error('Ошибка при загрузке сохраненной сессии:', error);
    }
    return null;
  }

  /**
   * Удаляет сессию
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Устанавливает текущий матч
   */
  setMatch(match) {
    this.currentMatch = match;
  }

  /**
   * Устанавливает callback для уведомления об изменениях матча
   */
  setMatchUpdateCallback(callback) {
    this.onMatchUpdate = callback;
  }

  /**
   * Получает локальный IP адрес
   * Приоритет отдается локальной сети (LAN), игнорируются VPN интерфейсы
   */
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    // Список известных VPN интерфейсов (по имени)
    const vpnInterfacePatterns = [
      /^tun\d*$/i,      // TUN/TAP
      /^tap\d*$/i,      // TAP
      /^vpn/i,          // VPN (общие)
      /^hamachi/i,      // LogMeIn Hamachi
      /^nordlynx/i,     // NordVPN
      /^wg\d*$/i,       // WireGuard
      /^utun\d*$/i,     // macOS VPN
      /^ppp\d*$/i,      // PPP (часто VPN)
      /^ipsec/i,        // IPSec VPN
      /^openvpn/i,      // OpenVPN
      /^proton/i,       // ProtonVPN
    ];
    
    // Функция проверки, является ли интерфейс VPN
    const isVpnInterface = (name) => {
      return vpnInterfacePatterns.some(pattern => pattern.test(name));
    };
    
    // Функция проверки, является ли IP частным (RFC 1918)
    const isPrivateIP = (ip) => {
      // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
      if (/^10\./.test(ip)) return true;
      // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
      if (/^192\.168\./.test(ip)) return true;
      return false;
    };
    
    // Функция проверки, является ли интерфейс беспроводным (Wi-Fi)
    const isWirelessInterface = (name) => {
      return /^(Wi-Fi|wlan|wifi|en0|en1)/i.test(name);
    };
    
    const candidates = [];
    
    // Собираем все подходящие интерфейсы
    for (const name of Object.keys(interfaces)) {
      // Пропускаем VPN интерфейсы
      if (isVpnInterface(name)) {
        continue;
      }
      
      for (const iface of interfaces[name]) {
        // Пропускаем внутренние и не-IPv4 адреса
        if (iface.family !== 'IPv4' || iface.internal) {
          continue;
        }
        
        const ip = iface.address;
        const isPrivate = isPrivateIP(ip);
        const isWireless = isWirelessInterface(name);
        
        // Приоритет 1: Частный IP + Wi-Fi интерфейс
        // Приоритет 2: Частный IP + любой интерфейс
        // Приоритет 3: Любой не-внутренний IP (fallback)
        
        if (isPrivate && isWireless) {
          candidates.unshift({ ip, name, priority: 1 }); // Высший приоритет
        } else if (isPrivate) {
          candidates.push({ ip, name, priority: 2 }); // Средний приоритет
        } else {
          candidates.push({ ip, name, priority: 3 }); // Низкий приоритет (fallback)
        }
      }
    }
    
    // Возвращаем первый кандидат (уже отсортирован по приоритету)
    if (candidates.length > 0) {
      return candidates[0].ip;
    }
    
    // Fallback: если ничего не найдено, возвращаем localhost
    return 'localhost';
  }

  /**
   * Запускает сервер
   */
  async start(port = 3000) {
    return new Promise(async (resolve, reject) => {
      this.port = port;
      
      this.server = this.app.listen(port, '0.0.0.0', async () => {
        console.log(`Mobile server started on port ${port}`);
        
        // Сохраняем состояние сервера в настройки
        try {
          const mobileSettings = await settingsManager.getMobileSettings();
          await settingsManager.setMobileSettings({
            ...mobileSettings,
            enabled: true,
            port: port,
          });
        } catch (error) {
          console.error('Ошибка при сохранении состояния сервера:', error);
        }
        
        // Загружаем сохраненную сессию, если она есть
        await this.loadSavedSession();
        
        resolve({
          port,
          ip: this.getLocalIP(),
          url: `http://${this.getLocalIP()}:${port}`,
          sessionId: this.savedSessionId,
        });
      });

      this.server.on('error', (error) => {
        const friendlyError = errorHandler.handleError(error, 'server:start');
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Порт ${port} уже занят. Выберите другой порт.`));
        } else {
          reject(new Error(friendlyError));
        }
      });
    });
  }

  /**
   * Останавливает сервер
   */
  async stop() {
    return new Promise(async (resolve) => {
      if (this.server) {
        this.server.close(async () => {
          console.log('Mobile server stopped');
          this.server = null;
          
          // Сохраняем состояние сервера в настройки
          try {
            const mobileSettings = await settingsManager.getMobileSettings();
            await settingsManager.setMobileSettings({
              ...mobileSettings,
              enabled: false,
            });
          } catch (error) {
            console.error('Ошибка при сохранении состояния сервера:', error);
          }
          
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Проверяет, запущен ли сервер
   */
  isRunning() {
    return this.server !== null;
  }

  /**
   * Получает информацию о сервере
   */
  getServerInfo() {
    if (!this.isRunning()) {
      return null;
    }

    const ip = this.getLocalIP();
    const port = this.port;
    const url = `http://${ip}:${port}`;
    
    console.log('[MobileServer.getServerInfo]', {
      ip,
      port,
      url,
      running: true,
      sessionsCount: this.sessions.size,
    });

    return {
      running: true,
      port,
      ip,
      url,
      sessionsCount: this.sessions.size,
    };
  }
}

// Создаем singleton экземпляр
let serverInstance = null;

function getMobileServer() {
  if (!serverInstance) {
    serverInstance = new MobileServer();
  }
  return serverInstance;
}

module.exports = {
  MobileServer,
  getMobileServer,
};

