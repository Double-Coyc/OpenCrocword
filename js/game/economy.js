// Экономика: награда за прохождение уровня.

import {
    BANK_RATE,
    LEVEL_REWARD_BASE,
    LEVEL_REWARD_LEVEL_CAP,
    LEVEL_REWARD_PER_LEVEL,
    LEVEL_REWARD_PER_WORD,
    REPEAT_REWARD_RATE
} from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry, saveGameData } from '../core/storage.js';
import { updateBankUI, updateCoinUI } from '../ui/hud.js';

/**
 * Начисляет заработок: монеты игроку + доля в копилку.
 * Используется для слов, ключа, бонусов, монетных ячеек и уровней.
 */
export function addEarnedCoins(amount) {
    const value = Math.max(0, Math.round(Number(amount) || 0));
    if (value === 0) return 0;

    state.currentCoins += value;

    const toBank = Math.round(value * BANK_RATE);
    if (toBank > 0) state.bankCoins += toBank;

    updateCoinUI(true);
    updateBankUI();
    saveGameData();

    return value;
}

// Забрать накопленное из копилки. Возвращает сумму.
export function claimBank() {
    const amount = Math.floor(state.bankCoins);
    if (amount <= 0) return 0;

    state.bankCoins = 0;
    state.currentCoins += amount;

    updateCoinUI(true);
    updateBankUI();
    saveGameData();

    return amount;
}

export function calculateLevelReward(levelNumber, wordsCount, firstCompletion = true) {
    const reward = LEVEL_REWARD_BASE
        + LEVEL_REWARD_PER_WORD * Math.max(0, wordsCount)
        + LEVEL_REWARD_PER_LEVEL * Math.min(levelNumber, LEVEL_REWARD_LEVEL_CAP);

    return firstCompletion ? reward : Math.round(reward * REPEAT_REWARD_RATE);
}

/**
 * Начисляет награду за первое закрытие уровня.
 * Повторно completed=true не награждается.
 * Возвращает { amount, firstCompletion }.
 */
export function awardLevelCompletion(levelNumber, wordsCount) {
    const entry = getProgressEntry(levelNumber);

    if (entry.completed) {
        return { amount: 0, firstCompletion: false };
    }

    entry.completed = true;

    const amount = calculateLevelReward(levelNumber, wordsCount, true);
    addEarnedCoins(amount);

    return { amount, firstCompletion: true };
}
