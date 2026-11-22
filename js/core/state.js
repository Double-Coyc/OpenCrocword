// Единое изменяемое состояние игры.
// Модули импортируют объект state и меняют его поля (а не переприсваивают).

import { DEFAULT_COINS, DEFAULT_LEVEL } from './constants.js';

export const state = {
    currentCoins: DEFAULT_COINS,
    bankCoins: 0,
    currentLevel: DEFAULT_LEVEL,

    // Данные текущего уровня
    currentLevelData: {
        words: [],
        grid: [],
        bonusWords: [],
        coinCells: [],
        keyWord: '',
        theme: 'normal'
    },

    foundWords: new Set(),
    foundBonusWords: new Set(),
    keyWordFound: false,
    hintedCells: new Set(),
    inputLocked: false,

    // Прогресс по уровням: { "1": { found, bonus, hinted, claimedCoins, keyFound, completed, bankRewarded } }
    levelProgress: {},

    // levels.json и список существующих уровней
    levelsCache: null,
    availableLevels: new Set(),

    // Состояние выбора букв на колесе
    selectedLetters: [],
    isDragging: false,
    pointerPreview: null,
    hoveredButton: null,
    wheelLetters: new Set(),
    wheelLetterList: []
};
