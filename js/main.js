// Точка входа: инициализация сохранения, UI и первого уровня.

import { DEFAULT_LEVEL, HINT_COST, debug } from './core/constants.js';
import { state } from './core/state.js';
import { loadGameData } from './core/storage.js';
import { fetchLevels } from './data/levels.js';
import { showHint } from './game/hints.js';
import {
    closeLevelMenu,
    isLevelMenuOpen,
    openLevelMenu,
    setLevelLoader
} from './game/menu.js';
import { loadLevelData } from './game/session.js';
import { initWheelInput, shuffleWheel } from './game/wheel.js';
import { updateCoinUI } from './ui/hud.js';
import { initLevelComplete } from './ui/level-complete.js';

document.addEventListener('DOMContentLoaded', async () => {
    loadGameData();
    updateCoinUI();

    setLevelLoader(loadLevelData);
    initWheelInput();
    initLevelComplete({
        onNext: async nextLevel => {
            const loaded = await loadLevelData(nextLevel);
            if (!loaded) openLevelMenu();
        },
        onMenu: openLevelMenu
    });

    const levelsBtn = document.getElementById('btn-levels');
    if (levelsBtn) levelsBtn.addEventListener('click', openLevelMenu);

    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) {
        hintBtn.textContent = `Подсказка (${HINT_COST})`;
        hintBtn.addEventListener('click', showHint);
    }

    const shuffleBtn = document.getElementById('btn-shuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleWheel);

    const closeBtn = document.getElementById('btn-close-levels');
    if (closeBtn) closeBtn.addEventListener('click', closeLevelMenu);

    const menu = document.getElementById('level-menu');
    if (menu) {
        menu.addEventListener('click', event => {
            if (event.target === menu) closeLevelMenu();
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isLevelMenuOpen()) closeLevelMenu();
    });

    try {
        await fetchLevels();
    } catch (error) {
        console.error('Не удалось загрузить levels.json:', error);
    }

    const levelData = await loadLevelData(state.currentLevel || DEFAULT_LEVEL);

    if (levelData) {
        debug('Монеты:', state.currentCoins);
    }
});
