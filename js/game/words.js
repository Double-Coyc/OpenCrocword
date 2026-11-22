// Проверка собранного слова и начисления.

import { BONUS_REWARD, KEY_REWARD, debug } from '../core/constants.js';
import { state } from '../core/state.js';
import { getProgressEntry } from '../core/storage.js';
import { shakeWordPreview } from '../ui/animations.js';
import { showToast } from '../ui/toast.js';
import { addEarnedCoins } from './economy.js';
import { revealWord } from './grid.js';

// Можно ли набрать слово из букв, которые есть на колесе
export function canBuildFromWheel(word) {
    const letters = String(word || '').toUpperCase();

    for (const letter of letters) {
        if (!state.wheelLetters.has(letter)) return false;
    }

    return true;
}

export function handleWord(word, sources = null) {
    // 1. Слово уже собрано — в сетке или как бонусное
    if (state.foundWords.has(word) || state.foundBonusWords.has(word)) {
        showToast('Слово уже собрано');
        return;
    }

    // 2. Ключевое слово — только награда, в сетку не пишется
    if (state.currentLevelData.keyWord && word === state.currentLevelData.keyWord) {
        if (state.keyWordFound) {
            showToast('Ключевое слово уже найдено');
            return;
        }

        state.keyWordFound = true;
        getProgressEntry(state.currentLevel).keyFound = true;

        addEarnedCoins(KEY_REWARD);
        showToast('Ключевое слово найдено!');
        debug(`Ключевое слово: ${word} (+${KEY_REWARD})`);
        return;
    }

    const levelWords = state.currentLevelData.words || [];

    // 3. Слово уровня — открываем в сетке
    if (levelWords.includes(word)) {
        revealWord(word, false, sources);
        debug(`Найдено слово: ${word} (${state.foundWords.size}/${levelWords.length})`);
        return;
    }

    // 4. Бонусное слово — только из списка bonusWords уровня
    const bonusWords = state.currentLevelData.bonusWords || [];
    if (bonusWords.includes(word)) {
        state.foundBonusWords.add(word);
        getProgressEntry(state.currentLevel).bonus = [...state.foundBonusWords];

        addEarnedCoins(BONUS_REWARD);
        showToast(`+${BONUS_REWARD} за слово «${word}»`);
        debug(`Бонусное слово: ${word} (+${BONUS_REWARD})`);
        return;
    }

    // 5. Слова нет в списках уровня
    if (!canBuildFromWheel(word)) {
        shakeWordPreview(word);
        showToast('Это слово нельзя собрать из этих букв');
        debug(`«${word}» нельзя собрать из букв этого уровня`);
        return;
    }

    shakeWordPreview(word);
    showToast(`Слова "${word}" не существует`);
    debug(`«${word}» нет ни в словах уровня, ни в бонусных`);
}
