const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Match management
  createMatch: () => ipcRenderer.invoke('match:create'),
  openMatchDialog: () => ipcRenderer.invoke('match:open-dialog'),
  saveMatch: (match) => ipcRenderer.invoke('match:save', match),
  saveMatchDialog: (match) => ipcRenderer.invoke('match:save-dialog', match),
  
  // vMix management
  getVMixConfig: () => ipcRenderer.invoke('vmix:get-config'),
  setVMixConfig: (config) => ipcRenderer.invoke('vmix:set-config', config),
  testVMixConnection: (host, port) => ipcRenderer.invoke('vmix:test-connection', host, port),
  updateVMixInput: (inputName, data) => ipcRenderer.invoke('vmix:update-input', inputName, data),
  updateVMixInputFields: (inputName, fields, colorFields, visibilityFields, imageFields, textColorFields) => ipcRenderer.invoke('vmix:update-input-fields', inputName, fields, colorFields, visibilityFields, imageFields, textColorFields),
  showVMixOverlay: (inputKey) => ipcRenderer.invoke('vmix:show-overlay', inputKey),
  hideVMixOverlay: (inputKey) => ipcRenderer.invoke('vmix:hide-overlay', inputKey),
  getVMixOverlayState: () => ipcRenderer.invoke('vmix:get-overlay-state'),
  
  // Mobile server management
  startMobileServer: (port) => ipcRenderer.invoke('mobile:start-server', port),
  stopMobileServer: () => ipcRenderer.invoke('mobile:stop-server'),
  getMobileServerInfo: () => ipcRenderer.invoke('mobile:get-server-info'),
  generateMobileSession: () => ipcRenderer.invoke('mobile:generate-session'),
  getSavedMobileSession: () => ipcRenderer.invoke('mobile:get-saved-session'),
  setMobileMatch: (match) => ipcRenderer.invoke('mobile:set-match', match),
  isMobileServerRunning: () => ipcRenderer.invoke('mobile:is-running'),
  getNetworkInterfaces: () => ipcRenderer.invoke('mobile:get-network-interfaces'),
  setSelectedIP: (ip) => ipcRenderer.invoke('mobile:set-selected-ip', ip),
  
  // Match state management
  setCurrentMatch: (match) => ipcRenderer.invoke('match:set-current', match),
  markMatchSaved: () => ipcRenderer.invoke('match:mark-saved'),
  swapTeams: (match) => ipcRenderer.invoke('match:swap-teams', match),
  
  // AutoSave management
  getAutoSaveSettings: () => ipcRenderer.invoke('autosave:get-settings'),
  setAutoSaveSettings: (enabled) => ipcRenderer.invoke('autosave:set-settings', enabled),
  
  // Logo management
  saveLogoToFile: (teamLetter, logoBase64) => ipcRenderer.invoke('logo:save-to-file', teamLetter, logoBase64),
  deleteLogo: (teamLetter) => ipcRenderer.invoke('logo:delete', teamLetter),
  
  // Listeners (возвращают функцию для удаления слушателя)
  onNavigate: (callback) => {
    const handler = (event, path) => callback(path);
    ipcRenderer.on('navigate', handler);
    // Возвращаем функцию для удаления слушателя
    return () => ipcRenderer.removeListener('navigate', handler);
  },
  onLoadMatch: (callback) => {
    const handler = (event, match) => callback(match);
    ipcRenderer.on('load-match', handler);
    return () => ipcRenderer.removeListener('load-match', handler);
  },
  onMatchSaved: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('match-saved', handler);
    return () => ipcRenderer.removeListener('match-saved', handler);
  },
  onRefreshVMix: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('refresh-vmix', handler);
    return () => ipcRenderer.removeListener('refresh-vmix', handler);
  },
  onAutoSaveSettingsChanged: (callback) => {
    const handler = (event, enabled) => callback(enabled);
    ipcRenderer.on('autosave-settings-changed', handler);
    return () => ipcRenderer.removeListener('autosave-settings-changed', handler);
  },
});

