// Общие константы игры. Единственное место, где меняются цены/размеры.

export const DEFAULT_COINS = 500;
export const DEFAULT_LEVEL = 1;
export const TOTAL_LEVELS = 15;    // уровней в эпизоде 1
export const SPECIAL_LEVELS = [6, 15]; // визуальная метка «корона»
export const CELL_SIZE = 40;       // размер ячейки сетки в px
export const WHEEL_RADIUS = 100;   // радиус окружности колеса в px
export const BONUS_REWARD = 10;    // монеты за бонусное слово
export const KEY_REWARD = 100;     // монеты за ключевое слово
export const HINT_COST = 25;       // монеты за подсказку

// Награда за первое прохождение уровня:
// 40 + 12 * (слов в сетке) + 4 * min(номер уровня, 15)
export const LEVEL_REWARD_BASE = 40;
export const LEVEL_REWARD_PER_WORD = 12;
export const LEVEL_REWARD_PER_LEVEL = 4;
export const LEVEL_REWARD_LEVEL_CAP = 15;
export const REPEAT_REWARD_RATE = 0.25; // повторное прохождение
export const SVG_NS = 'http://www.w3.org/2000/svg';

// Темы оформления. jungle — эпизод 1, остальные заложены на будущее.
export const THEMES = ['normal', 'jungle', 'hard'];
export const EPISODE_THEME = 'jungle';
export const EPISODE_TITLE = 'Эпизод 1 · Джунгли';

// Сохранение
export const SAVE_KEY = 'crocword_save';
export const SAVE_VERSION = 2;

// Отладка: все console.log спрятаны за флагом
export const DEBUG = false;

export function debug(...args) {
    if (DEBUG) console.log(...args);
}
