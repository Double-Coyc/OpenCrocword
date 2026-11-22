// Генератор уровней эпизода + валидатор.
//
// Работает и в браузере (import из js), и в Node (CLI):
//   node tools/gen-levels.mjs
//
// Детерминирован: одинаковый seed + словарь = одинаковый levels.json.

export const THEMES = ['normal', 'jungle', 'hard'];

// ---------------------------------------------------------------- RNG

export function createRng(seed) {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(list, rng) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function pick(list, rng) {
    return list[Math.floor(rng() * list.length)];
}

// --------------------------------------------------------- подготовка слов

export function prepareDictionary(words) {
    const seen = new Set();
    const list = [];

    words.forEach(raw => {
        const word = String(raw || '').toUpperCase().replace(/Ё/g, 'Е').trim();
        if (!/^[А-Я]+$/.test(word)) return;
        if (word.length < 3) return;
        if (seen.has(word)) return;
        seen.add(word);
        list.push(word);
    });

    return list;
}

function countLetters(word) {
    const map = new Map();
    for (const letter of word) map.set(letter, (map.get(letter) || 0) + 1);
    return map;
}

function fits(word, keyCounts) {
    const counts = countLetters(word);
    for (const [letter, need] of counts) {
        if ((keyCounts.get(letter) || 0) < need) return false;
    }
    return true;
}

// --------------------------------------------------------------- размещение

const DELTA = { H: [0, 1], V: [1, 0] };

/**
 * Проверяет постановку слова. Возвращает число пересечений или null.
 * Правила:
 *  - координаты не отрицательные;
 *  - буквы на пересечениях совпадают;
 *  - слово не ложится целиком на занятые клетки;
 *  - новые клетки не касаются чужих букв сбоку (иначе двухбуквенные склейки);
 *  - слово не продолжает другое слово с торца.
 */
export function canPlace(occ, word, row, col, dir) {
    if (!occ.size) return 0;

    const [dr, dc] = DELTA[dir];
    let crossings = 0;

    // 1. Границы, совпадение букв, боковые соседи у новых клеток
    for (let i = 0; i < word.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        const key = `${r},${c}`;
        const existing = occ.get(key);

        if (existing) {
            if (existing !== word[i]) return null;
            crossings++;
            continue;
        }

        const sides = dir === 'H'
            ? [[1, 0], [-1, 0]]
            : [[0, 1], [0, -1]];

        for (const [sr, sc] of sides) {
            if (occ.has(`${r + sr},${c + sc}`)) return null;
        }
    }

    if (crossings === 0) return null;              // нужно пересечение
    if (crossings === word.length) return null;    // слово уже стоит целиком

    // 2. Не продолжаем другое слово с торца
    if (occ.has(`${row - dr},${col - dc}`)) return null;
    const endRow = row + dr * word.length;
    const endCol = col + dc * word.length;
    if (occ.has(`${endRow},${endCol}`)) return null;

    return crossings;
}

function place(occ, word, row, col, dir) {
    const [dr, dc] = DELTA[dir];
    for (let i = 0; i < word.length; i++) {
        occ.set(`${row + dr * i},${col + dc * i}`, word[i]);
    }
}

function boardBounds(occ) {
    let minRow = Infinity;
    let minCol = Infinity;
    let maxRow = -Infinity;
    let maxCol = -Infinity;

    for (const key of occ.keys()) {
        const [row, col] = key.split(',').map(Number);
        if (row < minRow) minRow = row;
        if (col < minCol) minCol = col;
        if (row > maxRow) maxRow = row;
        if (col > maxCol) maxCol = col;
    }

    return { minRow, minCol, maxRow, maxCol, rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 };
}

/**
 * Ищет все допустимые постановки слова на текущей доске.
 * score учитывает компактность: меньшая площадь лучше.
 */
function findPlacements(occ, word) {
    const result = [];
    if (!occ.size) {
        result.push({ row: 0, col: 0, dir: 'H', crossings: 0 });
        return result;
    }

    const bounds = boardBounds(occ);
    const occupied = [...occ.entries()];

    for (const [key, letter] of occupied) {
        const [orow, ocol] = key.split(',').map(Number);

        for (let i = 0; i < word.length; i++) {
            if (word[i] !== letter) continue;

            for (const dir of ['H', 'V']) {
                const [dr, dc] = DELTA[dir];
                const row = orow - dr * i;
                const col = ocol - dc * i;

                const crossings = canPlace(occ, word, row, col, dir);
                if (crossings === null) continue;

                const endRow = row + dr * (word.length - 1);
                const endCol = col + dc * (word.length - 1);
                const minRow = Math.min(bounds.minRow, row, endRow);
                const minCol = Math.min(bounds.minCol, col, endCol);
                const maxRow = Math.max(bounds.maxRow, row, endRow);
                const maxCol = Math.max(bounds.maxCol, col, endCol);
                const rows = maxRow - minRow + 1;
                const cols = maxCol - minCol + 1;
                if (rows > 7 || cols > 7) continue;

                result.push({
                    row, col, dir, crossings,
                    area: rows * cols,
                    rows, cols
                });
            }
        }
    }

    return result;
}

// --------------------------------------------------------------- валидация

function collectRuns(occ) {
    const cells = new Map();
    for (const [key, letter] of occ) {
        const [row, col] = key.split(',').map(Number);
        cells.set(`${row},${col}`, letter);
    }

    const runs = [];
    const seen = new Set();

    for (const key of cells.keys()) {
        const [row, col] = key.split(',').map(Number);

        for (const [dir, [dr, dc]] of [['H', [0, 1]], ['V', [1, 0]]]) {
            // Начало слова: предыдущая клетка в этом направлении пустая
            if (cells.has(`${row - dr},${col - dc}`)) continue;
            const runKey = `${dir}:${row},${col}`;
            if (seen.has(runKey)) continue;
            seen.add(runKey);

            let word = '';
            let r = row;
            let c = col;
            while (cells.has(`${r},${c}`)) {
                word += cells.get(`${r},${c}`);
                r += dr;
                c += dc;
            }

            if (word.length >= 2) runs.push({ word, dir, row, col });
        }
    }

    return runs;
}

/**
 * Полная проверка уровня.
 * Возвращает { ok, errors, warnings, stats }.
 */
export function validateLevel(level, dictionary) {
    const errors = [];
    const warnings = [];
    const grid = Array.isArray(level.grid) ? level.grid : [];
    const words = Array.isArray(level.words) ? level.words : [];
    const bonus = Array.isArray(level.bonusWords) ? level.bonusWords : [];
    const keyWord = String(level.keyWord || '');

    if (!keyWord) errors.push('нет keyWord');
    if (keyWord && !dictionary.includes(keyWord)) errors.push(`keyWord «${keyWord}» отсутствует в словаре`);
    if (!THEMES.includes(level.theme)) errors.push(`неизвестная тема «${level.theme}»`);

    // 1. Координаты и пересечения
    const occ = new Map();
    const placedWords = new Set();
    let intersections = 0;

    grid.forEach((entry, index) => {
        const word = String(entry.word || '');
        const dir = entry.dir || (entry.direction === 'vertical' ? 'V' : entry.direction === 'horizontal' ? 'H' : '');
        if (!/^[А-Я]{3,}$/.test(word)) errors.push(`слово #${index} некорректно: «${word}»`);
        if (!dictionary.includes(word)) errors.push(`слово «${word}» отсутствует в словаре`);
        if (dir !== 'H' && dir !== 'V') errors.push(`слово «${word}»: неверное направление «${entry.dir}»`);
        if (!Number.isInteger(entry.row) || !Number.isInteger(entry.col)) {
            errors.push(`слово «${word}»: координаты должны быть целыми`);
            return;
        }
        if (entry.row < 0 || entry.col < 0) errors.push(`слово «${word}»: отрицательные координаты (${entry.row},${entry.col})`);
        if (placedWords.has(word)) errors.push(`слово «${word}» продублировано в сетке`);
        placedWords.add(word);

        const [dr, dc] = DELTA[dir];
        for (let i = 0; i < word.length; i++) {
            const row = entry.row + dr * i;
            const col = entry.col + dc * i;
            const cellKey = `${row},${col}`;
            const existing = occ.get(cellKey);
            if (existing && existing !== word[i]) {
                errors.push(`конфликт букв в (${row},${col}): «${existing}» и «${word[i]}»`);
            }
            occ.set(cellKey, word[i]);
        }
    });

    // 2. Совпадение words и grid
    const gridWords = grid.map(entry => String(entry.word || ''));
    const missingInWords = gridWords.filter(word => !words.includes(word));
    const missingInGrid = words.filter(word => !gridWords.includes(word));
    if (missingInWords.length) errors.push(`слова grid отсутствуют в words: ${missingInWords.join(', ')}`);
    if (missingInGrid.length) errors.push(`слова words отсутствуют в grid: ${missingInGrid.join(', ')}`);

    // 3. Нет двухбуквенных склеек: каждый горизонтальный/вертикальный ряд — это объявленное слово
    const declared = new Set(gridWords);
    const runs = collectRuns(occ);
    runs.forEach(run => {
        if (!declared.has(run.word)) {
            errors.push(`посторонняя склейка «${run.word}» (${run.dir}, ${run.row},${run.col})`);
        }
    });

    // 4. Каждое слово из words присутствует на доске целиком
    gridWords.forEach(word => {
        if (!runs.some(run => run.word === word)) {
            errors.push(`слово «${word}» не читается на доске целиком`);
        }
    });

    // 5. Пересечения: минимум одно у каждого слова, кроме первого
    grid.forEach((entry, index) => {
        const word = String(entry.word || '');
        const dir = entry.dir || 'H';
        const [dr, dc] = DELTA[dir];
        let crosses = 0;
        for (let i = 0; i < word.length; i++) {
            const row = entry.row + dr * i;
            const col = entry.col + dc * i;
            for (const [otherWord, other] of grid.entries()) {
                if (otherWord === index) continue;
                if (other.word !== word) {
                    const odir = other.dir || 'H';
                    const [odr, odc] = DELTA[odir];
                    for (let j = 0; j < other.word.length; j++) {
                        if (other.row + odr * j === row && other.col + odc * j === col) crosses++;
                    }
                }
            }
        }
        if (index > 0 && crosses === 0) errors.push(`слово «${word}» не пересекается с сеткой`);
    });
    intersections = Math.max(0, runs.length - 1);

    // 6. Колесо: все слова собираются из букв ключа (уникальные буквы)
    const wheel = new Set(keyWord.split(''));
    gridWords.concat(bonus).forEach(word => {
        for (const letter of word) {
            if (!wheel.has(letter)) errors.push(`буква «${letter}» слова «${word}» отсутствует на колесе`);
        }
    });

    // 7. Бонусные слова
    const bonusSeen = new Set();
    bonus.forEach(word => {
        if (!dictionary.includes(word)) errors.push(`бонусное слово «${word}» отсутствует в словаре`);
        if (bonusSeen.has(word)) errors.push(`бонусное слово «${word}» продублировано`);
        if (declared.has(word)) errors.push(`бонусное слово «${word}» уже есть в сетке`);
        bonusSeen.add(word);
    });
    if (bonus.length < 3 || bonus.length > 8) warnings.push(`бонусных слов ${bonus.length}, ожидалось 3–8`);

    // 8. Монетные ячейки
    const coinCells = Array.isArray(level.coinCells) ? level.coinCells : [];
    const coinSeen = new Set();
    if (coinCells.length < 1 || coinCells.length > 3) {
        warnings.push(`монетных ячеек ${coinCells.length}, ожидалось 1–3`);
    }
    coinCells.forEach(cell => {
        const row = Number(cell && cell.row);
        const col = Number(cell && cell.col);
        const key = `${row},${col}`;
        if (!Number.isInteger(row) || !Number.isInteger(col)) {
            errors.push('монетная ячейка: координаты должны быть целыми');
            return;
        }
        if (!occ.has(key)) errors.push(`монетная ячейка (${row},${col}) вне сетки`);
        if (![10, 20, 30].includes(cell.value)) errors.push(`монетная ячейка (${row},${col}): недопустимое значение ${cell.value}`);
        if (coinSeen.has(key)) errors.push(`монетная ячейка (${row},${col}) продублирована`);
        coinSeen.add(key);
    });

    // 9. Габариты
    const bounds = occ.size ? boardBounds(occ) : { rows: 0, cols: 0 };
    if (bounds.rows > 8 || bounds.cols > 8) warnings.push(`крупная сетка ${bounds.cols}×${bounds.rows}`);
    if (bounds.minRow < 0 || bounds.minCol < 0) errors.push('после построения остались отрицательные координаты');

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        stats: {
            keyWord,
            words: gridWords.length,
            bonusWords: bonus.length,
            intersections,
            rows: bounds.rows,
            cols: bounds.cols,
            cells: occ.size,
            coinCells: coinCells.length
        }
    };
}

