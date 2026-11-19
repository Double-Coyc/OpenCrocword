// Подсказка: открывает случайную закрытую букву в неразгаданном слове.

import { HINT_COST, debug } from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry, saveGameData } from '../core/storage.js';
import { updateCoinUI } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';

export function showHint() {
    if (state.inputLocked) return;
    if (state.currentCoins < HINT_COST) {
        showToast(`Подсказка стоит ${HINT_COST} монет`);
        return;
    }

    const candidates = [];
    const seenCells = new Set();

    (state.currentLevelData.grid || []).forEach(entry => {
        if (state.foundWords.has(entry.word)) return; // слово уже разгадано

        const isVertical = entry.direction === 'vertical';
        const word = String(entry.word || '');

        for (let i = 0; i < word.length; i++) {
            const row = entry.row + (isVertical ? i : 0);
            const col = entry.col + (isVertical ? 0 : i);
            const key = `${row}-${col}`;

            if (seenCells.has(key)) continue; // клетка на пересечении двух слов
            if (state.hintedCells.has(key)) continue; // уже открыта подсказкой

            const cell = document.querySelector(
                `.grid-cell[data-row="${row}"][data-col="${col}"]`
            );
            if (!cell || !cell.dataset.letter) continue;
            if (cell.textContent.trim()) continue; // буква уже видна

            seenCells.add(key);
            candidates.push({ key, cell });
        }
    });

    if (candidates.length === 0) {
        showToast('Все буквы уже открыты');
        return;
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    state.hintedCells.add(pick.key);
    getProgressEntry(state.currentLevel).hinted = [...state.hintedCells];

    state.currentCoins -= HINT_COST;
    updateCoinUI(true);
    saveGameData();

    pick.cell.textContent = pick.cell.dataset.letter;
    pick.cell.classList.remove('empty');
    pick.cell.classList.add('filled', 'hinted');

    showToast(`Подсказка: −${HINT_COST} монет`);
    debug(`Подсказка открыла клетку ${pick.key}, осталось монет: ${state.currentCoins}`);
}
