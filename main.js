(() => {
  'use strict';

  const CONFIG = Object.freeze({
    togetherSince: '2023-02-08T00:00:00+03:00',
    letterUnlocksAt: '2026-08-02T00:00:00+03:00',
    secretPassword: 'vesilem',
    midyat: { latitude: 37.419, longitude: 41.339, utcOffsetMinutes: 180 },
    audio: {
      bookOpen: 'assets/audio/book-open.mp3',
      pageTurn: 'assets/audio/page-turn.mp3'
    }
  });

  const KEYS = Object.freeze({
    visited: 'yv-memory-book:visited-pages',
    currentPage: 'yv-memory-book:current-page',
    sound: 'yv-memory-book:sound-enabled',
    eggFound: 'yv-memory-book:egg-found',
    letterRead: 'yv-memory-book:letter-read',
    completed: 'yv-memory-book:completed',
    memoryDate: 'yv-memory-book:future-memory-date',
    memoryDateAsked: 'yv-memory-book:future-memory-asked',
    futureMessageShown: 'yv-memory-book:future-message-shown'
  });

  const lockedEnvelopeMessages = [
    'Sabırsız kalp tespit edildi! 💜',
    'Bu sır biraz daha uyumalı…',
    'Zaman makinesi henüz hazır değil.',
    'Olmaz güzelim, takvim seni izliyor.',
    'Zarf mühürlü; öpücük bile açamadı.',
    'Biraz daha sabır… En güzel sırlar beklemeye değer.',
    'Mühür fısıldadı: “Henüz değil.”',
    'Takvim yaprakları biraz daha çevrilmeli.'
  ];

  const wrongPasswordMessages = [
    'Ay başını salladı… Bu değildi.',
    'Kalp kilidi hâlâ kapalı. Bir daha fısılda.',
    'Yıldızlar bu şifreyi tanımadı.',
    'İpucu: Bu hikâyenin en güzel kızı. 💙'
  ];

  const themeNames = {
    sunrise: 'Midyat’ta gün doğumu',
    morning: 'Midyat’ta sabah',
    noon: 'Midyat’ta öğlen',
    sunset: 'Midyat’ta gün batımı',
    night: 'Midyat’ta gece'
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGE_TURN_MOTION = Object.freeze({
    mobileDuration: 600,
    desktopDuration: 780,
    easing: 'cubic-bezier(.36,.02,.18,1)'
  });

  const storage = {
    get(key, fallback = null) {
      try {
        const value = window.localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch {
        // The site remains functional when private browsing blocks storage.
      }
    }
  };

  const safeJsonArray = (value) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const elements = {
    loadingScreen: $('#loadingScreen'),
    loadingBar: $('#loadingBar'),
    loadingStatus: $('#loadingStatus'),
    loadingRetry: $('#loadingRetry'),
    introScreen: $('#introScreen'),
    openBookButton: $('#openBookButton'),
    app: $('#memoryApp'),
    bookShell: $('#bookShell'),
    bookPages: $('#bookPages'),
    pages: $$('.book-page'),
    prevPage: $('#prevPage'),
    nextPage: $('#nextPage'),
    pageProgress: $('#pageProgress'),
    pageAnnouncement: $('#pageAnnouncement'),
    bookmark: $('.bookmark'),
    petalLayer: $('#petalLayer'),
    themeLabel: $('#themeLabel'),
    moonButton: $('#moonButton'),
    soundToggle: $('#soundToggle'),
    soundLabel: $('.sound-label'),
    backgroundMusic: $('#backgroundMusic'),
    togetherCounter: $('#togetherCounter'),
    letterCountdown: $('#letterCountdown'),
    envelopeButton: $('#envelopeButton'),
    envelopeStatus: $('#envelopeStatus'),
    memoryDateDialog: $('#memoryDateDialog'),
    memoryDateForm: $('#memoryDateForm'),
    memoryDateInput: $('#memoryDateInput'),
    futureMessageDialog: $('#futureMessageDialog'),
    secretDialog: $('#secretDialog'),
    secretForm: $('#secretForm'),
    secretInput: $('#secretInput'),
    secretMessage: $('#secretMessage'),
    secretPhotoDialog: $('#secretPhotoDialog'),
    openMemorySlider: $('#openMemorySlider'),
    memorySliderDialog: $('#memorySliderDialog'),
    memorySliderViewport: $('#memorySliderViewport'),
    memorySliderPrev: $('#memorySliderPrev'),
    memorySliderNext: $('#memorySliderNext'),
    memorySliderDots: $('#memorySliderDots'),
    memorySliderStatus: $('#memorySliderStatus'),
    memorySlides: $$('[data-memory-slide]'),
    memorySliderBackgrounds: $$('.memory-slider-backdrop img'),
    letterDialog: $('#letterDialog'),
    markLetterRead: $('#markLetterRead'),
    completionBadge: $('#completionBadge'),
    completionTitle: $('#completionTitle'),
    completionText: $('#completionText'),
    completionProgress: $('#completionProgress'),
    toastRegion: $('#toastRegion')
  };

  const contentPages = elements.pages.filter((page) => page.dataset.decorative !== 'true');
  const lastContentIndex = contentPages.length - 1;
  const desktopSpreadQuery = window.matchMedia('(min-width: 900px)');

  const initialPage = Number.parseInt(storage.get(KEYS.currentPage, '0'), 10);
  const state = {
    currentPage: Number.isFinite(initialPage) ? Math.min(Math.max(initialPage, 0), lastContentIndex) : 0,
    visited: new Set(safeJsonArray(storage.get(KEYS.visited, '[]')).filter(Number.isInteger)),
    soundEnabled: storage.get(KEYS.sound, 'true') !== 'false',
    eggFound: storage.get(KEYS.eggFound, 'false') === 'true',
    letterRead: storage.get(KEYS.letterRead, 'false') === 'true',
    completed: storage.get(KEYS.completed, 'false') === 'true',
    isTurning: false,
    isOpening: false,
    isOpen: false,
    envelopeUnlocked: false,
    lastLockedMessage: -1,
    lastWrongPassword: -1,
    pointerStart: null,
    activeTurnSheet: null,
    activeTurnAnimation: null,
    activeTurnWatchdog: null,
    activePetalDropTimer: null,
    layoutRefreshTimer: null,
    bookmarkResetTimer: null,
    memorySlide: 0,
    memoryBackdropLayer: 0,
    memoryPointerStart: null,
    memoryIgnoreClickUntil: 0
  };

  const audio = {
    bookOpen: new Audio(CONFIG.audio.bookOpen),
    pageTurn: new Audio(CONFIG.audio.pageTurn),
    backgroundMusic: elements.backgroundMusic
  };
  const soundEffects = [audio.bookOpen, audio.pageTurn];
  const turnFaceCache = new Map();

  soundEffects.forEach((item) => {
    item.preload = 'auto';
    item.volume = 0.48;
  });
  audio.pageTurn.volume = 0.34;
  if (audio.backgroundMusic) audio.backgroundMusic.volume = 0.18;

  function playSound(sound) {
    if (!state.soundEnabled || !sound) return;
    try {
      sound.pause();
      sound.currentTime = 0;
      const playAttempt = sound.play();
      if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {});
    } catch {
      // Sound is a progressive enhancement; page interaction must never stop.
    }
  }

  function playBackgroundMusic() {
    if (!state.soundEnabled || (!state.isOpen && !state.isOpening) || !audio.backgroundMusic) return;
    try {
      const playAttempt = audio.backgroundMusic.play();
      if (playAttempt && typeof playAttempt.catch === 'function') playAttempt.catch(() => {});
    } catch {
      // Autoplay restrictions must never interrupt the book interaction.
    }
  }

  function warmPageTurnSound() {
    if (!state.soundEnabled || audio.pageTurn.dataset.warmed === 'true') return;
    const previousMuted = audio.pageTurn.muted;
    audio.pageTurn.muted = true;
    try {
      const warmAttempt = audio.pageTurn.play();
      if (warmAttempt && typeof warmAttempt.then === 'function') {
        warmAttempt.then(() => {
          audio.pageTurn.pause();
          audio.pageTurn.currentTime = 0;
          audio.pageTurn.muted = previousMuted;
          audio.pageTurn.dataset.warmed = 'true';
        }).catch(() => { audio.pageTurn.muted = previousMuted; });
      }
    } catch {
      audio.pageTurn.muted = previousMuted;
    }
  }

  function setSound(enabled) {
    state.soundEnabled = enabled;
    storage.set(KEYS.sound, String(enabled));
    if (!enabled) {
      soundEffects.forEach((item) => {
        item.pause();
        item.currentTime = 0;
      });
      if (audio.backgroundMusic) audio.backgroundMusic.pause();
    } else {
      playBackgroundMusic();
    }
    elements.soundToggle.setAttribute('aria-pressed', String(enabled));
    elements.soundToggle.setAttribute('aria-label', enabled ? 'Sesleri kapat' : 'Sesleri aç');
    elements.soundLabel.textContent = enabled ? 'Ses açık' : 'Ses kapalı';
    elements.soundToggle.firstElementChild.textContent = enabled ? '♪' : '∕';
  }

  function updateLoadProgress(done, total, label) {
    const percent = Math.max(8, Math.round((done / total) * 100));
    elements.loadingBar.style.width = `${percent}%`;
    if (label) elements.loadingStatus.textContent = label;
  }

  function waitForMedia(media) {
    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        media.removeEventListener('canplaythrough', finish);
        media.removeEventListener('loadedmetadata', finish);
        media.removeEventListener('error', finish);
        resolve();
      };
      media.addEventListener('canplaythrough', finish, { once: true });
      media.addEventListener('loadedmetadata', finish, { once: true });
      media.addEventListener('error', finish, { once: true });
      timeoutId = window.setTimeout(finish, 2300);
      try { media.load(); } catch { finish(); }
    });
  }

  function waitForImage(image) {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve();
      };
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
      timeoutId = window.setTimeout(finish, 2300);
    });
  }

  function finishLoadingScreen() {
    elements.loadingScreen.classList.add('is-done');
    elements.introScreen.hidden = false;
    window.setTimeout(() => {
      if (elements.loadingScreen.classList.contains('is-done')) elements.loadingScreen.hidden = true;
    }, reduceMotion ? 60 : 780);
  }

  async function preloadBook() {
    const preloadImages = $$('img').filter((image) => !image.closest('.memory-slide') || image.loading === 'eager');
    const assets = [...soundEffects, ...preloadImages];
    let done = 0;
    updateLoadProgress(done, assets.length, 'Kâğıt dokusu hazırlanıyor');
    await Promise.all(assets.map(async (asset) => {
      if (asset instanceof HTMLMediaElement) await waitForMedia(asset);
      else await waitForImage(asset);
      done += 1;
      const labels = ['Fotoğraflar yerleştiriliyor', 'Kurutulmuş çiçekler saklanıyor', 'Son sayfa hazırlanıyor'];
      updateLoadProgress(done, assets.length, labels[Math.min(labels.length - 1, Math.floor((done / assets.length) * labels.length))]);
    }));
    updateLoadProgress(assets.length, assets.length, 'Defter hazır 💜');
    window.__memoryBookReady = true;
    window.setTimeout(finishLoadingScreen, reduceMotion ? 30 : 450);
  }

  function buildPageProgress() {
    elements.pageProgress.replaceChildren();
    contentPages.forEach((page, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `${index + 1}. sayfa: ${page.dataset.pageTitle}`);
      button.addEventListener('click', () => goToPage(index));
      elements.pageProgress.appendChild(button);
    });
  }

  function usesDesktopSpread() {
    return desktopSpreadQuery.matches;
  }

  function normalizePageIndex(index) {
    const numericIndex = Number(index);
    const safeIndex = Number.isFinite(numericIndex) ? numericIndex : 0;
    const clamped = Math.min(Math.max(Math.trunc(safeIndex), 0), lastContentIndex);
    return usesDesktopSpread() ? Math.floor(clamped / 2) * 2 : clamped;
  }

  function visiblePageIndexes(index = state.currentPage) {
    const normalized = Math.min(Math.max(index, 0), lastContentIndex);
    if (!usesDesktopSpread()) return [normalized];
    const spreadStart = Math.floor(normalized / 2) * 2;
    return [spreadStart, spreadStart + 1].filter((pageIndex) => pageIndex < elements.pages.length);
  }

  function clearPagePresentation(page) {
    page.classList.remove('is-active', 'is-under', 'slot-left', 'slot-right', 'slot-single', 'turn-source-hidden');
    page.inert = true;
    page.setAttribute('aria-hidden', 'true');
  }

  function applyPageGroup(indexes, className, interactive) {
    indexes.forEach((pageIndex, position) => {
      const page = elements.pages[pageIndex];
      if (!page) return;
      page.classList.add(className, usesDesktopSpread() ? (position === 0 ? 'slot-left' : 'slot-right') : 'slot-single');
      const decorative = page.dataset.decorative === 'true';
      page.inert = !interactive || decorative;
      page.setAttribute('aria-hidden', String(!interactive || decorative));
    });
  }

  function renderPages(activeIndex = state.currentPage) {
    state.currentPage = normalizePageIndex(activeIndex);
    elements.pages.forEach(clearPagePresentation);
    void elements.bookPages.offsetWidth;
    applyPageGroup(visiblePageIndexes(state.currentPage), 'is-active', true);
  }

  function hasHealthyPagePresentation() {
    const expectedIndexes = visiblePageIndexes();
    const activePages = elements.pages.filter((page) => page.classList.contains('is-active'));
    if (activePages.length !== expectedIndexes.length) return false;
    const shellBounds = elements.bookShell.getBoundingClientRect();

    return expectedIndexes.every((pageIndex, position) => {
      const page = elements.pages[pageIndex];
      const expectedSlot = usesDesktopSpread() ? (position === 0 ? 'slot-left' : 'slot-right') : 'slot-single';
      if (!page?.classList.contains('is-active') || !page.classList.contains(expectedSlot)) return false;
      const style = window.getComputedStyle(page);
      const bounds = page.getBoundingClientRect();
      const visibleWidth = Math.min(bounds.right, shellBounds.right) - Math.max(bounds.left, shellBounds.left);
      const visibleHeight = Math.min(bounds.bottom, shellBounds.bottom) - Math.max(bounds.top, shellBounds.top);
      return style.visibility === 'visible' && Number.parseFloat(style.opacity) > .99 && visibleWidth > bounds.width * .8 && visibleHeight > bounds.height * .8;
    });
  }

  function forceMobilePagePaint() {
    if (usesDesktopSpread() || state.isTurning) return;
    visiblePageIndexes().forEach((pageIndex) => {
      const page = elements.pages[pageIndex];
      if (!page?.classList.contains('is-active')) return;
      const content = $('.page-content', page);

      page.style.display = 'none';
      void page.offsetHeight;
      page.style.removeProperty('display');

      if (content) {
        content.style.display = 'none';
        void content.offsetHeight;
        content.style.removeProperty('display');
      }
      void page.offsetHeight;
    });
  }

  function verifyPagePresentation() {
    if (state.isTurning) return;
    if (!hasHealthyPagePresentation()) {
      renderPages();
      updateNavigation();
      forceMobilePagePaint();
    }
  }

  function restoreStablePageView() {
    if (state.activePetalDropTimer !== null) {
      window.clearTimeout(state.activePetalDropTimer);
      state.activePetalDropTimer = null;
    }
    if (state.activeTurnWatchdog !== null) {
      window.clearTimeout(state.activeTurnWatchdog);
      state.activeTurnWatchdog = null;
    }
    if (state.activeTurnAnimation) {
      const animation = state.activeTurnAnimation;
      state.activeTurnAnimation = null;
      try { animation.cancel(); } catch {
        // The stable render below is the fallback when animation cleanup fails.
      }
    }
    if (state.activeTurnSheet) state.activeTurnSheet.remove();
    state.activeTurnSheet = null;
    state.isTurning = false;
    state.pointerStart = null;
    elements.bookPages.classList.remove('is-animating');
    renderPages();
    visitPages(visiblePageIndexes());
    updateNavigation();
    window.requestAnimationFrame(verifyPagePresentation);
  }

  function preparePages() {
    state.currentPage = normalizePageIndex(state.currentPage);
    buildPageProgress();
    renderPages();
    visitPages(visiblePageIndexes());
    updateNavigation();
  }

  function visitPages(indexes) {
    indexes.forEach((index) => {
      if (index >= 0 && index <= lastContentIndex) state.visited.add(index);
    });
    storage.set(KEYS.visited, JSON.stringify([...state.visited]));
    storage.set(KEYS.currentPage, String(state.currentPage));
    updateCompletion();
  }

  function updateNavigation() {
    const currentIndexes = visiblePageIndexes();
    const atStart = state.currentPage === 0;
    const atEnd = currentIndexes.includes(lastContentIndex);
    elements.prevPage.disabled = atStart || state.isTurning;
    elements.nextPage.disabled = atEnd || state.isTurning;
    const dots = $$('button', elements.pageProgress);
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-current', index === state.currentPage);
      dot.classList.toggle('is-in-spread', usesDesktopSpread() && currentIndexes.includes(index));
      dot.classList.toggle('is-visited', state.visited.has(index));
      if (index === state.currentPage) dot.setAttribute('aria-current', 'page');
      else dot.removeAttribute('aria-current');
    });
    const readableIndexes = currentIndexes.filter((index) => index <= lastContentIndex);
    const titles = readableIndexes.map((index) => elements.pages[index].dataset.pageTitle).join(' ve ');
    const lastReadableIndex = readableIndexes[readableIndexes.length - 1];
    const range = readableIndexes.length > 1 ? `${readableIndexes[0] + 1}-${lastReadableIndex + 1}. sayfalar` : `${readableIndexes[0] + 1}. sayfa`;
    elements.pageAnnouncement.textContent = `${range}: ${titles}`;
  }

  function createCachedTurnFace(page) {
    const clone = page.cloneNode(true);
    clone.classList.remove('is-active', 'is-under', 'turn-source-hidden');
    clone.classList.add('turn-face');
    clone.inert = true;
    clone.setAttribute('aria-hidden', 'true');
    $$('[id]', clone).forEach((element) => element.removeAttribute('id'));
    $$('button, input, a, [tabindex]', clone).forEach((element) => {
      element.setAttribute('tabindex', '-1');
      if ('disabled' in element) element.disabled = true;
    });
    return clone;
  }

  function buildTurnFaceCache() {
    elements.pages.forEach((page, index) => turnFaceCache.set(index, createCachedTurnFace(page)));
  }

  function prepareCachedTurnFace(pageIndex, faceClass) {
    const source = elements.pages[pageIndex];
    const face = turnFaceCache.get(pageIndex);
    const sourceClasses = [...source.classList].filter((className) => !['is-active', 'is-under', 'turn-source-hidden'].includes(className));
    face.className = `${sourceClasses.join(' ')} turn-face ${faceClass}`;

    const textSelectors = ['[data-unit]', '.completion-badge h2', '.completion-badge > p:not(.eyebrow)', '.envelope-status'];
    textSelectors.forEach((selector) => {
      const sourceItems = $$(selector, source);
      const faceItems = $$(selector, face);
      sourceItems.forEach((item, index) => {
        if (faceItems[index]) faceItems[index].textContent = item.textContent;
      });
    });

    ['.photo-card', '.completion-badge', '.completion-progress i', '.envelope'].forEach((selector) => {
      const sourceItems = $$(selector, source);
      const faceItems = $$(selector, face);
      sourceItems.forEach((item, index) => {
        if (faceItems[index]) faceItems[index].className = item.className;
      });
    });
    return face;
  }

  function setTurnLayers(currentIndexes, targetIndexes) {
    elements.pages.forEach(clearPagePresentation);
    applyPageGroup(targetIndexes, 'is-under', false);
    applyPageGroup(currentIndexes, 'is-active', true);
  }

  function createTurnSheet(direction, currentIndexes, targetIndexes) {
    const forward = direction > 0;
    const currentSourceIndex = usesDesktopSpread() ? (forward ? currentIndexes[currentIndexes.length - 1] : currentIndexes[0]) : currentIndexes[0];
    const targetRevealIndex = usesDesktopSpread() ? (forward ? targetIndexes[0] : targetIndexes[targetIndexes.length - 1]) : targetIndexes[0];
    const sourcePage = elements.pages[currentSourceIndex];
    const sheet = document.createElement('div');
    sheet.className = `turn-sheet ${forward ? 'turn-forward' : 'turn-backward'}`;
    sheet.setAttribute('aria-hidden', 'true');
    sheet.append(prepareCachedTurnFace(currentSourceIndex, 'turn-front'));
    if (usesDesktopSpread()) sheet.append(prepareCachedTurnFace(targetRevealIndex, 'turn-back'));
    elements.bookPages.appendChild(sheet);
    state.activeTurnSheet = sheet;
    return { sheet, sourcePage };
  }

  function createTurnKeyframes(direction) {
    const sign = direction > 0 ? -1 : 1;
    if (usesDesktopSpread()) {
      const middleAngle = direction > 0 ? 88 : 92;
      return [
        { transform: 'translate3d(0,0,0) rotateY(0deg)', opacity: 1 },
        { transform: `translate3d(0,0,10px) rotateY(${sign * 38}deg)`, opacity: 1, offset: .28 },
        { transform: `translate3d(0,0,20px) rotateY(${sign * middleAngle}deg)`, opacity: 1, offset: .49 },
        { transform: `translate3d(0,0,14px) rotateY(${sign * 136}deg)`, opacity: 1, offset: .74 },
        { transform: `translate3d(0,0,0) rotateY(${sign * 180}deg)`, opacity: 1 }
      ];
    }

    return [
      { transform: 'translate3d(0%,0,0) scaleX(1) skewY(0deg)', opacity: 1 },
      { transform: `translate3d(${sign * 6}%,0,0) scaleX(.985) skewY(${sign * .25}deg)`, opacity: 1, offset: .28 },
      { transform: `translate3d(${sign * 38}%,0,0) scaleX(.965) skewY(${sign * .65}deg)`, opacity: .98, offset: .49 },
      { transform: `translate3d(${sign * 76}%,0,0) scaleX(.98) skewY(${sign * .45}deg)`, opacity: .76, offset: .72 },
      { transform: `translate3d(${sign * 101}%,0,0) scaleX(1) skewY(0deg)`, opacity: .04 }
    ];
  }

  function startTurnMotion(sheet, direction, finish) {
    if (reduceMotion || typeof sheet.animate !== 'function') {
      sheet.classList.add('is-flipping');
      return;
    }

    const duration = usesDesktopSpread() ? PAGE_TURN_MOTION.desktopDuration : PAGE_TURN_MOTION.mobileDuration;
    sheet.classList.add('uses-page-motion', 'is-flipping');
    try {
      const animation = sheet.animate(createTurnKeyframes(direction), {
        duration,
        easing: PAGE_TURN_MOTION.easing,
        fill: 'both'
      });
      state.activeTurnAnimation = animation;
      animation.finished.then(finish, finish);
    } catch {
      sheet.classList.remove('uses-page-motion');
    }
  }

  function finishPageTurn(sheet) {
    if (state.activeTurnSheet !== sheet) return;
    if (state.activePetalDropTimer !== null) {
      window.clearTimeout(state.activePetalDropTimer);
      state.activePetalDropTimer = null;
    }
    if (state.activeTurnWatchdog !== null) {
      window.clearTimeout(state.activeTurnWatchdog);
      state.activeTurnWatchdog = null;
    }
    if (state.activeTurnAnimation) {
      const animation = state.activeTurnAnimation;
      state.activeTurnAnimation = null;
      try { animation.cancel(); } catch {
        // Removing the temporary sheet below still completes the turn safely.
      }
    }
    sheet.remove();
    elements.bookPages.classList.remove('is-animating');
    state.activeTurnSheet = null;
    state.isTurning = false;
    state.pointerStart = null;
    renderPages();
    updateNavigation();
    window.requestAnimationFrame(verifyPagePresentation);
    window.setTimeout(verifyPagePresentation, 180);
  }

  function turnToPage(requestedTarget) {
    if (!state.isOpen || state.isTurning) return;
    const target = normalizePageIndex(requestedTarget);
    if (target === state.currentPage || target < 0 || target > lastContentIndex) return;

    const direction = target > state.currentPage ? 1 : -1;
    const currentIndexes = visiblePageIndexes(state.currentPage);
    const targetIndexes = visiblePageIndexes(target);
    state.isTurning = true;
    elements.bookPages.classList.add('is-animating');
    setTurnLayers(currentIndexes, targetIndexes);

    state.currentPage = target;
    visitPages(targetIndexes);
    updateNavigation();

    const { sheet, sourcePage } = createTurnSheet(direction, currentIndexes, targetIndexes);
    playSound(audio.pageTurn);
    $$('.falling-petal', elements.petalLayer).forEach((petal) => petal.remove());
    state.activePetalDropTimer = window.setTimeout(() => {
      state.activePetalDropTimer = null;
      if (state.activeTurnSheet === sheet && state.isTurning) maybeDropPetals();
    }, usesDesktopSpread() ? 60 : 160);
    swayBookmark();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      finishPageTurn(sheet);
    };
    sheet.addEventListener('transitionend', (event) => {
      if (event.target === sheet && event.propertyName === 'transform') finish();
    });
    sheet.addEventListener('transitioncancel', finish, { once: true });
    const motionDuration = usesDesktopSpread() ? PAGE_TURN_MOTION.desktopDuration : PAGE_TURN_MOTION.mobileDuration;
    state.activeTurnWatchdog = window.setTimeout(finish, reduceMotion ? 90 : motionDuration + 160);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (finished || !state.isTurning || state.activeTurnSheet !== sheet || !sheet.isConnected) return;
        sourcePage.classList.add('turn-source-hidden');
        startTurnMotion(sheet, direction, finish);
      });
    });
  }

  function turnPage(direction) {
    const step = usesDesktopSpread() ? 2 : 1;
    turnToPage(state.currentPage + direction * step);
  }

  function goToPage(target) {
    turnToPage(target);
  }

  function handlePageLayoutChange() {
    state.currentPage = normalizePageIndex(state.currentPage);
    restoreStablePageView();
  }

  function schedulePageLayoutRefresh() {
    window.clearTimeout(state.layoutRefreshTimer);
    state.layoutRefreshTimer = window.setTimeout(() => {
      state.layoutRefreshTimer = null;
      if (state.isTurning) restoreStablePageView();
      else verifyPagePresentation();
    }, 160);
  }

  function swayBookmark() {
    if (!usesDesktopSpread()) return;
    if (state.bookmarkResetTimer !== null) window.clearTimeout(state.bookmarkResetTimer);
    elements.bookmark.classList.remove('is-swaying');
    window.requestAnimationFrame(() => elements.bookmark.classList.add('is-swaying'));
    state.bookmarkResetTimer = window.setTimeout(() => {
      state.bookmarkResetTimer = null;
      elements.bookmark.classList.remove('is-swaying');
    }, 1250);
  }

  function maybeDropPetals() {
    if (reduceMotion || Math.random() > .55) return;
    const mobile = !usesDesktopSpread();
    const count = mobile ? 2 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 3);
    if (mobile) $$('.falling-petal', elements.petalLayer).forEach((petal) => petal.remove());
    const palettes = [
      ['#9d6b83', '#68465f'],
      ['#c7979c', '#8d5d69'],
      ['#b594c7', '#765b8b'],
      ['#cbb18e', '#8e745d']
    ];

    for (let index = 0; index < count; index += 1) {
      const petal = document.createElement('i');
      const palette = palettes[Math.floor(Math.random() * palettes.length)];
      petal.className = 'falling-petal';
      petal.style.setProperty('--start-x', `${18 + Math.random() * 72}%`);
      petal.style.setProperty('--start-y', `${8 + Math.random() * 30}%`);
      petal.style.setProperty('--size', `${7 + Math.random() * 8}px`);
      petal.style.setProperty('--rotation', `${Math.floor(Math.random() * 180)}deg`);
      petal.style.setProperty('--sway', `${-65 + Math.random() * 130}px`);
      petal.style.setProperty('--duration', `${mobile ? 1.9 + Math.random() * .8 : 2.5 + Math.random() * 1.7}s`);
      petal.style.setProperty('--delay', `${Math.random() * (mobile ? .18 : .4)}s`);
      petal.style.setProperty('--petal-a', palette[0]);
      petal.style.setProperty('--petal-b', palette[1]);
      elements.petalLayer.appendChild(petal);
      petal.addEventListener('animationend', () => petal.remove(), { once: true });
      window.setTimeout(() => petal.remove(), 5200);
    }
  }

  function bindPageControls() {
    elements.prevPage.addEventListener('click', () => turnPage(-1));
    elements.nextPage.addEventListener('click', () => turnPage(1));
    if (typeof desktopSpreadQuery.addEventListener === 'function') desktopSpreadQuery.addEventListener('change', handlePageLayoutChange);
    else desktopSpreadQuery.addListener(handlePageLayoutChange);

    document.addEventListener('keydown', (event) => {
      if (!state.isOpen || document.querySelector('dialog[open]')) return;
      if (event.target instanceof Element && event.target.closest('button, input, textarea, select, a')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        turnPage(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        turnPage(-1);
      }
    });

    elements.bookShell.addEventListener('pointerdown', (event) => {
      if (state.isTurning || event.target.closest('button, input, a')) return;
      state.pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      try { elements.bookShell.setPointerCapture(event.pointerId); } catch {
        // Pointer capture is an enhancement; swipe still works without it.
      }
    });

    elements.bookShell.addEventListener('pointerup', (event) => {
      if (!state.pointerStart || state.pointerStart.id !== event.pointerId) return;
      const deltaX = event.clientX - state.pointerStart.x;
      const deltaY = event.clientY - state.pointerStart.y;
      const startX = state.pointerStart.x;
      state.pointerStart = null;
      try { elements.bookShell.releasePointerCapture(event.pointerId); } catch {
        // The pointer may already have been released by the browser.
      }
      if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        turnPage(deltaX < 0 ? 1 : -1);
        return;
      }
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const bounds = elements.bookShell.getBoundingClientRect();
        if (startX > bounds.right - bounds.width * .13) turnPage(1);
        else if (startX < bounds.left + bounds.width * .13) turnPage(-1);
      }
    });

    elements.bookShell.addEventListener('pointercancel', (event) => {
      state.pointerStart = null;
      try { elements.bookShell.releasePointerCapture(event.pointerId); } catch {
        // The pointer may already have been released by the browser.
      }
    });

    window.addEventListener('pageshow', restoreStablePageView);
    window.addEventListener('resize', schedulePageLayoutRefresh, { passive: true });
    window.addEventListener('orientationchange', schedulePageLayoutRefresh, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') restoreStablePageView();
    });
  }

  function decoratePhotoCards() {
    const decorations = [
      { symbol: '♥', heart: '#c77d98', rotation: '-11deg', scale: '1.04', tape: 'rgba(224, 193, 171, .68)', tapeRotation: '-4deg' },
      { symbol: '♡', heart: '#8767a0', rotation: '9deg', scale: '1.12', tape: 'rgba(196, 177, 216, .62)', tapeRotation: '3deg' },
      { symbol: '♥', heart: '#7296ad', rotation: '5deg', scale: '.96', tape: 'rgba(174, 205, 214, .62)', tapeRotation: '-2deg' },
      { symbol: '♡', heart: '#cb847e', rotation: '-6deg', scale: '1.08', tape: 'rgba(225, 179, 184, .62)', tapeRotation: '2deg' }
    ];
    const cards = $$('.photo-card');
    const startIndex = Math.floor(Math.random() * decorations.length);

    cards.forEach((card, index) => {
      const decoration = decorations[(startIndex + index) % decorations.length];
      const heart = $('.photo-heart', card);
      if (heart) heart.textContent = decoration.symbol;
      card.style.setProperty('--photo-heart-color', decoration.heart);
      card.style.setProperty('--photo-heart-rotation', decoration.rotation);
      card.style.setProperty('--photo-heart-scale', decoration.scale);
      card.style.setProperty('--photo-tape-color', decoration.tape);
      card.style.setProperty('--photo-tape-rotation', decoration.tapeRotation);
    });
  }

  function preparePhotoImageLayers() {
    $$('.photo-card .photo-front').forEach((front) => {
      const image = Array.from(front.children).find((child) => child.tagName === 'IMG');
      if (!image) return;

      const stage = document.createElement('span');
      stage.className = 'photo-image-stage';

      image.classList.add('photo-image-clear');
      const blurredImage = image.cloneNode(false);
      blurredImage.classList.remove('photo-image-clear');
      blurredImage.classList.add('photo-image-blurred');
      blurredImage.alt = '';
      blurredImage.setAttribute('aria-hidden', 'true');

      front.insertBefore(stage, image);
      stage.append(image, blurredImage);
    });
  }

  function bindPhotos() {
    $$('.photo-card').forEach((card) => {
      card.setAttribute('aria-pressed', 'false');
      card.addEventListener('click', () => {
        const revealed = card.classList.toggle('is-revealed');
        card.setAttribute('aria-pressed', String(revealed));
      });
    });
  }

  function normalizeMemorySlide(index) {
    const total = elements.memorySlides.length;
    if (!total) return 0;
    const numericIndex = Number(index);
    const safeIndex = Number.isFinite(numericIndex) ? Math.trunc(numericIndex) : 0;
    return ((safeIndex % total) + total) % total;
  }

  function updateMemorySliderBackground(source, immediate = false) {
    const backgrounds = elements.memorySliderBackgrounds;
    if (!backgrounds.length || !source) return;

    if (immediate || backgrounds.length === 1) {
      backgrounds.forEach((background, index) => {
        background.src = source;
        background.classList.toggle('is-active', index === 0);
      });
      state.memoryBackdropLayer = 0;
      return;
    }

    const nextLayer = (state.memoryBackdropLayer + 1) % backgrounds.length;
    backgrounds[nextLayer].src = source;
    state.memoryBackdropLayer = nextLayer;
    window.requestAnimationFrame(() => {
      backgrounds.forEach((background, index) => background.classList.toggle('is-active', index === nextLayer));
    });
  }

  function renderMemorySlider(requestedIndex, immediate = false) {
    const total = elements.memorySlides.length;
    if (!total) return;

    const activeIndex = normalizeMemorySlide(requestedIndex);
    const previousIndex = normalizeMemorySlide(activeIndex - 1);
    const nextIndex = normalizeMemorySlide(activeIndex + 1);
    state.memorySlide = activeIndex;

    elements.memorySlides.forEach((slide, index) => {
      slide.classList.remove('is-active', 'is-prev', 'is-next');
      if (index === activeIndex) slide.classList.add('is-active');
      else if (index === previousIndex) slide.classList.add('is-prev');
      else if (index === nextIndex) slide.classList.add('is-next');
      slide.tabIndex = index === activeIndex ? 0 : -1;
      slide.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    });

    const sliderDots = $$('button', elements.memorySliderDots);
    sliderDots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex);
      if (index === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    const activeDot = sliderDots[activeIndex];
    if (activeDot && elements.memorySliderDots.clientWidth > 0) {
      const centeredLeft = activeDot.offsetLeft - (elements.memorySliderDots.clientWidth - activeDot.offsetWidth) / 2;
      const targetLeft = Math.max(0, centeredLeft);
      if (typeof elements.memorySliderDots.scrollTo === 'function') {
        elements.memorySliderDots.scrollTo({
          left: targetLeft,
          behavior: immediate || reduceMotion ? 'auto' : 'smooth'
        });
      } else {
        elements.memorySliderDots.scrollLeft = targetLeft;
      }
    }

    const activeSlide = elements.memorySlides[activeIndex];
    const activeImage = $('img', activeSlide);
    [previousIndex, activeIndex, nextIndex].forEach((index) => {
      const nearbyImage = $('img', elements.memorySlides[index]);
      if (nearbyImage) nearbyImage.loading = 'eager';
    });
    const caption = $('span', activeSlide)?.textContent.trim() || 'Birlikte biriktirdiğimiz anı';
    updateMemorySliderBackground(activeImage?.currentSrc || activeImage?.src, immediate);
    elements.memorySliderStatus.textContent = `${activeIndex + 1} / ${total} · ${caption}`;
  }

  function stepMemorySlider(direction) {
    renderMemorySlider(state.memorySlide + direction);
  }

  function buildMemorySliderDots() {
    elements.memorySliderDots.replaceChildren();
    elements.memorySlides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `${index + 1}. anıyı göster`);
      dot.addEventListener('click', () => renderMemorySlider(index));
      elements.memorySliderDots.appendChild(dot);
    });
  }

  function openMemorySlider() {
    renderMemorySlider(state.memorySlide, true);
    openDialog(elements.memorySliderDialog);
  }

  function bindMemorySlider() {
    if (!elements.openMemorySlider || !elements.memorySliderDialog || !elements.memorySlides.length) return;

    buildMemorySliderDots();
    renderMemorySlider(0, true);
    elements.openMemorySlider.addEventListener('click', openMemorySlider);
    elements.memorySliderPrev.addEventListener('click', () => stepMemorySlider(-1));
    elements.memorySliderNext.addEventListener('click', () => stepMemorySlider(1));

    elements.memorySlides.forEach((slide, index) => {
      slide.addEventListener('click', () => {
        if (performance.now() < state.memoryIgnoreClickUntil) return;
        renderMemorySlider(index);
      });
    });

    elements.memorySliderViewport.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('.memory-slider-arrow')) return;
      event.preventDefault();
      state.memoryPointerStart = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
        captured: false
      };
    });

    elements.memorySliderViewport.addEventListener('pointermove', (event) => {
      const start = state.memoryPointerStart;
      if (!start || start.id !== event.pointerId || start.captured) return;
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      try {
        elements.memorySliderViewport.setPointerCapture(event.pointerId);
        start.captured = true;
      } catch {
        // The swipe remains usable while the pointer stays over the gallery.
      }
    });

    elements.memorySliderViewport.addEventListener('pointerup', (event) => {
      const start = state.memoryPointerStart;
      state.memoryPointerStart = null;
      if (!start || start.id !== event.pointerId) return;
      if (start.captured) {
        try { elements.memorySliderViewport.releasePointerCapture(event.pointerId); } catch {
          // The pointer may already have been released by the browser.
        }
      }
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
        state.memoryIgnoreClickUntil = performance.now() + 320;
        stepMemorySlider(deltaX < 0 ? 1 : -1);
      }
    });

    elements.memorySliderViewport.addEventListener('pointercancel', (event) => {
      const start = state.memoryPointerStart;
      state.memoryPointerStart = null;
      if (start?.captured) {
        try { elements.memorySliderViewport.releasePointerCapture(event.pointerId); } catch {
          // The pointer may already have been released by the browser.
        }
      }
    });
    elements.memorySliderDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepMemorySlider(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepMemorySlider(1);
      }
    });
  }

  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function setCounterUnit(container, unit, value) {
    const output = $(`[data-unit="${unit}"]`, container);
    if (output) output.textContent = value;
  }

  function updateTogetherCounter(now = new Date()) {
    const start = new Date(CONFIG.togetherSince);
    const difference = Math.max(0, now.getTime() - start.getTime());
    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    setCounterUnit(elements.togetherCounter, 'days', String(days));
    setCounterUnit(elements.togetherCounter, 'hours', pad(hours));
    setCounterUnit(elements.togetherCounter, 'minutes', pad(minutes));
    setCounterUnit(elements.togetherCounter, 'seconds', pad(seconds));
  }

  function daysInUtcMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function addUtcMonths(source, amount) {
    const result = new Date(source.getTime());
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + amount);
    result.setUTCDate(Math.min(day, daysInUtcMonth(result.getUTCFullYear(), result.getUTCMonth())));
    return result;
  }

  function getCalendarCountdown(now, target) {
    if (now >= target) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    let months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + target.getUTCMonth() - now.getUTCMonth();
    let cursor = addUtcMonths(now, months);
    if (cursor > target) {
      months -= 1;
      cursor = addUtcMonths(now, months);
    }
    const rest = Math.max(0, target.getTime() - cursor.getTime());
    const totalSeconds = Math.ceil(rest / 1000);
    return {
      months,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
  }

  function updateLetterCountdown(now = new Date()) {
    const target = new Date(CONFIG.letterUnlocksAt);
    const parts = getCalendarCountdown(now, target);
    Object.entries(parts).forEach(([unit, value]) => setCounterUnit(elements.letterCountdown, unit, unit === 'months' || unit === 'days' ? String(value) : pad(value)));
    const unlocked = now >= target;
    if (unlocked !== state.envelopeUnlocked) {
      state.envelopeUnlocked = unlocked;
      elements.envelopeButton.classList.toggle('locked', !unlocked);
      elements.envelopeButton.setAttribute('aria-label', unlocked ? 'Mektubu aç' : 'Tarihi gelince açılacak mektup');
      elements.envelopeStatus.textContent = unlocked ? 'Vakti geldi. Mühür artık sana emanet.' : 'Mühür, doğru zamanı bekliyor.';
    }
  }

  function updateClocks() {
    const now = new Date();
    updateTogetherCounter(now);
    updateLetterCountdown(now);
  }

  function nextRandomIndex(items, previous) {
    if (items.length < 2) return 0;
    let index = Math.floor(Math.random() * items.length);
    if (index === previous) index = (index + 1) % items.length;
    return index;
  }

  function handleEnvelopeClick() {
    if (!state.envelopeUnlocked) {
      state.lastLockedMessage = nextRandomIndex(lockedEnvelopeMessages, state.lastLockedMessage);
      showToast('🔒', lockedEnvelopeMessages[state.lastLockedMessage], 'Zarf biraz daha sabır istiyor.');
      elements.envelopeButton.classList.remove('is-shaking');
      void elements.envelopeButton.offsetWidth;
      elements.envelopeButton.classList.add('is-shaking');
      return;
    }
    if (elements.envelopeButton.classList.contains('is-opening')) return;
    elements.envelopeButton.classList.remove('is-opening');
    void elements.envelopeButton.offsetWidth;
    elements.envelopeButton.classList.add('is-opening');
    window.setTimeout(() => openDialog(elements.letterDialog), reduceMotion ? 20 : 650);
  }

  function markLetterAsRead() {
    state.letterRead = true;
    storage.set(KEYS.letterRead, 'true');
    closeDialog(elements.letterDialog);
    showToast('💌', 'Mektup okundu', 'Bu satırlar artık kalbinde.');
    updateCompletion();
  }

  function getIstanbulDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    });
    return Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  }

  function dayOfYear(year, month, day) {
    return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
  }

  function calculateSolarMinutes(year, month, day) {
    const numberOfDay = dayOfYear(year, month, day);
    const gamma = (2 * Math.PI / 365) * (numberOfDay - 1);
    const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    const latitude = CONFIG.midyat.latitude * Math.PI / 180;
    const zenith = 90.833 * Math.PI / 180;
    const cosineHourAngle = (Math.cos(zenith) / (Math.cos(latitude) * Math.cos(declination))) - Math.tan(latitude) * Math.tan(declination);
    const hourAngle = Math.acos(Math.min(1, Math.max(-1, cosineHourAngle))) * 180 / Math.PI;
    const solarNoon = 720 - 4 * CONFIG.midyat.longitude - equationOfTime + CONFIG.midyat.utcOffsetMinutes;
    return { sunrise: solarNoon - hourAngle * 4, solarNoon, sunset: solarNoon + hourAngle * 4 };
  }

  function chooseTheme(date = new Date()) {
    const parts = getIstanbulDateParts(date);
    const currentMinutes = parts.hour * 60 + parts.minute + parts.second / 60;
    const solar = calculateSolarMinutes(parts.year, parts.month, parts.day);
    if (currentMinutes >= solar.sunrise - 35 && currentMinutes < solar.sunrise + 55) return 'sunrise';
    if (currentMinutes >= solar.sunrise + 55 && currentMinutes < solar.solarNoon - 50) return 'morning';
    if (currentMinutes >= solar.solarNoon - 50 && currentMinutes < solar.sunset - 65) return 'noon';
    if (currentMinutes >= solar.sunset - 65 && currentMinutes < solar.sunset + 45) return 'sunset';
    return 'night';
  }

  function updateTheme() {
    const forced = new URLSearchParams(window.location.search).get('theme');
    const validThemes = Object.keys(themeNames);
    const theme = validThemes.includes(forced) ? forced : chooseTheme();
    document.body.dataset.theme = theme;
    elements.themeLabel.textContent = themeNames[theme];
    elements.moonButton.hidden = theme !== 'night';
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    try { dialog.close(); } catch { dialog.removeAttribute('open'); }
    if (dialog === elements.letterDialog) elements.envelopeButton.classList.remove('is-opening');
  }

  function bindDialogs() {
    $$('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => closeDialog(button.closest('dialog')));
    });
    $$('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog && dialog !== elements.memoryDateDialog) closeDialog(dialog);
      });
    });
    elements.memoryDateDialog.addEventListener('cancel', (event) => event.preventDefault());
    elements.letterDialog.addEventListener('close', () => {
      elements.envelopeButton.classList.remove('is-opening');
    });
  }

  function localIsoDate(date) {
    const parts = getIstanbulDateParts(date);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  function setupMemoryDatePrompt() {
    const tomorrow = new Date(Date.now() + 86400000);
    elements.memoryDateInput.min = localIsoDate(tomorrow);
    const defaultDate = new Date('2030-02-08T00:00:00+03:00');
    elements.memoryDateInput.value = defaultDate > tomorrow ? '2030-02-08' : localIsoDate(new Date(Date.now() + 31536000000));

    elements.memoryDateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!elements.memoryDateInput.checkValidity()) {
        elements.memoryDateInput.reportValidity();
        return;
      }
      const selected = elements.memoryDateInput.value;
      storage.set(KEYS.memoryDate, selected);
      storage.set(KEYS.memoryDateAsked, 'true');
      storage.set(KEYS.futureMessageShown, 'false');
      closeDialog(elements.memoryDateDialog);
      showToast('⌛', 'Tarih saklandı', 'Defter o günü unutmamak üzere söz verdi.');
    });
  }

  function parseStoredMemoryDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const target = new Date(`${value}T00:00:00+03:00`);
    if (!Number.isFinite(target.getTime()) || localIsoDate(target) !== value) return null;
    return target;
  }

  function maybeShowFutureMemory() {
    const asked = storage.get(KEYS.memoryDateAsked, 'false') === 'true';
    const selected = storage.get(KEYS.memoryDate, '');
    const target = parseStoredMemoryDate(selected);
    if (!asked || !target) {
      openDialog(elements.memoryDateDialog);
      return;
    }
    const shown = storage.get(KEYS.futureMessageShown, 'false') === 'true';
    if (Number.isFinite(target.getTime()) && Date.now() >= target.getTime() && !shown) {
      storage.set(KEYS.futureMessageShown, 'true');
      openDialog(elements.futureMessageDialog);
    }
  }

  function handleMoonClick() {
    elements.secretDialog.classList.remove('is-wrong');
    elements.secretMessage.textContent = '';
    elements.secretInput.value = '';
    openDialog(elements.secretDialog);
    window.setTimeout(() => {
      if (elements.secretDialog.open) elements.secretInput.focus();
    }, 80);
  }

  function handleSecretSubmit(event) {
    event.preventDefault();
    const guess = elements.secretInput.value.trim().toLocaleLowerCase('tr-TR');
    if (guess !== CONFIG.secretPassword) {
      state.lastWrongPassword = nextRandomIndex(wrongPasswordMessages, state.lastWrongPassword);
      elements.secretMessage.textContent = wrongPasswordMessages[state.lastWrongPassword];
      elements.secretDialog.classList.remove('is-wrong');
      void elements.secretDialog.offsetWidth;
      elements.secretDialog.classList.add('is-wrong');
      elements.secretInput.select();
      return;
    }

    const firstDiscovery = !state.eggFound;
    state.eggFound = true;
    storage.set(KEYS.eggFound, 'true');
    closeDialog(elements.secretDialog);
    window.setTimeout(() => openDialog(elements.secretPhotoDialog), reduceMotion ? 20 : 280);
    if (firstDiscovery) showToast('🏆', 'Kalbimin şifresini buldun!', 'Gizli ay hatırası açıldı.');
    else showToast('☾', 'Ayın sırrı yeniden açıldı', 'Şifre kalbin kapısını tekrar açtı.');
    updateCompletion();
  }

  function updateCompletion() {
    const allPagesVisited = contentPages.every((_, index) => state.visited.has(index));
    const requirements = [allPagesVisited, state.eggFound, state.letterRead];
    elements.completionProgress.replaceChildren();
    requirements.forEach((done) => {
      const dot = document.createElement('i');
      dot.classList.toggle('done', done);
      elements.completionProgress.appendChild(dot);
    });

    const complete = requirements.every(Boolean);
    elements.completionBadge.classList.toggle('is-complete', complete);
    if (complete) {
      elements.completionTitle.textContent = 'Hatıra Defterini Tamamladın';
      elements.completionText.textContent = 'Bu defter artık gerçekten tamamlandı. 💜';
      if (!state.completed && state.isOpen && visiblePageIndexes().includes(lastContentIndex)) {
        state.completed = true;
        storage.set(KEYS.completed, 'true');
        showToast('🏆', 'Hatıra Defterini Tamamladın', 'Bu defter artık gerçekten tamamlandı. 💜');
      }
    } else {
      if (state.completed) {
        state.completed = false;
        storage.set(KEYS.completed, 'false');
      }
      elements.completionTitle.textContent = 'Defter henüz bitmedi…';
      const missing = [];
      if (!allPagesVisited) missing.push('tüm sayfalar');
      if (!state.eggFound) missing.push('ayın sakladığı sır');
      if (!state.letterRead) missing.push('mühürlü mektup');
      elements.completionText.textContent = `${missing.join(', ')} hâlâ keşfedilmeyi bekliyor.`;
    }
  }

  function showToast(icon, title, message = '') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-icon" aria-hidden="true"></div><div><strong></strong><span></span></div>`;
    $('.toast-icon', toast).textContent = icon;
    $('strong', toast).textContent = title;
    $('span', toast).textContent = message;
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.classList.add('is-leaving'), 3900);
    window.setTimeout(() => toast.remove(), 4400);
  }

  function openBook() {
    if (state.isOpen || state.isOpening) return;
    state.isOpening = true;
    updateCompletion();
    elements.openBookButton.disabled = true;
    elements.app.hidden = false;
    elements.app.inert = true;
    playSound(audio.bookOpen);
    playBackgroundMusic();
    warmPageTurnSound();
    elements.introScreen.classList.add('is-opening');
    window.setTimeout(() => {
      state.isOpening = false;
      state.isOpen = true;
      elements.app.inert = false;
      elements.app.classList.add('is-visible');
      updateCompletion();
      elements.introScreen.classList.add('is-fading');
      window.setTimeout(() => { elements.introScreen.hidden = true; }, reduceMotion ? 20 : 700);
      maybeShowFutureMemory();
    }, reduceMotion ? 30 : 1120);
  }

  function bindEvents() {
    elements.openBookButton.addEventListener('click', openBook);
    elements.loadingRetry.addEventListener('click', () => window.location.reload());
    elements.soundToggle.addEventListener('click', () => {
      setSound(!state.soundEnabled);
      if (state.soundEnabled) warmPageTurnSound();
    });
    elements.envelopeButton.addEventListener('click', handleEnvelopeClick);
    elements.markLetterRead.addEventListener('click', markLetterAsRead);
    elements.moonButton.addEventListener('click', handleMoonClick);
    elements.secretForm.addEventListener('submit', handleSecretSubmit);
    bindPageControls();
    bindPhotos();
    bindMemorySlider();
    bindDialogs();
  }

  function init() {
    preparePages();
    preparePhotoImageLayers();
    decoratePhotoCards();
    buildTurnFaceCache();
    setupMemoryDatePrompt();
    setSound(state.soundEnabled);
    updateTheme();
    updateClocks();
    bindEvents();
    window.setInterval(updateClocks, 1000);
    window.setInterval(updateTheme, 60000);
    preloadBook().catch(() => {
      window.__memoryBookReady = true;
      elements.loadingStatus.textContent = 'Bazı ayrıntılar yüklenemedi; defter yine de açılabilir.';
      elements.loadingBar.style.width = '100%';
      window.setTimeout(finishLoadingScreen, 500);
    });
  }

  window.addEventListener('error', (event) => {
    if (!window.__memoryBookReady && event.filename) {
      elements.loadingStatus.textContent = 'Bir ayrıntı hazırlanamadı; defter toparlanıyor…';
    }
  });

  init();
})();
