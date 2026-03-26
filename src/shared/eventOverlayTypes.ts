/**
 * Типы событий для авто-плашек vMix (сетбол, матчбол, таймаут).
 * Используется в getValueByDataMapKey (event.autoLabel), настройках инпутов и useVMix.
 */

export const AUTO_EVENT_TYPES = [
  'setballA',
  'setballB',
  'matchballA',
  'matchballB',
  'timeoutA',
  'timeoutB',
] as const;

export type AutoEventType = (typeof AUTO_EVENT_TYPES)[number];

/** Метки для отображения в поле «Автособытие» */
export const AUTO_EVENT_LABELS: Record<AutoEventType, string> = {
  setballA: 'Сетбол',
  setballB: 'Сетбол',
  matchballA: 'Матчбол',
  matchballB: 'Матчбол',
  timeoutA: 'Таймаут',
  timeoutB: 'Таймаут',
};

/** Приоритет для «основного слота»: при нескольких активных показываем первое по списку (таймаут > матчбол > сетбол) */
export const AUTO_EVENT_PRIORITY_ORDER: AutoEventType[] = [
  'timeoutA',
  'timeoutB',
  'matchballA',
  'matchballB',
  'setballA',
  'setballB',
];