// --------------------------------------------------------------- монетные ячейки

// Сколько ячеек и по сколько монет за уровень: 1–5 → 1×10, 6–10 → 2×20, 11–15 → 3×30
export function coinCellRule(levelNumber) {
    const band = Math.min(2, Math.floor((Math.max(1, levelNumber) - 1) / 5));
    return { count: band + 1, value: 10 * (band + 1) };
}

function cellWordCounts(level) {
    const map = new Map();

    (level.grid || []).forEach(entry => {
        const word = String(entry.word || '');
        const dir = entry.dir || (entry.direction === 'vertical' ? 'V' : 'H');
        const [dr, dc] = DELTA[dir];

        for (let i = 0; i < word.length; i++) {
            const key = `${entry.row + dr * i},${entry.col + dc * i}`;
            if (!map.has(key)) map.set(key, new Set());
            map.get(key).add(word);
        }
    });

    return map;
}

/**
 * Детерминированно выбирает монетные ячейки: сначала пересечения,
 * затем одиночные клетки; соседние ячейки не берём, если есть выбор.
 */
export function pickCoinCells(level, levelNumber = 1) {
    const { count, value } = coinCellRule(levelNumber);
    const map = cellWordCounts(level);

    const cells = [...map.entries()]
        .map(([key, words]) => {
            const [row, col] = key.split(',').map(Number);
            return { row, col, count: words.size };
        })
        .sort((a, b) => b.count - a.count || a.row - b.row || a.col - b.col);

    const picked = [];

    for (const minDist of [2, 1]) {
        for (const cell of cells) {
            if (picked.length >= count) break;
            const spaced = picked.every(other =>
                Math.abs(other.row - cell.row) >= minDist ||
                Math.abs(other.col - cell.col) >= minDist
            );
            if (spaced) picked.push(cell);
        }
        if (picked.length >= count) break;
    }

    return picked.map(cell => ({ row: cell.row, col: cell.col, value }));
}

