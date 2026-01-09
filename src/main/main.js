const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  globalShortcut,
} = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const fileManager = require("./fileManager");
const { getVMixClient } = require("./vmix-client");
const vmixConfig = require("./vmix-config");
const { getMobileServer } = require("./server");
const settingsManager = require("./settingsManager");
const logoManager = require("./logoManager");
const errorHandler = require("../shared/errorHandler");

let mainWindow;
let currentMatch = null;
let currentMatchFilePath = null; // Путь к файлу текущего матча
let hasUnsavedChanges = false;
let isLoadingVite = false; // Флаг для предотвращения одновременных попыток загрузки
let autoSaveTimeout = null; // Таймер для отложенного автосохранения

/**
 * Планирует автосохранение матча с задержкой (debounce)
 */
async function scheduleAutoSave(match) {
  // Очищаем предыдущий таймер
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  // Проверяем, включено ли автосохранение
  const autoSaveSettings = await settingsManager.getAutoSaveSettings();
  if (!autoSaveSettings.enabled) {
    return;
  }

  // Если файл не был сохранен, не делаем автосохранение
  if (!currentMatchFilePath) {
    return;
  }

  // Устанавливаем таймер на 2 секунды (debounce)
  autoSaveTimeout = setTimeout(async () => {
    try {
      await fileManager.saveMatch(match, currentMatchFilePath);
      hasUnsavedChanges = false;
      console.log(
        "[AutoSave] Матч автоматически сохранен в",
        currentMatchFilePath
      );
    } catch (error) {
      console.error("[AutoSave] Ошибка при автосохранении:", error);
      // Не показываем ошибку пользователю, только логируем
    }
    autoSaveTimeout = null;
  }, 2000);
}

