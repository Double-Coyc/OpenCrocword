// Меню выбора уровня.

import {
    EPISODE_THEME,
    EPISODE_TITLE,
    SPECIAL_LEVELS,
    TOTAL_LEVELS
} from '../core/constants.js';
import { state } from '../core/state.js';
import { isLevelCompleted } from '../core/storage.js';

// Загрузчик уровня внедряется извне, чтобы не было циклического импорта.
let levelLoader = null;

export function setLevelLoader(fn) {
    levelLoader = fn;
}

// Уровень открыт, если это первый уровень, текущий уровень из сохранения
// или предыдущий уровень уже пройден.
export function isLevelUnlocked(levelNum) {
    if (levelNum === 1) return true;
    if (levelNum === state.currentLevel) return true;
    return isLevelCompleted(levelNum - 1);
}

export function renderLevelMenu() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;

    const menu = document.getElementById('level-menu');
    if (menu) menu.dataset.episodeTheme = EPISODE_THEME;

    const title = document.getElementById('level-menu-title');
    if (title) title.textContent = EPISODE_TITLE;

    grid.innerHTML = '';

    for (let num = 1; num <= TOTAL_LEVELS; num++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'level-btn';

        const number = document.createElement('span');
        number.className = 'level-num';
        number.textContent = num;
        button.appendChild(number);

        const special = SPECIAL_LEVELS.includes(num);
        if (special) {
            button.classList.add('special');
            button.setAttribute('aria-label', `Уровень ${num}, особый`);

            const crown = document.createElement('span');
            crown.className = 'level-crown';
            crown.setAttribute('aria-hidden', 'true');
            crown.textContent = '♛';
            button.appendChild(crown);
        } else {
            button.setAttribute('aria-label', `Уровень ${num}`);
        }

        if (isLevelCompleted(num)) button.classList.add('completed');
        if (num === state.currentLevel && !isLevelCompleted(num)) button.classList.add('current');

        const exists = state.availableLevels.size === 0 || state.availableLevels.has(num);
        const unlocked = isLevelUnlocked(num);

        if (!exists) {
            button.classList.add('locked');
            button.disabled = true;
            button.title = 'Уровень скоро появится';
        } else if (!unlocked) {
            button.classList.add('locked');
            button.disabled = true;
            button.title = 'Пройдите предыдущий уровень';
        }

        button.addEventListener('click', () => {
            if (button.disabled) return;
            closeLevelMenu();
            if (levelLoader) levelLoader(num);
        });

        grid.appendChild(button);
    }
}

export function openLevelMenu() {
    const menu = document.getElementById('level-menu');
    if (!menu) return;

    renderLevelMenu();
    menu.classList.remove('hidden');
    menu.setAttribute('aria-hidden', 'false');
}

export function closeLevelMenu() {
    const menu = document.getElementById('level-menu');
    if (!menu) return;

    menu.classList.add('hidden');
    menu.setAttribute('aria-hidden', 'true');
}

export function isLevelMenuOpen() {
    const menu = document.getElementById('level-menu');
    return !!menu && !menu.classList.contains('hidden');
}
