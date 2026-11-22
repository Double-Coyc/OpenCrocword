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

// Копилка в экране эпизода: сумма и доступность кнопки «Забрать»
export function updateBankUI() {
    const amountEl = document.getElementById('bank-amount');
    if (amountEl) amountEl.textContent = state.bankCoins;

    const claimBtn = document.getElementById('btn-claim-bank');
    if (claimBtn) claimBtn.disabled = state.bankCoins <= 0;

    const row = document.getElementById('bank-row');
    if (row) row.classList.toggle('bank-empty', state.bankCoins <= 0);
}

export function applyTheme(theme) {
    const safeTheme = THEMES.includes(theme) ? theme : 'normal';
    THEMES.forEach(name => document.body.classList.remove(`theme-${name}`));
    document.body.classList.add(`theme-${safeTheme}`);
}
