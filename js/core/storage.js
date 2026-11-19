// Единственное место в проекте, где используется localStorage.
// Здесь же живёт миграция старых сохранений.

import { DEFAULT_COINS, DEFAULT_LEVEL, SAVE_KEY, SAVE_VERSION } from './constants.js';
import { state } from './state.js';

export function getProgressEntry(levelNum) {
    const key = String(levelNum);
    const entry = state.levelProgress[key];

    if (!entry || typeof entry !== 'object') {
        state.levelProgress[key] = {
            found: [],
            bonus: [],
            hinted: [],
            claimedCoins: [],
            keyFound: false,
            completed: false,
            bankRewarded: false
        };
    } else {
        if (!Array.isArray(state.levelProgress[key].found)) state.levelProgress[key].found = [];
        if (!Array.isArray(state.levelProgress[key].bonus)) state.levelProgress[key].bonus = [];
        if (!Array.isArray(state.levelProgress[key].hinted)) state.levelProgress[key].hinted = [];
        if (!Array.isArray(state.levelProgress[key].claimedCoins)) state.levelProgress[key].claimedCoins = [];
        state.levelProgress[key].keyFound = !!state.levelProgress[key].keyFound;
        state.levelProgress[key].completed = !!state.levelProgress[key].completed;
        state.levelProgress[key].bankRewarded = !!state.levelProgress[key].bankRewarded;
    }

    return state.levelProgress[key];
}

export function isLevelCompleted(levelNum) {
    const entry = state.levelProgress[String(levelNum)];
    return !!(entry && entry.completed);
}

/**
 * Приводит любое сохранение (включая legacy без version) к текущей схеме.
 * Функция идемпотентна: повторный вызов на новой схеме ничего не ломает.
 */
export function migrateSave(raw) {
    const save = (raw && typeof raw === 'object') ? raw : {};

    const migrated = {
        version: SAVE_VERSION,
        coins: Number.isFinite(save.coins) ? save.coins : DEFAULT_COINS,
        level: Number.isFinite(save.level) ? save.level : DEFAULT_LEVEL,
        progress: {}
    };

    // progress может отсутствовать в старых сохранениях, где был только foundWords
    let progress = save.progress;
    if (!progress || typeof progress !== 'object') {
        progress = Array.isArray(save.foundWords)
            ? { [String(migrated.level)]: { found: save.foundWords } }
            : {};
    }

    Object.keys(progress).forEach(levelKey => {
        const entry = progress[levelKey];
        if (!entry || typeof entry !== 'object') return;

        migrated.progress[levelKey] = {
            found: Array.isArray(entry.found) ? entry.found : [],
            bonus: Array.isArray(entry.bonus) ? entry.bonus : [],
            hinted: Array.isArray(entry.hinted) ? entry.hinted : [],
            claimedCoins: Array.isArray(entry.claimedCoins) ? entry.claimedCoins : [],
            keyFound: !!entry.keyFound,
            completed: !!entry.completed,
            bankRewarded: !!entry.bankRewarded
        };
    });

    return migrated;
}

export function saveGameData() {
    if (typeof localStorage === 'undefined') return;

    const gameData = {
        version: SAVE_VERSION,
        coins: state.currentCoins,
        level: state.currentLevel,
        progress: state.levelProgress
    };

    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameData));
    } catch (error) {
        console.warn('Не удалось сохранить прогресс:', error);
    }
}

export function loadGameData() {
    if (typeof localStorage === 'undefined') return false;

    const savedData = localStorage.getItem(SAVE_KEY);
    if (!savedData) return false;

    try {
        const raw = JSON.parse(savedData);
        const save = migrateSave(raw);

        state.currentCoins = save.coins;
        state.currentLevel = save.level;
        state.levelProgress = save.progress;

        // Если сохранение было старого формата — сразу фиксируем новую версию
        if (!raw || raw.version !== SAVE_VERSION) saveGameData();

        return true;
    } catch (error) {
        console.warn('Не удалось прочитать сохранение, берём значения по умолчанию:', error);
        state.currentCoins = DEFAULT_COINS;
        state.currentLevel = DEFAULT_LEVEL;
        state.levelProgress = {};
        return false;
    }
}
