// Экономика: награда за прохождение уровня.

import {
    LEVEL_REWARD_BASE,
    LEVEL_REWARD_LEVEL_CAP,
    LEVEL_REWARD_PER_LEVEL,
    LEVEL_REWARD_PER_WORD,
    REPEAT_REWARD_RATE
} from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry, saveGameData } from '../core/storage.js';
import { updateCoinUI } from '../ui/hud.js';

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
    state.currentCoins += amount;

    updateCoinUI(true);
    saveGameData();

    return { amount, firstCompletion: true };
}