export function assignCoinCells(level, levelNumber = 1) {
    level.coinCells = pickCoinCells(level, levelNumber);
    return level;
}

// --------------------------------------------------------------- генерация

function buildBoard(candidates, targetWords, rng) {
    const firstPool = candidates.filter(word => word.length >= 4);
    if (firstPool.length === 0) return null;

    const first = pick(firstPool, rng);
    const occ = new Map();
    place(occ, first, 0, 0, 'H');

    const placements = [{ word: first, row: 0, col: 0, dir: 'H' }];
    const used = [first];
    const usedSet = new Set(used);
    let intersections = 0;

    while (used.length < targetWords) {
        const available = candidates.filter(word => !usedSet.has(word));
        if (available.length === 0) break;

        const options = [];
        for (const word of available) {
            const found = findPlacements(occ, word);
            for (const placement of found) {
                // Компактность + поощрение пересечений + немного шума
                const score = placement.crossings * 12
                    - placement.area * 0.6
                    - Math.max(placement.rows, placement.cols) * 0.8
                    + rng() * 2.5;
                options.push({ word, placement, score });
            }
        }

        if (options.length === 0) break;

        options.sort((a, b) => b.score - a.score);
        const choice = options[Math.floor(rng() * Math.min(4, options.length))];

        place(occ, choice.word, choice.placement.row, choice.placement.col, choice.placement.dir);
        intersections += choice.placement.crossings;
        placements.push({
            word: choice.word,
            row: choice.placement.row,
            col: choice.placement.col,
            dir: choice.placement.dir
        });
        used.push(choice.word);
        usedSet.add(choice.word);
    }

    return { occ, placements, words: used, intersections };
}

