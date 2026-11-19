// Оверлей завершения уровня: персонаж, конфетти, награда, переход дальше.

import { EPISODE_TITLE } from '../core/constants.js';

const CROC_SVG = `
<svg viewBox="0 0 160 160" role="img" aria-label="Профессор Крок">
  <ellipse cx="80" cy="148" rx="46" ry="8" fill="rgba(35,77,30,0.18)"/>
  <path d="M34 66c0-22 20-36 46-36s46 14 46 36v30c0 20-18 34-46 34s-46-14-46-34z" fill="#6fbf4a" stroke="#3f7a2f" stroke-width="4"/>
  <path d="M43 88c0-9 9-14 20-14h34c11 0 20 5 20 14v16c0 12-12 20-37 20s-37-8-37-20z" fill="#88d45f" stroke="#3f7a2f" stroke-width="4"/>
  <circle cx="58" cy="88" r="4" fill="#2f5d24"/>
  <circle cx="102" cy="88" r="4" fill="#2f5d24"/>
  <path d="M52 108h56" stroke="#2f5d24" stroke-width="4" stroke-linecap="round"/>
  <path d="M60 108l4 7 4-7M74 108l4 7 4-7M88 108l4 7 4-7M102 108l4 7 4-7" fill="none" stroke="#fffdf2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="58" cy="63" r="15" fill="#fffdf2" stroke="#2f5d24" stroke-width="3"/>
  <circle cx="102" cy="63" r="15" fill="#fffdf2" stroke="#2f5d24" stroke-width="3"/>
  <circle cx="60" cy="64" r="6" fill="#2f3b2a"/>
  <circle cx="100" cy="64" r="6" fill="#2f3b2a"/>
  <circle cx="62" cy="61" r="2" fill="#fffdf2"/>
  <circle cx="102" cy="61" r="2" fill="#fffdf2"/>
  <path d="M73 63h14" stroke="#2f5d24" stroke-width="3" stroke-linecap="round"/>
  <path d="M80 15l52 20-52 20-52-20z" fill="#2f4f2f" stroke="#1f3a1f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M52 40v14c0 6 8 11 28 11s28-5 28-11V40" fill="none" stroke="#1f3a1f" stroke-width="4"/>
  <path d="M132 37v20" stroke="#f5b301" stroke-width="4" stroke-linecap="round"/>
  <circle cx="132" cy="60" r="5" fill="#f5b301"/>
</svg>`;

const CONFETTI_COLORS = ['#ffd166', '#f6b73c', '#7ed957', '#4caf50', '#ff8a65', '#64b5f6', '#fff176', '#f06292'];

const state = {
    nextLevel: null,
    actions: { onNext: null, onMenu: null },
    wired: false
};

function coinWord(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'монета';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'монеты';
    return 'монет';
}

function spawnConfetti(container) {
    container.innerHTML = '';

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 48; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';

        const width = 6 + Math.random() * 5;
        const height = 10 + Math.random() * 8;

        piece.style.left = `${Math.random() * 100}%`;
        piece.style.width = `${width.toFixed(1)}px`;
        piece.style.height = `${height.toFixed(1)}px`;
        piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        piece.style.animationDelay = `${(Math.random() * 0.7).toFixed(2)}s`;
        piece.style.animationDuration = `${(1.8 + Math.random() * 1.3).toFixed(2)}s`;
        piece.style.setProperty('--drift', `${(Math.random() * 160 - 80).toFixed(0)}px`);
        piece.style.setProperty('--spin', `${Math.round(360 + Math.random() * 720)}deg`);

        fragment.appendChild(piece);
    }

    container.appendChild(fragment);
}

function wireButtonsOnce() {
    if (state.wired) return;
    state.wired = true;

    const nextButton = document.getElementById('btn-next-level');
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const target = state.nextLevel;
            hideLevelComplete();
            if (target && state.actions.onNext) state.actions.onNext(target);
        });
    }

    const menuButton = document.getElementById('btn-to-menu');
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            hideLevelComplete();
            if (state.actions.onMenu) state.actions.onMenu();
        });
    }
}

export function initLevelComplete(actions = {}) {
    state.actions.onNext = actions.onNext || null;
    state.actions.onMenu = actions.onMenu || null;
    wireButtonsOnce();
}

export function showLevelComplete({ levelNumber, reward, nextLevel = null }) {
    const overlay = document.getElementById('level-complete');
    if (!overlay) return;

    state.nextLevel = nextLevel;

    const title = document.getElementById('lc-title');
    if (title) {
        title.textContent = nextLevel ? `Уровень ${levelNumber} пройден!` : 'Эпизод пройден!';
    }

    const subtitle = document.getElementById('lc-subtitle');
    if (subtitle) subtitle.textContent = EPISODE_TITLE;

    const amount = document.getElementById('lc-reward');
    if (amount) amount.textContent = String(reward);

    const unit = document.getElementById('lc-reward-unit');
    if (unit) unit.textContent = coinWord(reward);

    const croc = document.getElementById('lc-croc');
    if (croc && !croc.firstChild) croc.innerHTML = CROC_SVG;

    const nextButton = document.getElementById('btn-next-level');
    if (nextButton) nextButton.hidden = !nextLevel;

    const confetti = document.getElementById('lc-confetti');
    if (confetti) spawnConfetti(confetti);

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('level-complete-open');

    const focusTarget = nextLevel ? nextButton : document.getElementById('btn-to-menu');
    if (focusTarget) {
        window.setTimeout(() => focusTarget.focus(), 50);
    }
}

export function hideLevelComplete() {
    const overlay = document.getElementById('level-complete');
    if (!overlay) return;

    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('level-complete-open');
    state.nextLevel = null;

    const confetti = document.getElementById('lc-confetti');
    if (confetti) confetti.innerHTML = '';
}
