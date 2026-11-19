// Сетка кроссворда: отрисовка, открытие слов, восстановление прогресса.

import { CELL_SIZE, TOTAL_LEVELS } from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry, saveGameData } from '../core/storage.js';
import { flyLetter, prefersReducedMotion } from '../ui/animations.js';
import { showLevelComplete } from '../ui/level-complete.js';
import { awardLevelCompletion } from './economy.js';
import { renderLevelMenu } from './menu.js';

export function renderGrid(levelData) {
    const gridContainer = document.getElementById('grid-container');
    if (!gridContainer) {
        console.error('Контейнер #grid-container не найден!');
        return;
    }

    const entries = Array.isArray(levelData && levelData.grid) ? levelData.grid : [];
    if (entries.length === 0) {
        gridContainer.innerHTML = '';
        gridContainer.textContent = 'Нет данных для сетки';
        return;
    }

    // Карта букв: "row-col" -> буква
    const letters = new Map();
    let maxRow = 0;
    let maxCol = 0;

    entries.forEach(entry => {
        const word = String(entry.word || '').toUpperCase();
        const isVertical = entry.direction === 'vertical';

        for (let i = 0; i < word.length; i++) {
            const row = entry.row + (isVertical ? i : 0);
            const col = entry.col + (isVertical ? 0 : i);
            const key = `${row}-${col}`;

            const existing = letters.get(key);
            if (existing && existing !== word[i]) {
                console.warn(`Конфликт букв в клетке (${row},${col}): «${existing}» и «${word[i]}» из слова ${word}`);
            }
            if (!existing) letters.set(key, word[i]);

            if (row > maxRow) maxRow = row;
            if (col > maxCol) maxCol = col;
        }
    });

    const rows = maxRow + 1;
    const cols = maxCol + 1;

    gridContainer.innerHTML = '';
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
    gridContainer.style.gridAutoRows = `${CELL_SIZE}px`;
    gridContainer.style.gap = '4px';
    gridContainer.style.justifyContent = 'center';
    gridContainer.style.alignContent = 'center';
    gridContainer.style.padding = '10px';
    gridContainer.style.overflow = 'auto';

    const fragment = document.createDocumentFragment();

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const letter = letters.get(`${row}-${col}`);
            const cell = document.createElement('div');

            cell.className = letter ? 'grid-cell filled' : 'grid-cell empty';
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Буква скрыта: показываем пустой слот, сама буква лежит в data-letter
            cell.dataset.letter = letter || '';
            cell.textContent = '';

            fragment.appendChild(cell);
        }
    }

    gridContainer.appendChild(fragment);
}

// Открывает слово в сетке: вписывает буквы и подсвечивает клетки.
// sources — позиции кнопок колеса для анимации перелёта букв.
export function revealWord(word, silent = false, sources = null) {
    const entries = state.currentLevelData.grid.filter(entry => entry.word === word);
    const targets = [];

    entries.forEach(entry => {
        const isVertical = entry.direction === 'vertical';

        for (let i = 0; i < word.length; i++) {
            const row = entry.row + (isVertical ? i : 0);
            const col = entry.col + (isVertical ? 0 : i);
            const cell = document.querySelector(
                `.grid-cell[data-row="${row}"][data-col="${col}"]`
            );

            if (!cell) continue;
            targets.push({ cell, letter: cell.dataset.letter || word[i] });
        }
    });

    state.foundWords.add(word);
    getProgressEntry(state.currentLevel).found = [...state.foundWords];

    // Восстановление после перерисовки — без анимации
    if (silent) {
        targets.forEach(fillTarget);
        return;
    }

    // Прогресс фиксируем сразу, чтобы reload не потерял слово
    saveGameData();

    // Проверка завершения — до анимации: она не должна влиять на награду
    checkLevelComplete(state.currentLevel);

    if (!sources || sources.length === 0 || prefersReducedMotion()) {
        targets.forEach(fillTarget);
        return;
    }

    const stagger = targets.length > 8 ? 16 : 32;

    targets.forEach((target, index) => {
        const source = sources[index];

        if (!source || !source.rect) {
            fillTarget(target);
            return;
        }

        const delay = index * stagger;

        flyLetter({
            from: source.rect,
            to: target.cell,
            letter: target.letter,
            delay
        }).then(() => fillTarget(target));

        // Страховка на случай, если Web Animations не завершится (фоновая вкладка)
        window.setTimeout(() => {
            if (!target.cell.textContent.trim()) fillTarget(target);
        }, delay + 380);
    });
}

function fillTarget({ cell, letter }) {
    cell.textContent = cell.dataset.letter || letter;
    cell.classList.remove('empty');
    cell.classList.add('filled', 'found');
}

// Восстанавливает уже найденные слова после перерисовки сетки
export function restoreFoundWords() {
    [...state.foundWords].forEach(word => revealWord(word, true));
}

// Восстанавливает клетки, открытые подсказкой после перерисовки сетки
export function restoreHintedCells() {
    state.hintedCells.forEach(key => {
        const [row, col] = key.split('-');
        const cell = document.querySelector(
            `.grid-cell[data-row="${row}"][data-col="${col}"]`
        );

        if (!cell || !cell.dataset.letter) return;
        if (cell.textContent.trim()) return; // клетка уже открыта словом

        cell.textContent = cell.dataset.letter;
        cell.classList.remove('empty');
        cell.classList.add('filled', 'hinted');
    });
}

export function checkLevelComplete(levelNumber = state.currentLevel) {
    const allWords = state.currentLevelData.words || [];
    if (allWords.length === 0) return;

    const done = allWords.every(word => state.foundWords.has(word));
    if (!done) return;

    const completedLevel = levelNumber;
    const entry = getProgressEntry(completedLevel);
    if (entry.completed) return;

    // Блокируем ввод сразу, не дожидаясь появления оверлея
    state.inputLocked = true;

    const { amount } = awardLevelCompletion(completedLevel, allWords.length);

    const nextExists = state.availableLevels.size === 0 || state.availableLevels.has(completedLevel + 1);
    const nextLevel = completedLevel < TOTAL_LEVELS && nextExists ? completedLevel + 1 : null;

    // Текущим становится следующий уровень: это видят и оверлей, и экран эпизода
    if (nextLevel) {
        state.currentLevel = nextLevel;
        saveGameData();
    }

    renderLevelMenu();

    window.setTimeout(() => {
        showLevelComplete({
            levelNumber: completedLevel,
            reward: amount,
            nextLevel
        });
    }, prefersReducedMotion() ? 250 : 650);
}
