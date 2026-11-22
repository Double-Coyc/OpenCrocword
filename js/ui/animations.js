// Визуальные эффекты: перелёт букв, тряска плашки слова.

export function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Летящий глиф от кнопки колеса к ячейке сетки.
 * from/to — DOMRect. Возвращает Promise, который резолвится после анимации.
 */
export function flyLetter({ from, to, letter, delay = 0, duration = 320 }) {
    if (!from || !to || prefersReducedMotion()) {
        return Promise.resolve();
    }

    const target = to.getBoundingClientRect();

    const ghost = document.createElement('span');
    ghost.className = 'fly-letter';
    ghost.textContent = letter;
    ghost.setAttribute('aria-hidden', 'true');

    Object.assign(ghost.style, {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`
    });

    document.body.appendChild(ghost);

    const dx = (target.left + target.width / 2) - (from.left + from.width / 2);
    const dy = (target.top + target.height / 2) - (from.top + from.height / 2);
    const scale = target.width > 0 ? Math.min(1.15, target.width / from.width) : 1;

    const animation = ghost.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 22}px) scale(0.92)`, opacity: 0.95, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.85, offset: 1 }
    ], {
        duration,
        delay,
        easing: 'cubic-bezier(0.25, 0.7, 0.3, 1)',
        fill: 'forwards'
    });

    // animation.finished может не сработать в фоновой вкладке — страхуем таймером
    return new Promise(resolve => {
        let settled = false;

        const done = () => {
            if (settled) return;
            settled = true;
            ghost.remove();
            resolve();
        };

        animation.finished.catch(() => {}).then(done);
        window.setTimeout(done, delay + duration + 120);
    });
}

/**
 * Показывает отклонённое слово на плашке и встряхивает её.
 * Вибрация — только если браузер её поддерживает.
 */
export function shakeWordPreview(word) {
    const preview = document.getElementById('word-preview');

    if (preview) {
        preview.textContent = word;
        preview.classList.add('show');
        preview.classList.remove('shake');
        void preview.offsetWidth;
        preview.classList.add('shake');

        window.setTimeout(() => {
            preview.classList.remove('shake');
            if (preview.textContent === word) preview.classList.remove('show');
        }, 480);
    }

    if (navigator.vibrate) {
        try {
            navigator.vibrate(50);
        } catch (error) {
            // вибрация не критична
        }
    }
}

// Всплывающее «+20» над монетной ячейкой
export function showCoinGain(cell, amount) {
    if (!cell || !amount) return;

    const rect = cell.getBoundingClientRect();
    const label = document.createElement('span');
    label.className = 'coin-gain';
    label.textContent = `+${amount}`;
    label.setAttribute('aria-hidden', 'true');
    label.style.left = `${rect.left + rect.width / 2}px`;
    label.style.top = `${rect.top}px`;

    document.body.appendChild(label);

    window.setTimeout(() => label.remove(), prefersReducedMotion() ? 650 : 1000);
}
