// Колесо с буквами: отрисовка, выбор свайпом, перемешивание.

import { CELL_SIZE, SVG_NS, WHEEL_RADIUS } from '../core/constants.js';
import { state } from '../core/state.js';
import { handleWord } from './words.js';

function ensureWheelSvg() {
    const container = document.getElementById('wheel-container');
    if (!container) return null;

    let svg = document.getElementById('wheel-lines');
    if (!svg) {
        svg = document.createElementNS(SVG_NS, 'svg');
        svg.id = 'wheel-lines';
        container.appendChild(svg);
    }
    return svg;
}

function buttonCenter(button, containerRect) {
    const rect = button.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top
    };
}

function drawWheelLines() {
    const svg = ensureWheelSvg();
    const container = document.getElementById('wheel-container');
    if (!svg || !container) return;

    const containerRect = container.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const points = state.selectedLetters.map(item => buttonCenter(item.button, containerRect));

    if (state.isDragging && state.pointerPreview && points.length > 0) {
        points.push(state.pointerPreview);
    }

    for (let i = 0; i < points.length - 1; i++) {
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('class', 'wheel-line');
        line.setAttribute('x1', points[i].x.toFixed(1));
        line.setAttribute('y1', points[i].y.toFixed(1));
        line.setAttribute('x2', points[i + 1].x.toFixed(1));
        line.setAttribute('y2', points[i + 1].y.toFixed(1));
        svg.appendChild(line);
    }
}

export function renderWheel(letters) {
    const wheelContainer = document.getElementById('wheel-container');
    if (!wheelContainer) {
        console.error('Контейнер #wheel-container не найден!');
        return;
    }

    clearSelection();
    wheelContainer.querySelectorAll('.wheel-letter').forEach(el => el.remove());

    const list = Array.isArray(letters) ? letters : [];
    state.wheelLetters = new Set(list);
    state.wheelLetterList = list.slice();
    if (list.length === 0) return;

    wheelContainer.style.position = 'relative';

    const size = wheelContainer.clientWidth || 250;
    const radius = Math.min(WHEEL_RADIUS, size / 2 - CELL_SIZE / 2 - 5);
    const center = size / 2;
    const angleStep = (Math.PI * 2) / list.length;
    const startAngle = -Math.PI / 2;

    list.forEach((letter, index) => {
        const angle = startAngle + angleStep * index;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wheel-letter';
        button.dataset.letter = letter;
        button.textContent = letter;
        button.style.left = `${center + radius * Math.cos(angle)}px`;
        button.style.top = `${center + radius * Math.sin(angle)}px`;

        button.addEventListener('pointerdown', onLetterPointerDown);
        button.addEventListener('pointerenter', onLetterPointerEnter);

        wheelContainer.appendChild(button);
    });

    ensureWheelSvg();
}

// Перемешивает буквы на колесе (алгоритм Фишера-Йетса)
export function shuffleWheel() {
    if (state.inputLocked) return;
    if (state.wheelLetterList.length < 2) return;

    const list = state.wheelLetterList.slice();

    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }

    renderWheel(list);
    drawWheelLines();
}

// ------------------------------------------------------------ выбор букв

function addLetterToSelection(button) {
    if (!button || !button.dataset.letter) return;

    state.selectedLetters.push({ letter: button.dataset.letter, button });
    button.classList.add('active');
    drawWheelLines();
    updateWordPreview();
}

// Плашка набираемого слова над колесом
function updateWordPreview() {
    const preview = document.getElementById('word-preview');
    if (!preview) return;

    const word = state.selectedLetters.map(item => item.letter).join('');

    if (word) {
        preview.textContent = word;
        preview.classList.remove('shake');
        preview.classList.add('show');
    } else {
        preview.textContent = '';
        preview.classList.remove('show');
    }
}

// Добавляет букву только при переходе на другую кнопку
function updateHoveredButton(button) {
    if (button === state.hoveredButton) return;
    state.hoveredButton = button;

    if (button && state.isDragging) {
        addLetterToSelection(button);
    }
}

export function clearSelection() {
    state.selectedLetters.forEach(item => item.button.classList.remove('active'));
    state.selectedLetters = [];
    state.isDragging = false;
    state.pointerPreview = null;
    state.hoveredButton = null;
    drawWheelLines();
    updateWordPreview();
}

function onLetterPointerDown(event) {
    if (state.inputLocked) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();

    clearSelection();
    state.isDragging = true;
    state.hoveredButton = event.currentTarget;
    addLetterToSelection(event.currentTarget);
}

function onLetterPointerEnter(event) {
    if (state.inputLocked) return;
    if (!state.isDragging) return;
    updateHoveredButton(event.currentTarget);
}

function onPointerMove(event) {
    if (state.inputLocked) return;
    if (!state.isDragging) return;
    event.preventDefault();

    const container = document.getElementById('wheel-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    state.pointerPreview = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const button = element && element.closest ? element.closest('.wheel-letter') : null;

    updateHoveredButton(button);
    drawWheelLines();
}

function onPointerUp() {
    if (state.inputLocked) return;
    if (!state.isDragging) return;

    // Позиции кнопок нужны для анимации перелёта букв в сетку
    const sources = state.selectedLetters.map(item => ({
        letter: item.letter,
        rect: item.button.getBoundingClientRect()
    }));
    const word = state.selectedLetters.map(item => item.letter).join('');
    clearSelection();

    if (word) handleWord(word, sources);
}

function onPointerCancel() {
    if (state.inputLocked) return;
    if (!state.isDragging) return;
    clearSelection();
}

// Глобальные слушатели подключаются один раз при старте
export function initWheelInput() {
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
}