function normalizeBoard(occ, placements) {
    const bounds = boardBounds(occ);
    const normalized = new Map();
    for (const [key, letter] of occ) {
        const [row, col] = key.split(',').map(Number);
        normalized.set(`${row - bounds.minRow},${col - bounds.minCol}`, letter);
    }

    const grid = placements.map(entry => ({
        word: entry.word,
        row: entry.row - bounds.minRow,
        col: entry.col - bounds.minCol,
        dir: entry.dir
    }));

    return { occ: normalized, grid };
}

function selectBonusWords(keyWord, keyCounts, exclude, dictionary, limit, rng) {
    const pool = dictionary.filter(word =>
        word.length >= 3 &&
        word !== keyWord &&
        !exclude.has(word) &&
        fits(word, keyCounts)
    );

    const unique = [...new Set(pool)];
    unique.sort((a, b) => b.length - a.length || a.localeCompare(b));

    // Немного перемешиваем, чтобы бонусы не были всегда самыми длинными
    const head = unique.slice(0, Math.min(unique.length, limit * 4));
    const rest = unique.slice(limit * 4);
    const shuffled = shuffle(head, rng);

    return shuffled.slice(0, limit).concat(rest.slice(0, Math.max(0, limit - shuffled.length)));
}

export function generateLevel(keyWord, dictionary, options = {}) {
    const {
        theme = 'jungle',
        targetWords = 5,
        bonusLimit = 8,
        attempts = 500,
        seed = 1
    } = options;

    const keyCounts = countLetters(keyWord);
    const candidates = dictionary.filter(word =>
        word !== keyWord &&
        word.length >= 3 &&
        word.length <= keyWord.length &&
        fits(word, keyCounts)
    );

    if (candidates.length < 3) return null;

    let best = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
        const rng = createRng(seed * 100003 + attempt);
        for (let target = targetWords; target >= 3; target--) {
            const board = buildBoard(candidates, target, rng);
            if (!board) continue;

            const normalized = normalizeBoard(board.occ, board.placements);
            if (normalized.grid.length !== board.words.length) continue;

            const bounds = boardBounds(normalized.occ);
            const area = bounds.rows * bounds.cols;
            const holes = area - normalized.occ.size;
            const score = board.words.length * 10000
                + board.intersections * 200
                - holes * 70
                - Math.max(bounds.rows, bounds.cols) * 12
                - area * 2;

            if (!best || score > best.score) {
                best = { ...normalized, words: board.words, intersections: board.intersections, score, bounds };
            }
            if (board.words.length >= targetWords) break;
        }

        if (best && best.words.length >= targetWords && attempt > 60) break;
    }

    if (!best) return null;

    const bonusRng = createRng(seed * 7919 + keyWord.length);
    const bonusWords = selectBonusWords(
        keyWord, keyCounts, new Set(best.words), dictionary, bonusLimit, bonusRng
    );

    const level = {
        keyWord,
        theme,
        grid: best.grid.map(entry => ({ word: entry.word, row: entry.row, col: entry.col, dir: entry.dir })),
        words: best.words.slice(),
        bonusWords
    };

    assignCoinCells(level, options.levelNumber || 1);

    return { level, stats: { ...best.bounds, intersections: best.intersections, score: best.score } };
}

