import json
import random
from collections import Counter

WORDS_FILE = "words.json"
LEVELS_FILE = "levels.json"
MAX_BUTTONS = 12
MIN_WORDS = 5
MAX_WORDS = 7
MAX_ATTEMPTS = 1000


def load_words(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # ожидаем список строк; фильтруем по длине и алфавиту
    words = set()
    for w in data:
        w = w.strip().upper().replace("Ё", "Е")
        if 3 <= len(w) <= 12 and w.isalpha():
            words.add(w)
    return words


def can_build(word, key_counter):
    """Можно ли собрать word из букв ключа (с учётом кратности)."""
    return not (Counter(word) - key_counter)


def find_candidates(key, all_words):
    key_counter = Counter(key)
    return [w for w in all_words if w != key and can_build(w, key_counter)]


def place_word(grid, word, row, col, direction, occupied):
    """Проверяет, можно ли поставить слово. Возвращает новые occupied-клетки или None."""
    cells = []
    for i, ch in enumerate(word):
        r = row + (i if direction == "V" else 0)
        c = col + (i if direction == "H" else 0)
        if (r, c) in occupied:
            if occupied[(r, c)] != ch:
                return None  # конфликт буквы
        cells.append((r, c, ch))
    return cells


def validate_placement(grid, word, row, col, direction, occupied):
    """Полная валидация: пересечения, запрет склейки, запрет параллельного соседства."""
    cells = place_word(grid, word, row, col, direction, occupied)
    if cells is None:
        return None

    new_cells = [(r, c, ch) for r, c, ch in cells if (r, c) not in occupied]
    if not new_cells:
        return None  # слово целиком наложилось — не считаем

    # минимум одно пересечение с уже стоящими словами (кроме первого)
    if occupied:
        intersects = any((r, c) in occupied for r, c, _ in cells)
        if not intersects:
            return None

    # проверка соседей: запрет склейки и параллельного соседства
    for r, c, ch in cells:
        for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nr, nc = r + dr, c + dc
            if (nr, nc) in occupied and (nr, nc) not in [(x, y) for x, y, _ in cells]:
                # соседняя занятая клетка не из этого слова
                # если она не на линии слова — это склейка/соседство
                if direction == "H" and dc != 0:
                    return None
                if direction == "V" and dr != 0:
                    return None
    return cells


def build_grid(words):
    """Пытается собрать валидную сетку из слов. Возвращает grid или None."""
    random.shuffle(words)
    grid = []
    occupied = {}

    first = words[0]
    direction = random.choice(["H", "V"])
    row, col = 0, 0
    cells = [(row + (i if direction == "V" else 0),
              col + (i if direction == "H" else 0), ch)
             for i, ch in enumerate(first)]
    for r, c, ch in cells:
        occupied[(r, c)] = ch
    grid.append({"word": first, "row": row, "col": col, "dir": direction})

    for word in words[1:]:
        placed = False
        for attempt in range(200):
            # ищем точку пересечения с уже стоящими словами
            anchor = random.choice(list(occupied.items()))
            (ar, ac), ach = anchor
            if ach not in word:
                continue
            idx = word.index(ach)
            d = random.choice(["H", "V"])
            if d == "H":
                r, c = ar, ac - idx
            else:
                r, c = ar - idx, ac
            cells = validate_placement(grid, word, r, c, d, occupied)
            if cells:
                for rr, cc, ch in cells:
                    occupied[(rr, cc)] = ch
                grid.append({"word": word, "row": r, "col": c, "dir": d})
                placed = True
                break
        if not placed:
            return None
    return grid


def generate_level(key, all_words):
    if len(key) > MAX_BUTTONS:
        return None
    candidates = find_candidates(key, all_words)
    if len(candidates) < MIN_WORDS:
        return None
    for _ in range(MAX_ATTEMPTS):
        sample = random.sample(candidates, min(len(candidates), random.randint(MIN_WORDS, MAX_WORDS)))
        grid = build_grid(sample)
        if grid:
            grid_words = {g["word"] for g in grid}
            bonus = [w for w in candidates if w not in grid_words]
            return {
                "keyWord": key,
                "grid": grid,
                "words": list(grid_words),
                "bonusWords": bonus,
            }
    return None


def main():
    all_words = load_words(WORDS_FILE)
    keys = [w for w in all_words if 6 <= len(w) <= MAX_BUTTONS]
    random.shuffle(keys)
    levels = []
    for key in keys:
        lvl = generate_level(key, all_words)
        if lvl:
            levels.append(lvl)
        if len(levels) >= 20:
            break
    with open(LEVELS_FILE, "w", encoding="utf-8") as f:
        json.dump(levels, f, ensure_ascii=False, indent=2)
    print(f"Сгенерировано уровней: {len(levels)}")


if __name__ == "__main__":
    main()