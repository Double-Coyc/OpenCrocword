// HUD: баланс монет и тема оформления.

import { THEMES } from '../core/constants.js';
import { state } from '../core/state.js';

export function updateCoinUI(animate) {
    const balanceEl = document.getElementById('coin-balance-text');
    if (!balanceEl) return;

    balanceEl.textContent = state.currentCoins;

    if (animate) {
        balanceEl.classList.remove('coin-pulse');
        void balanceEl.offsetWidth; // перезапуск анимации
        balanceEl.classList.add('coin-pulse');
    }
}

export function applyTheme(theme) {
    const safeTheme = THEMES.includes(theme) ? theme : 'normal';
    THEMES.forEach(name => document.body.classList.remove(`theme-${name}`));
    document.body.classList.add(`theme-${safeTheme}`);
}