function createWindow() {
  // В production используем правильные пути для ASAR
  let iconPath;
  if (isDev) {
    iconPath = path.join(__dirname, "../assets/icon.png");
  } else {
    // В production иконка должна быть в ASAR или использовать ресурсы
    const appPath = app.getAppPath();
    iconPath = path.join(appPath, "../assets/icon.png");
    // Если иконка не найдена, пробуем альтернативный путь
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(__dirname, "../assets/icon.png");
    }
  }
  const iconExists = fs.existsSync(iconPath);

  // Путь к preload.js - в production он в ASAR
  let preloadPath;
  if (isDev) {
    preloadPath = path.join(__dirname, "preload.js");
  } else {
    // В production preload.js находится в ASAR по тому же пути относительно appPath
    const appPath = app.getAppPath();
    preloadPath = path.join(appPath, "src/main/preload.js");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      // Для корректной загрузки ES модулей в production
      webSecurity: true,
      sandbox: false,
    },
    ...(iconExists && { icon: iconPath }),
    // Показываем окно только после загрузки
    show: false,
  });

  // Показываем окно после загрузки страницы
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  if (isDev) {
    // Функция для проверки доступности порта с проверкой, что это Vite
    const checkPort = (port, callback) => {
      const http = require("http");
      const req = http.get(`http://localhost:${port}`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          // Vite должен возвращать статус 200 или 304
          if (res.statusCode === 200 || res.statusCode === 304) {
            callback(true, port);
          } else {
            callback(false, port);
          }
        });
      });
      req.on("error", () => {
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
      const portFile = path.join(__dirname, "..", ".vite-port");
      if (fs.existsSync(portFile)) {
        savedPort = parseInt(fs.readFileSync(portFile, "utf8").trim());
      }
    } catch (e) {
      // Игнорируем ошибки чтения файла
    }
    const tryPorts = savedPort
      ? [savedPort, 5173, 5174, 5175, 5176]
      : [5173, 5174, 5175, 5176];
    let portIndex = 0;
    let maxAttempts = 20; // Увеличиваем количество попыток
    let attempts = 0;

    const findVitePort = () => {
      if (isLoadingVite) {
        return; // Уже идет загрузка
      }

      if (attempts >= maxAttempts) {
        console.error(
          "Не удалось найти работающий Vite dev server после всех попыток"
        );
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
          console.log(
            `✓ Подключение к Vite dev server на порту ${checkedPort}`
          );
          console.log(`URL: ${devUrl}`);

          // Обработчик успешной загрузки
          const onLoadSuccess = () => {
            console.log(`✓ Страница успешно загружена с порта ${checkedPort}`);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener("did-fail-load", onLoadFail);
            // Открываем DevTools для отладки
            mainWindow.webContents.openDevTools();
            // Также логируем текущий URL для проверки
            console.log(`Текущий URL: ${mainWindow.webContents.getURL()}`);
          };

          // Обработчик ошибки загрузки
          const onLoadFail = (event, errorCode, errorDescription) => {
            console.error(
              `✗ Ошибка загрузки с порта ${checkedPort}: ${errorCode} - ${errorDescription}`
            );
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener(
              "did-finish-load",
              onLoadSuccess
            );
            portIndex++;
            setTimeout(findVitePort, 500);
          };

          mainWindow.webContents.once("did-finish-load", onLoadSuccess);
          mainWindow.webContents.once("did-fail-load", onLoadFail);

          mainWindow.loadURL(devUrl).catch((err) => {
            console.error("Ошибка при вызове loadURL:", err);
            isLoadingVite = false; // Сбрасываем флаг
            mainWindow.webContents.removeListener(
              "did-finish-load",
              onLoadSuccess
            );
            mainWindow.webContents.removeListener("did-fail-load", onLoadFail);
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
    // В production режиме используем app.getAppPath() для правильного пути
    // dist/index.html находится внутри ASAR архива
    const appPath = app.getAppPath();
    const distPath = path.join(appPath, "dist", "index.html");
    console.log("[Production] App path:", appPath);
    console.log("[Production] Loading file from:", distPath);
    console.log("[Production] File exists:", fs.existsSync(distPath));

    // Используем loadFile вместо loadURL для корректной работы с относительными путями
    // loadFile автоматически обрабатывает пути к assets внутри ASAR
    mainWindow.loadFile(distPath).catch((err) => {
      console.error("[Production] Failed to load index.html:", err);
      // Попробуем альтернативный способ через loadURL с file:// протоколом
      const fileUrl = `file://${distPath.replace(/\\/g, "/")}`;
      console.log("[Production] Trying alternative URL:", fileUrl);
      mainWindow.loadURL(fileUrl).catch((urlErr) => {
        console.error("[Production] Failed to load via URL:", urlErr);
      });
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Логируем события загрузки
  mainWindow.webContents.on("dom-ready", () => {
    console.log("[Production] DOM ready");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[Production] Page finished loading");
  });

  // Логируем ошибки загрузки страницы
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error(`[Failed to load] URL: ${validatedURL}`);
      console.error(`[Failed to load] Error code: ${errorCode}`);
      console.error(`[Failed to load] Error description: ${errorDescription}`);
      console.error(`[Failed to load] Is main frame: ${isMainFrame}`);
    }
  );

  // Логируем ошибки JavaScript в renderer процессе
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const levelNames = ["debug", "log", "info", "warning", "error"];
      const levelName = levelNames[level] || level;
      // В production логируем все сообщения для отладки
      if (!isDev || level >= 2) {
        console.log(
          `[Renderer ${levelName}] ${message}${
            sourceId ? ` (${sourceId}:${line})` : ""
          }`
        );
      }
    }
  );

  // Перехватываем ошибки JavaScript
  mainWindow.webContents
    .executeJavaScript(
      `
    window.addEventListener('error', (event) => {
      console.error('JavaScript Error:', event.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    });
  `
    )
    .catch((err) => {
      // Игнорируем ошибки выполнения этого скрипта
    });

  // Логируем ошибки в консоли renderer процесса
  mainWindow.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      const levelNames = ["debug", "log", "info", "warning", "error"];
      console.log(
        `[Renderer ${
          levelNames[level] || level
        }] ${message} (${sourceId}:${line})`
      );
    }
  );
}