export function generateEpisode(dictionary, options = {}) {
    const {
        levelCount = 15,
        seed = 20261119,
        theme = 'jungle',
        targetWords = 5,
        bonusLimit = 8
    } = options;

    const keyCounts = new Map();
    dictionary.forEach(word => {
        if (word.length < 6 || word.length > 12) return;
        const counts = countLetters(word);
        const fitsCount = dictionary.filter(other =>
            other !== word && other.length >= 3 && other.length <= word.length && fits(other, counts)
        ).length;
        keyCounts.set(word, fitsCount);
    });

    // Ключи, из которых можно собрать хотя бы 5 слов
    let keys = [...keyCounts.entries()]
        .filter(([, count]) => count >= 5)
        .map(([word, count]) => ({ word, count }));

    // Сложность: короткие ключи — раньше, длинные — позже (15-й = босс)
    keys.sort((a, b) =>
        a.word.length - b.word.length ||
        b.count - a.count ||
        a.word.localeCompare(b.word)
    );

    // Резерв, если ключей с 5 словами не хватит
    const extra = [...keyCounts.entries()]
        .filter(([, count]) => count === 4)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => a.word.length - b.word.length || b.count - a.count || a.word.localeCompare(b.word));

    keys = keys.concat(extra);

    const accepted = [];
    const report = [];

    for (const entry of keys) {
        if (accepted.length >= levelCount) break;

        const generated = generateLevel(entry.word, dictionary, {
            theme,
            targetWords,
            bonusLimit,
            seed: seed + entry.word.length * 31 + entry.word.charCodeAt(0),
            attempts: 900
        });

        if (!generated) {
            report.push({ keyWord: entry.word, ok: false, errors: ['не удалось построить сетку'], warnings: [], stats: {} });
            continue;
        }

        const validation = validateLevel(generated.level, dictionary);
        if (!validation.ok) {
            report.push({ keyWord: entry.word, ...validation, stats: { ...validation.stats, ...generated.stats } });
            continue;
        }

        accepted.push({ level: generated.level, validation, generated });
    }

    // Итоговый порядок: от коротких ключей к длинным, босс — последний
    accepted.sort((a, b) =>
        a.level.keyWord.length - b.level.keyWord.length ||
        b.level.words.length - a.level.words.length ||
        a.level.keyWord.localeCompare(b.level.keyWord)
    );

    const levels = accepted.map(item => item.level);
    levels.forEach((level, index) => assignCoinCells(level, index + 1));

    const finalReport = accepted.map((item, index) => {
        const validation = validateLevel(levels[index], dictionary);

        return {
            level: index + 1,
            keyWord: item.level.keyWord,
            ...validation,
            stats: { ...validation.stats, ...item.generated.stats }
        };
    });

    return {
        levels,
        report: finalReport,
        skipped: report,
        selectedKeys: levels.map(level => level.keyWord)
    };
}

