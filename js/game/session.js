// Загрузка уровня и связывание данных с рендером.

import { debug } from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry, saveGameData } from '../core/storage.js';
import {
    fetchLevels,
    getLevelFromCache,
    getWheelLetters,
    normalizeLevel
} from '../data/levels.js';
import { applyTheme, updateCoinUI } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';
import { renderGrid, restoreFoundWords, restoreHintedCells } from './grid.js';
import { renderLevelMenu } from './menu.js';
import { renderWheel } from './wheel.js';

export async function loadLevelData(levelNum) {
    try {
        const data = await fetchLevels();
        const levelData = getLevelFromCache(data, levelNum);

        if (!levelData) {
            showToast(`Уровень ${levelNum} скоро появится`);
            return null;
        }

        state.currentLevel = levelNum;
        state.currentLevelData = normalizeLevel(levelData);
        state.inputLocked = false;

        const progress = getProgressEntry(levelNum);
        state.foundWords = new Set(progress.found);
        state.foundBonusWords = new Set(progress.bonus);
        state.hintedCells = new Set(progress.hinted);
        state.keyWordFound = progress.keyFound;

        applyTheme(state.currentLevelData.theme);
        renderGrid(state.currentLevelData);
        renderWheel(getWheelLetters(state.currentLevelData));
        restoreFoundWords();
        restoreHintedCells();

        updateCoinUI();
        renderLevelMenu();
        saveGameData();

        debug(`Уровень ${levelNum} загружен:`, {
            words: state.currentLevelData.words,
            keyWord: state.currentLevelData.keyWord,
            bonusWords: state.currentLevelData.bonusWords,
            wheel: getWheelLetters(state.currentLevelData).join(''),
            theme: state.currentLevelData.theme
        });
        return state.currentLevelData;
    } catch (error) {
        console.error('Ошибка загрузки уровня:', error);
        showToast('Не удалось загрузить уровень');
        return null;
    }
}
