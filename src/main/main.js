const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const fileManager = require('./fileManager');
const { getVMixClient } = require('./vmix-client');
const vmixConfig = require('./vmix-config');
const { getMobileServer } = require('./server');
const settingsManager = require('./settingsManager');

let mainWindow;
let currentMatch = null;
let hasUnsavedChanges = false;
let isLoadingVite = false; // Флаг для предотвращения одновременных попыток загрузки

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const iconExists = fs.existsSync(iconPath);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    ...(iconExists && { icon: iconPath }),
  });

  if (isDev) {
    // Функция для проверки доступности порта с проверкой, что это Vite
    const checkPort = (port, callback) => {
      const http = require('http');
      const req = http.get(`http://localhost:${port}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          // Vite должен возвращать статус 200 или 304
          if (res.statusCode === 200 || res.statusCode === 304) {
            callback(true, port);
          } else {
            callback(false, port);
          }
        });
      });
      req.on('error', () => {
        callback(false, port);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        callback(false, port);
      });
    };

    // Пробуем найти работающий Vite dev server
    // Сначала проверяем файл с портом (созданный скриптом wait-for-vite.js)
    let savedPort = null;
    try {
      const portFile = path.join(__dirname, '..', '.vite-port');
      if (fs.existsSync(portFile)) {
        savedPort = parseInt(fs.readFileSync(portFile, 'utf8').trim());
      }
    } catch (e) {
      // Игнорируем ошибки чтения файла
    }
    const tryPorts = savedPort ? [savedPort, 5173, 5174, 5175, 5176] : [5173, 5174, 5175, 5176];
    let portIndex = 0;
    let maxAttempts = 20; // Увеличиваем количество попыток
    let attempts = 0;
    
    const findVitePort = () => {
      if (isLoadingVite) {
        return; // Уже идет загрузка
      }
      
      if (attempts >= maxAttempts) {
        console.error('Не удалось найти работающий Vite dev server после всех попыток');
        return;
      }
      
      if (portIndex >= tryPorts.length) {
        portIndex = 0; // Начинаем заново
        attempts++;
      }
      
      const port = tryPorts[portIndex];
      checkPort(port, (available, checkedPort) => {
        if (available) {
          isLoadingVite = true; // Устанавливаем флаг
          // Vite автоматически обслуживает index.html из корня
          const devUrl = `http://localhost:${checkedPort}/`;
          console.log(`✓ Подключение к Vite dev server на порту ${checkedPort}`);
          console.log(`URL: ${devUrl}`);
          
          // Обработчик успешной загрузки
          const onLoadSuccess = () => {
            console.log(`✓ Страница успешно загружена с порта ${checkedPort}`);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener('did-fail-load', onLoadFail);
            // Открываем DevTools для отладки
            mainWindow.webContents.openDevTools();
            // Также логируем текущий URL для проверки
            console.log(`Текущий URL: ${mainWindow.webContents.getURL()}`);
          };
          
          // Обработчик ошибки загрузки
          const onLoadFail = (event, errorCode, errorDescription) => {
            console.error(`✗ Ошибка загрузки с порта ${checkedPort}: ${errorCode} - ${errorDescription}`);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener('did-finish-load', onLoadSuccess);
            portIndex++;
            setTimeout(findVitePort, 500);
          };
          
          mainWindow.webContents.once('did-finish-load', onLoadSuccess);
          mainWindow.webContents.once('did-fail-load', onLoadFail);
          
          mainWindow.loadURL(devUrl).catch((err) => {
            console.error('Ошибка при вызове loadURL:', err);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener('did-finish-load', onLoadSuccess);
            mainWindow.webContents.removeListener('did-fail-load', onLoadFail);
            portIndex++;
            setTimeout(findVitePort, 500);
          });
        } else {
          portIndex++;
          // Повторяем попытку через 500ms
          setTimeout(findVitePort, 500);
        }
      });
    };
    
    // Начинаем поиск порта с небольшой задержкой, чтобы дать Vite время запуститься
    setTimeout(() => {
      findVitePort();
    }, 1000);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Логируем ошибки консоли для отладки
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // 0=debug, 1=log, 2=info, 3=warning, 4=error
      console.log(`[Renderer ${level}] ${message}`);
    }
  });

  // Логируем ошибки загрузки страницы
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load: ${validatedURL}`);
    console.error(`Error: ${errorCode} - ${errorDescription}`);
  });
}

app.whenReady().then(async () => {
  createWindow();
  createMenu();

  // Восстанавливаем состояние мобильного сервера при запуске
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    if (mobileSettings.enabled) {
      const mobileServer = getMobileServer();
      try {
        const result = await mobileServer.start(mobileSettings.port || 3000);
        console.log('Мобильный сервер автоматически запущен при старте приложения');
        // Загружаем сохраненную сессию, если она есть
        if (mobileSettings.sessionId) {
          await mobileServer.loadSavedSession();
        }
      } catch (error) {
        console.error('Не удалось автоматически запустить мобильный сервер:', error);
        // Если не удалось запустить, отключаем в настройках
        await settingsManager.setMobileSettings({
          ...mobileSettings,
          enabled: false,
        });
      }
    }
  } catch (error) {
    console.error('Ошибка при восстановлении состояния мобильного сервера:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка закрытия окна с проверкой несохраненных изменений
app.on('before-quit', async (event) => {
  if (hasUnsavedChanges && mainWindow) {
    event.preventDefault();
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Сохранить', 'Не сохранять', 'Отмена'],
      defaultId: 0,
      title: 'Несохраненные изменения',
      message: 'У вас есть несохраненные изменения. Сохранить перед выходом?',
    });

    if (choice.response === 0) {
      // Сохранить
      if (currentMatch && mainWindow) {
        mainWindow.webContents.send('save-match-before-quit');
        // Ждем сохранения
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      hasUnsavedChanges = false;
      app.quit();
    } else if (choice.response === 1) {
      // Не сохранять
      hasUnsavedChanges = false;
      app.quit();
    }
    // Если отмена - ничего не делаем, приложение продолжит работу
  }
});

/**
 * Создает главное меню приложения
 */
function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Создать новый матч',
          accelerator: 'CmdOrCtrl+N',
          click: async () => {
            if (mainWindow) {
              const match = await fileManager.createMatch();
              currentMatch = match;
              hasUnsavedChanges = true;
              mainWindow.webContents.send('load-match', match);
            }
          },
        },
        {
          label: 'Открыть матч...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              try {
                const filePath = await fileManager.openMatchDialog();
                if (filePath) {
                  const match = await fileManager.openMatch(filePath);
                  currentMatch = match;
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send('load-match', match);
                }
              } catch (error) {
                dialog.showErrorBox('Ошибка', 'Не удалось открыть матч: ' + error.message);
              }
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Сохранить матч',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                await fileManager.saveMatch(currentMatch);
                hasUnsavedChanges = false;
                mainWindow.webContents.send('match-saved');
              } catch (error) {
                dialog.showErrorBox('Ошибка', 'Не удалось сохранить матч: ' + error.message);
              }
            }
          },
        },
        {
          label: 'Сохранить матч как...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                await fileManager.saveMatchDialog(currentMatch);
                hasUnsavedChanges = false;
                mainWindow.webContents.send('match-saved');
              } catch (error) {
                dialog.showErrorBox('Ошибка', 'Не удалось сохранить матч: ' + error.message);
              }
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        {
          label: 'Настройки матча',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/match/settings');
            }
          },
        },
        {
          label: 'Настройки vMix',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/vmix/settings');
            }
          },
        },
        {
          label: 'Мобильный доступ',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/mobile/access');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Обновить данные в vMix',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('refresh-vmix');
            }
          },
        },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navigate', '/about');
            }
          },
        },
      ],
    },
  ];

  // На macOS первый пункт меню - название приложения
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'О программе' },
        { type: 'separator' },
        { role: 'services', label: 'Сервисы' },
        { type: 'separator' },
        { role: 'hide', label: 'Скрыть' },
        { role: 'hideOthers', label: 'Скрыть остальные' },
        { role: 'unhide', label: 'Показать все' },
        { type: 'separator' },
        { role: 'quit', label: 'Выход' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

// File management handlers
ipcMain.handle('match:create', async () => {
  try {
    return await fileManager.createMatch();
  } catch (error) {
    console.error('Error creating match:', error);
    const errorHandler = require('../shared/errorHandler');
    const friendlyError = errorHandler.handleError(error, 'match:create');
    throw new Error(friendlyError);
  }
});

ipcMain.handle('match:open-dialog', async () => {
  try {
    const filePath = await fileManager.openMatchDialog();
    if (!filePath) {
      return null;
    }
    return await fileManager.openMatch(filePath);
  } catch (error) {
    console.error('Error opening match:', error);
    const friendlyError = errorHandler.handleError(error, 'match:open-dialog');
    throw new Error(friendlyError);
  }
});

ipcMain.handle('match:save', async (event, match) => {
  try {
    const filePath = await fileManager.saveMatch(match);
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving match:', error);
    const friendlyError = errorHandler.handleError(error, 'match:save');
    throw new Error(friendlyError);
  }
});

ipcMain.handle('match:save-dialog', async (event, match) => {
  try {
    const filePath = await fileManager.saveMatchDialog(match);
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error('Error saving match:', error);
    const friendlyError = errorHandler.handleError(error, 'match:save-dialog');
    throw new Error(friendlyError);
  }
});

// Отслеживание изменений матча
ipcMain.handle('match:set-current', (event, match) => {
  currentMatch = match;
  hasUnsavedChanges = true;
  return { success: true };
});

ipcMain.handle('match:mark-saved', () => {
  hasUnsavedChanges = false;
  return { success: true };
});

// vMix handlers
ipcMain.handle('vmix:get-config', async () => {
  return await vmixConfig.getVMixConfig();
});

ipcMain.handle('vmix:set-config', async (event, config) => {
  await vmixConfig.setVMixConfig(config);
  // Обновляем клиент с новыми настройками
  const client = getVMixClient(config.host, config.port);
  return { success: true };
});

ipcMain.handle('vmix:test-connection', async (event, host, port) => {
  try {
    const client = getVMixClient(host || vmixConfig.getVMixSetting('host'), 
                                  port || vmixConfig.getVMixSetting('port'));
    const result = await client.testConnection();
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'vmix:test-connection');
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle('vmix:update-input', async (event, inputName, data) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    const result = await client.updateInput(inputName, data);
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'vmix:update-input');
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle('vmix:show-overlay', async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const inputConfig = config.inputs[inputKey];
    if (!inputConfig || !inputConfig.name) {
      return { success: false, error: 'Инпут не настроен' };
    }
    const client = getVMixClient(config.host, config.port);
    const result = await client.showOverlay(inputConfig.overlay, inputConfig.name);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vmix:hide-overlay', async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const inputConfig = config.inputs[inputKey];
    if (!inputConfig || !inputConfig.overlay) {
      return { success: false, error: 'Оверлей не настроен' };
    }
    const client = getVMixClient(config.host, config.port);
    const result = await client.hideOverlay(inputConfig.overlay);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('vmix:get-overlay-state', async () => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    const result = await client.getOverlayState();
    return result;
  } catch (error) {
    return { success: false, error: error.message, overlays: null };
  }
});

// Mobile server handlers
const mobileServer = getMobileServer();

// Устанавливаем callback для синхронизации изменений матча из мобильного приложения
mobileServer.setMatchUpdateCallback((updatedMatch) => {
  // Обновляем текущий матч в main процессе
  currentMatch = updatedMatch;
  hasUnsavedChanges = true;
  
  // Отправляем обновленный матч в renderer процесс
  if (mainWindow) {
    mainWindow.webContents.send('load-match', updatedMatch);
  }
});

ipcMain.handle('mobile:start-server', async (event, port) => {
  try {
    const result = await mobileServer.start(port || 3000);
    return { success: true, ...result };
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, 'mobile:start-server');
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle('mobile:stop-server', async () => {
  try {
    await mobileServer.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mobile:get-server-info', () => {
  const info = mobileServer.getServerInfo();
  return info || { running: false };
});

ipcMain.handle('mobile:generate-session', async () => {
  const sessionId = await mobileServer.generateSession();
  const info = mobileServer.getServerInfo();
  return {
    sessionId,
    url: info ? `${info.url}/panel/${sessionId}` : null,
  };
});

ipcMain.handle('mobile:get-saved-session', async () => {
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    const info = mobileServer.getServerInfo();
    if (mobileSettings.sessionId && info) {
      return {
        sessionId: mobileSettings.sessionId,
        url: `${info.url}/panel/${mobileSettings.sessionId}`,
      };
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении сохраненной сессии:', error);
    return null;
  }
});

ipcMain.handle('mobile:set-match', (event, match) => {
  mobileServer.setMatch(match);
  return { success: true };
});

ipcMain.handle('mobile:is-running', () => {
  return mobileServer.isRunning();
});