// --------------------------------------------------------------- CLI (Node)

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

if (isNode) {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const here = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(here, '..');
    const wordsPath = path.join(root, 'words.json');
    const outputPath = path.join(root, 'levels.json');

    const words = JSON.parse(await fs.readFile(wordsPath, 'utf8'));
    const dictionary = prepareDictionary(words);
    const result = generateEpisode(dictionary);

    await fs.writeFile(outputPath, JSON.stringify(result.levels, null, 2) + '\n', 'utf8');

    console.log(`Сгенерировано уровней: ${result.levels.length}`);
    console.table(result.report.map(row => ({
        level: row.level,
        key: row.keyWord,
        words: row.stats.words,
        bonus: row.stats.bonusWords,
        size: `${row.stats.cols}×${row.stats.rows}`,
        cells: row.stats.cells,
        ok: row.ok,
        errors: row.errors.length,
        warnings: row.warnings.length
    })));

    const failed = result.report.filter(row => !row.ok);
    if (failed.length) {
        failed.forEach(row => {
            console.error(`\nУровень ${row.level} (${row.keyWord}):`);
            row.errors.forEach(error => console.error(`  ✗ ${error}`));
        });
        process.exitCode = 1;
    } else {
        console.log('\nВсе уровни прошли валидацию.');
    }
}