app.whenReady().then(async () => {
  createWindow();
  await createMenu();

  // Регистрируем горячие клавиши для DevTools (работают в production)
  globalShortcut.register("F12", () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Альтернативная комбинация Ctrl+Shift+I
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // Очищаем папку logos от устаревших файлов при старте приложения
  try {
    await logoManager.cleanupLogosDirectory();
    console.log("[App] Папка logos очищена от устаревших файлов");
  } catch (error) {
    console.warn(
      "[App] Не удалось очистить папку logos при старте:",
      error.message
    );
  }

  // Восстанавливаем состояние мобильного сервера при запуске
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    if (mobileSettings.enabled) {
      const mobileServer = getMobileServer();
      try {
        const result = await mobileServer.start(mobileSettings.port || 3000);
        console.log(
          "Мобильный сервер автоматически запущен при старте приложения"
        );
        // Загружаем сохраненную сессию, если она есть
        if (mobileSettings.sessionId) {
          await mobileServer.loadSavedSession();
        }
      } catch (error) {
        console.error(
          "Не удалось автоматически запустить мобильный сервер:",
          error
        );
        // Если не удалось запустить, отключаем в настройках
        await settingsManager.setMobileSettings({
          ...mobileSettings,
          enabled: false,
        });
      }
    }
  } catch (error) {
    console.error(
      "Ошибка при восстановлении состояния мобильного сервера:",
      error
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Отменяем регистрацию всех глобальных горячих клавиш
  globalShortcut.unregisterAll();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Отменяем регистрацию горячих клавиш при выходе
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Обработка закрытия окна с проверкой несохраненных изменений
app.on("before-quit", async (event) => {
  if (hasUnsavedChanges && mainWindow) {
    event.preventDefault();
    const choice = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Сохранить", "Не сохранять", "Отмена"],
      defaultId: 0,
      title: "Несохраненные изменения",
      message: "У вас есть несохраненные изменения. Сохранить перед выходом?",
    });

    if (choice.response === 0) {
      // Сохранить
      if (currentMatch && mainWindow) {
        mainWindow.webContents.send("save-match-before-quit");
        // Ждем сохранения
        await new Promise((resolve) => setTimeout(resolve, 500));
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
async function createMenu() {
  // Загружаем настройки автосохранения для меню
  let autoSaveEnabled = true;
  try {
    const autoSaveSettings = await settingsManager.getAutoSaveSettings();
    autoSaveEnabled = autoSaveSettings.enabled;
  } catch (error) {
    console.error(
      "Ошибка при загрузке настроек автосохранения для меню:",
      error
    );
  }

  const template = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Создать новый матч",
          accelerator: "CmdOrCtrl+N",
          click: async () => {
            if (mainWindow) {
              const match = await fileManager.createMatch();
              currentMatch = match;
              currentMatchFilePath = null; // Сбрасываем путь при создании нового матча
              hasUnsavedChanges = true;
              mainWindow.webContents.send("load-match", match);
            }
          },
        },
        {
          label: "Открыть матч...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            if (mainWindow) {
              try {
                const filePath = await fileManager.openMatchDialog();
                if (filePath) {
                  const match = await fileManager.openMatch(filePath);
                  currentMatch = match;
                  currentMatchFilePath = filePath; // Запоминаем путь к файлу
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("load-match", match);
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось открыть матч: " + error.message
                );
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Автосохранение",
          type: "checkbox",
          checked: autoSaveEnabled,
          click: async (menuItem) => {
            try {
              await settingsManager.setAutoSaveSettings({
                enabled: menuItem.checked,
              });
              // Отправляем событие в renderer для обновления UI
              if (mainWindow) {
                mainWindow.webContents.send(
                  "autosave-settings-changed",
                  menuItem.checked
                );
              }
            } catch (error) {
              console.error("Ошибка при изменении автосохранения:", error);
            }
          },
        },
        {
          label: "Сохранить матч",
          accelerator: "CmdOrCtrl+S",
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                let filePath;
                // Если файл уже был сохранен, используем его путь
                if (currentMatchFilePath) {
                  filePath = await fileManager.saveMatch(
                    currentMatch,
                    currentMatchFilePath
                  );
                } else {
                  // Первое сохранение - показываем диалог
                  filePath = await fileManager.saveMatchDialog(currentMatch);
                  if (filePath) {
                    currentMatchFilePath = filePath;
                  }
                }
                if (filePath) {
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("match-saved");
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось сохранить матч: " + error.message
                );
              }
            }
          },
        },
        {
          label: "Сохранить матч как...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            if (mainWindow && currentMatch) {
              try {
                const filePath = await fileManager.saveMatchDialog(
                  currentMatch
                );
                if (filePath) {
                  currentMatchFilePath = filePath; // Обновляем путь к файлу
                  hasUnsavedChanges = false;
                  mainWindow.webContents.send("match-saved");
                }
              } catch (error) {
                dialog.showErrorBox(
                  "Ошибка",
                  "Не удалось сохранить матч: " + error.message
                );
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Выход",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Вид",
      submenu: [
        {
          label: "Настройки матча",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/match/settings");
            }
          },
        },
        {
          label: "Настройки vMix",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/vmix/settings");
            }
          },
        },
        {
          label: "Мобильный доступ",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/mobile/access");
            }
          },
        },
        { type: "separator" },
        {
          label: "Инструменты разработчика",
          accelerator: "F12",
          click: () => {
            if (mainWindow) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          },
        },
        { type: "separator" },
        {
          label: "Обновить данные в vMix",
          accelerator: "F5",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("refresh-vmix");
            }
          },
        },
      ],
    },
    {
      label: "Справка",
      submenu: [
        {
          label: "О программе",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("navigate", "/about");
            }
          },
        },
      ],
    },
  ];

  // На macOS первый пункт меню - название приложения
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about", label: "О программе" },
        { type: "separator" },
        { role: "services", label: "Сервисы" },
        { type: "separator" },
        { role: "hide", label: "Скрыть" },
        { role: "hideOthers", label: "Скрыть остальные" },
        { role: "unhide", label: "Показать все" },
        { type: "separator" },
        { role: "quit", label: "Выход" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle("app-version", () => {
  return app.getVersion();
});

// File management handlers
ipcMain.handle("match:create", async () => {
  try {
    return await fileManager.createMatch();
  } catch (error) {
    console.error("Error creating match:", error);
    const friendlyError = errorHandler.handleError(error, "match:create");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:open-dialog", async () => {
  try {
    const filePath = await fileManager.openMatchDialog();
    if (!filePath) {
      return null;
    }
    const match = await fileManager.openMatch(filePath);
    currentMatchFilePath = filePath; // Запоминаем путь к файлу
    currentMatch = match;
    hasUnsavedChanges = false;
    return match;
  } catch (error) {
    console.error("Error opening match:", error);
    const friendlyError = errorHandler.handleError(error, "match:open-dialog");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:save", async (event, match) => {
  try {
    let filePath;
    // Если файл уже был сохранен, используем его путь
    if (currentMatchFilePath) {
      filePath = await fileManager.saveMatch(match, currentMatchFilePath);
    } else {
      // Первое сохранение - показываем диалог
      filePath = await fileManager.saveMatchDialog(match);
      if (filePath) {
        currentMatchFilePath = filePath;
      } else {
        return { success: false, cancelled: true };
      }
    }
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error("Error saving match:", error);
    const friendlyError = errorHandler.handleError(error, "match:save");
    throw new Error(friendlyError);
  }
});

ipcMain.handle("match:save-dialog", async (event, match) => {
  try {
    const filePath = await fileManager.saveMatchDialog(match);
    if (!filePath) {
      return { success: false, cancelled: true };
    }
    currentMatchFilePath = filePath; // Обновляем путь к файлу
    currentMatch = match;
    hasUnsavedChanges = false;
    return { success: true, filePath };
  } catch (error) {
    console.error("Error saving match:", error);
    const friendlyError = errorHandler.handleError(error, "match:save-dialog");
    throw new Error(friendlyError);
  }
});

// Отслеживание изменений матча
ipcMain.handle("match:set-current", async (event, match) => {
  // Сохраняем логотипы в файлы при обновлении матча
  // Это необходимо для того, чтобы они были доступны по HTTP через мобильный сервер
  try {
    if (match && match.teamA) {
      await logoManager.processTeamLogoForSave(match.teamA, "A");
    }
    if (match && match.teamB) {
      await logoManager.processTeamLogoForSave(match.teamB, "B");
    }
  } catch (error) {
    console.error(
      "Ошибка при сохранении логотипов при обновлении матча:",
      error
    );
    // Не прерываем выполнение, если ошибка сохранения логотипов
  }

  currentMatch = match;
  hasUnsavedChanges = true;

  // Автосохранение при изменениях матча
  await scheduleAutoSave(match);

  return { success: true };
});

ipcMain.handle("match:mark-saved", () => {
  hasUnsavedChanges = false;
  return { success: true };
});

/**
 * Меняет команды местами в матче
 * Меняет местами teamA и teamB, счет, статистику и файлы логотипов
 */
ipcMain.handle("match:swap-teams", async (event, match) => {
  try {
    if (!match) {
      return { success: false, error: "Матч не указан" };
    }

    // Создаем копию матча для изменения
    const swappedMatch = JSON.parse(JSON.stringify(match));

    // 1. Сохраняем оригинальные логотипы ДО смены команд
    // Это критически важно - нужно сохранить логотипы до того, как команды поменяются местами
    const originalTeamALogo = match.teamA.logo || match.teamA.logoBase64;
    const originalTeamBLogo = match.teamB.logo || match.teamB.logoBase64;

    // 2. Меняем местами команды
    const tempTeam = swappedMatch.teamA;
    swappedMatch.teamA = swappedMatch.teamB;
    swappedMatch.teamB = tempTeam;

    // 3. Меняем местами счет в текущей партии
    const tempScore = swappedMatch.currentSet.scoreA;
    swappedMatch.currentSet.scoreA = swappedMatch.currentSet.scoreB;
    swappedMatch.currentSet.scoreB = tempScore;

    // 4. Инвертируем подачу (A -> B, B -> A)
    swappedMatch.currentSet.servingTeam =
      swappedMatch.currentSet.servingTeam === "A" ? "B" : "A";

    // 5. Меняем местами счет в завершенных партиях
    if (swappedMatch.sets && Array.isArray(swappedMatch.sets)) {
      swappedMatch.sets = swappedMatch.sets.map((set) => {
        const tempSetScore = set.scoreA;
        set.scoreA = set.scoreB;
        set.scoreB = tempSetScore;
        return set;
      });
    }

    // 6. Меняем местами статистику
    if (swappedMatch.statistics) {
      const tempStats = swappedMatch.statistics.teamA;
      swappedMatch.statistics.teamA = swappedMatch.statistics.teamB;
      swappedMatch.statistics.teamB = tempStats;
    }

    // 7. Сохраняем логотипы в правильные файлы
    // После смены команд местами:
    // - swappedMatch.teamA теперь содержит данные бывшей команды B
    // - swappedMatch.teamB теперь содержит данные бывшей команды A
    // Поэтому сохраняем оригинальный логотип команды B в logo_a.png
    // и оригинальный логотип команды A в logo_b.png
    try {
      // Сохраняем оригинальный логотип команды B в logo_a.png (для новой команды A)
      if (originalTeamBLogo) {
        const processedTeamA = await logoManager.processTeamLogoForSave(
          { logo: originalTeamBLogo },
          "A"
        );
        // Обновляем логотипы в swappedMatch.teamA
        swappedMatch.teamA.logo =
          processedTeamA.logo || processedTeamA.logoBase64;
        swappedMatch.teamA.logoBase64 = processedTeamA.logoBase64;
        swappedMatch.teamA.logoPath = processedTeamA.logoPath;
      }

      // Сохраняем оригинальный логотип команды A в logo_b.png (для новой команды B)
      if (originalTeamALogo) {
        const processedTeamB = await logoManager.processTeamLogoForSave(
          { logo: originalTeamALogo },
          "B"
        );
        // Обновляем логотипы в swappedMatch.teamB
        swappedMatch.teamB.logo =
          processedTeamB.logo || processedTeamB.logoBase64;
        swappedMatch.teamB.logoBase64 = processedTeamB.logoBase64;
        swappedMatch.teamB.logoPath = processedTeamB.logoPath;
      }

      // Очищаем папку logos от устаревших файлов после смены команд
      await logoManager.cleanupLogosDirectory();
    } catch (error) {
      console.error(
        "Ошибка при сохранении логотипов после смены команд:",
        error
      );
      // Не прерываем выполнение
    }

    // 8. Обновляем updatedAt
    swappedMatch.updatedAt = new Date().toISOString();

    // 10. Обновляем текущий матч
    currentMatch = swappedMatch;
    hasUnsavedChanges = true;

    return { success: true, match: swappedMatch };
  } catch (error) {
    console.error("Ошибка при смене команд местами:", error);
    return { success: false, error: error.message };
  }
});

// vMix handlers
ipcMain.handle("vmix:get-config", async () => {
  return await vmixConfig.getVMixConfig();
});

ipcMain.handle("vmix:set-config", async (event, config) => {
  await vmixConfig.setVMixConfig(config);
  // Обновляем клиент с новыми настройками
  const client = getVMixClient(config.host, config.port);
  return { success: true };
});

ipcMain.handle("vmix:test-connection", async (event, host, port) => {
  try {
    const client = getVMixClient(
      host || vmixConfig.getVMixSetting("host"),
      port || vmixConfig.getVMixSetting("port")
    );
    const result = await client.testConnection();
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(
      error,
      "vmix:test-connection"
    );
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle("vmix:update-input", async (event, inputName, data) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const client = getVMixClient(config.host, config.port);
    const result = await client.updateInput(inputName, data);
    return result;
  } catch (error) {
    const friendlyError = errorHandler.handleError(error, "vmix:update-input");
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle(
  "vmix:update-input-fields",
  async (
    event,
    inputName,
    fields,
    colorFields,
    visibilityFields,
    imageFields
  ) => {
    try {
      const config = await vmixConfig.getVMixConfig();
      const client = getVMixClient(config.host, config.port);
      const results = await client.updateInputFields(
        inputName,
        fields || {},
        colorFields || {},
        visibilityFields || {},
        imageFields || {}
      );
      // Проверяем, есть ли ошибки
      const hasErrors = results.some((r) => !r.success);
      if (hasErrors) {
        const errors = results.filter((r) => !r.success).map((r) => r.error);
        return { success: false, error: errors.join("; ") };
      }
      return { success: true };
    } catch (error) {
      const friendlyError = errorHandler.handleError(
        error,
        "vmix:update-input-fields"
      );
      return { success: false, error: friendlyError };
    }
  }
);

ipcMain.handle("vmix:show-overlay", async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const inputConfig = config.inputs[inputKey];
    if (!inputConfig) {
      return { success: false, error: "Инпут не настроен" };
    }

    // Поддержка старого и нового формата
    const inputIdentifier =
      typeof inputConfig === "string"
        ? inputConfig
        : inputConfig.inputIdentifier || inputConfig.name;
    const overlay =
      typeof inputConfig === "object" && inputConfig.overlay
        ? inputConfig.overlay
        : config.overlay || 1;

    if (!inputIdentifier) {
      return { success: false, error: "Инпут не настроен" };
    }

    const client = getVMixClient(config.host, config.port);
    const result = await client.showOverlay(overlay, inputIdentifier);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("vmix:hide-overlay", async (event, inputKey) => {
  try {
    const config = await vmixConfig.getVMixConfig();
    const inputConfig = config.inputs[inputKey];
    if (!inputConfig) {
      return { success: false, error: "Инпут не настроен" };
    }

    // Поддержка старого и нового формата
    const overlay =
      typeof inputConfig === "object" && inputConfig.overlay
        ? inputConfig.overlay
        : config.overlay || 1;

    const client = getVMixClient(config.host, config.port);
    const result = await client.hideOverlay(overlay);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("vmix:get-overlay-state", async () => {
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
    mainWindow.webContents.send("load-match", updatedMatch);
  }
});

ipcMain.handle("mobile:start-server", async (event, port) => {
  try {
    const result = await mobileServer.start(port || 3000);
    return { success: true, ...result };
  } catch (error) {
    const friendlyError = errorHandler.handleError(
      error,
      "mobile:start-server"
    );
    return { success: false, error: friendlyError };
  }
});

ipcMain.handle("mobile:stop-server", async () => {
  try {
    await mobileServer.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("mobile:get-server-info", async () => {
  const info = mobileServer.getServerInfo();
  if (info) {
    console.log("[IPC mobile:get-server-info] Сервер запущен:", info);
    return info;
  }

  // Если сервер не запущен, пытаемся получить информацию из настроек
  // чтобы использовать последние известные IP и порт
  try {
    const mobileSettings = await settingsManager.getMobileSettings();
    if (mobileSettings && mobileSettings.port) {
      // IP определяется динамически через getLocalIP, но можем вернуть порт из настроек
      const fallbackInfo = {
        running: false,
        port: mobileSettings.port,
        // IP будет определен при запуске, но можем попробовать получить через MobileServer
        ip: mobileServer.getLocalIP ? mobileServer.getLocalIP() : null,
      };
      if (fallbackInfo.ip) {
        fallbackInfo.url = `http://${fallbackInfo.ip}:${fallbackInfo.port}`;
      }
      console.log(
        "[IPC mobile:get-server-info] Сервер не запущен, используем настройки:",
        fallbackInfo
      );
      return fallbackInfo;
    }
  } catch (error) {
    console.error(
      "[IPC mobile:get-server-info] Ошибка при получении настроек:",
      error
    );
  }

  console.log("[IPC mobile:get-server-info] Информация недоступна");
  return { running: false };
});

ipcMain.handle("mobile:generate-session", async () => {
  const sessionId = await mobileServer.generateSession();
  const info = mobileServer.getServerInfo();
  return {
    sessionId,
    url: info ? `${info.url}/panel/${sessionId}` : null,
  };
});

ipcMain.handle("mobile:get-saved-session", async () => {
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
    console.error("Ошибка при получении сохраненной сессии:", error);
    return null;
  }
});

ipcMain.handle("mobile:set-match", async (event, match) => {
  // Сохраняем логотипы в файлы при обновлении матча для мобильного сервера
  // Это необходимо для того, чтобы они были доступны по HTTP через мобильный сервер
  try {
    if (match && match.teamA) {
      await logoManager.processTeamLogoForSave(match.teamA, "A");
    }
    if (match && match.teamB) {
      await logoManager.processTeamLogoForSave(match.teamB, "B");
    }
    // Очищаем папку logos от устаревших файлов
    await logoManager.cleanupLogosDirectory();
  } catch (error) {
    console.error(
      "Ошибка при сохранении логотипов для мобильного сервера:",
      error
    );
    // Не прерываем выполнение, если ошибка сохранения логотипов
  }

  mobileServer.setMatch(match);
  return { success: true };
});

ipcMain.handle("mobile:is-running", () => {
  return mobileServer.isRunning();
});

// AutoSave handlers
ipcMain.handle("autosave:get-settings", async () => {
  try {
    const settings = await settingsManager.getAutoSaveSettings();
    return { success: true, enabled: settings.enabled };
  } catch (error) {
    console.error("Error getting auto-save settings:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("autosave:set-settings", async (event, enabled) => {
  try {
    await settingsManager.setAutoSaveSettings({ enabled });
    return { success: true };
  } catch (error) {
    console.error("Error setting auto-save settings:", error);
    return { success: false, error: error.message };
  }
});
