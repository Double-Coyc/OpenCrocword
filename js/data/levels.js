// Загрузка и нормализация уровней из levels.json.

import { THEMES } from '../core/constants.js';
import { state } from '../core/state.js';

function normalizeDirection(dir) {
    const value = String(dir || '').toLowerCase();
    if (value === 'v' || value === 'vertical') return 'vertical';
    return 'horizontal';
}

/**
 * Приводит данные уровня к единому виду:
 * { words, grid: [{word,row,col,direction}], bonusWords, keyWord, theme }
 */
export function normalizeLevel(levelData) {
    if (!levelData) {
        return { words: [], grid: [], bonusWords: [], keyWord: '', theme: 'normal' };
    }

    const entries = [];
    const rawGrid = Array.isArray(levelData.grid) ? levelData.grid : [];

    const isObjectGrid = rawGrid.length > 0 &&
        rawGrid[0] !== null &&
        typeof rawGrid[0] === 'object' &&
        !Array.isArray(rawGrid[0]);

    if (isObjectGrid) {
        rawGrid.forEach(item => {
            if (!item || typeof item.word !== 'string') return;
            entries.push({
                word: item.word.toUpperCase(),
                row: Number(item.row) || 0,
                col: Number(item.col) || 0,
                direction: normalizeDirection(item.direction || item.dir)
            });
        });
    } else if (Array.isArray(levelData.words)) {
        levelData.words.forEach(item => {
            if (!item || typeof item !== 'object' || !Array.isArray(item.start)) return;
            entries.push({
                word: String(item.word).toUpperCase(),
                row: Number(item.start[0]) || 0,
                col: Number(item.start[1]) || 0,
                direction: normalizeDirection(item.direction)
            });
        });
    }

    const words = entries.length > 0
        ? entries.map(entry => entry.word)
        : (Array.isArray(levelData.words) ? levelData.words.map(word => String(word).toUpperCase()) : []);

    return {
        words,
        grid: entries,
        bonusWords: Array.isArray(levelData.bonusWords)
            ? levelData.bonusWords.map(word => String(word).toUpperCase())
            : [],
        keyWord: typeof levelData.keyWord === 'string' ? levelData.keyWord.toUpperCase() : '',
        theme: THEMES.includes(levelData.theme) ? levelData.theme : 'normal'
    };
}

export async function fetchLevels() {
    if (state.levelsCache) return state.levelsCache;

    const response = await fetch('levels.json');
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    state.levelsCache = await response.json();

    const numbers = new Set();

    if (Array.isArray(state.levelsCache)) {
        // формат: массив уровней, номер уровня = индекс + 1
        state.levelsCache.forEach((level, index) => {
            if (level) numbers.add(index + 1);
        });
    } else {
        Object.keys(state.levelsCache).forEach(key => {
            const match = /^level_(\d+)$/.exec(key);
            if (match) numbers.add(Number(match[1]));
        });
        if (Array.isArray(state.levelsCache.levels)) {
            state.levelsCache.levels.forEach(level => {
                if (level && Number.isFinite(level.id)) numbers.add(level.id);
            });
        }
    }

    state.availableLevels = numbers;
    return state.levelsCache;
}

export function getLevelFromCache(data, levelNum) {
    if (Array.isArray(data)) {
        return data[levelNum - 1] || null;
    }
    if (data[`level_${levelNum}`]) {
        return data[`level_${levelNum}`];
    }
    if (Array.isArray(data.levels)) {
        return data.levels.find(level => level && level.id === levelNum) || null;
    }
    return null;
}

// Буквы для колеса: ключевое слово + слова уровня + бонусные слова.
// Ключевое слово задаёт основной набор, остальные добавки нужны,
// чтобы все слова и бонусы можно было реально набрать.
export function getWheelLetters(levelData) {
    const source = []
        .concat(levelData.keyWord ? [levelData.keyWord] : [])
        .concat(levelData.words || [])
        .concat(levelData.bonusWords || []);

    const seen = new Set();
    const letters = [];
    source.forEach(word => {
        String(word || '').toUpperCase().split('').forEach(letter => {
            const clean = letter.trim();
            if (!clean || seen.has(clean)) return;
            seen.add(clean);
            letters.push(clean);
        });
    });

    return letters;
}
