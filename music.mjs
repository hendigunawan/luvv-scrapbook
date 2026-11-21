export function setupAlbumMusic(doc = document, view = window) {
  const audio = doc.getElementById('album-audio');
  const button = doc.getElementById('music-toggle');
  const label = doc.getElementById('music-label');
  const status = doc.getElementById('music-status');
  const coverLink = doc.getElementById('open-album');
  const loadFailure = 'Lagu belum bisa dimuat. Ketuk Putar lagu untuk mencoba lagi.';
  const automatic = new AbortController();
  const passive = { passive: true, signal: automatic.signal };
  let userScrolling = false;
  let triedOnScroll = false;
  let needsTap = false;
  let request = 0;
  let noticeTimer;
  let touchStart = null;

  function notice(message = '', keepUntilTap = false) {
    view.clearTimeout(noticeTimer);
    status.textContent = message;
    button.dataset.needsTap = String(keepUntilTap);
    if (message && !keepUntilTap) noticeTimer = view.setTimeout(() => { status.textContent = ''; }, 6500);
  }

  function isPlaying() {
    return !audio.paused && !audio.ended && !audio.error;
  }

  function reflectPlayback() {
    const playing = isPlaying();
    const action = playing ? 'Jeda lagu' : audio.ended ? 'Putar lagi' : 'Putar lagu';
    button.dataset.playing = String(playing);
    label.textContent = action;
    button.setAttribute('aria-label', action + ' Kita usahakan rumah itu oleh Sal Priadi');
  }

  function playSong() {
    if (isPlaying()) return;
    const currentRequest = ++request;
    notice();
    if (audio.error) audio.load();
    // Keep play() in the input handler so a tap can authorize audible playback.
    audio.play().catch(error => {
      if (currentRequest !== request || error.name === 'AbortError') return;
      needsTap = error.name === 'NotAllowedError';
      reflectPlayback();
      notice(needsTap ? 'Ketuk untuk memutar lagu' : loadFailure, needsTap);
    });
  }

  audio.addEventListener('play', reflectPlayback);
  audio.addEventListener('playing', () => {
    request++;
    automatic.abort();
    notice();
    reflectPlayback();
  });
  audio.addEventListener('pause', () => {
    automatic.abort();
    reflectPlayback();
  });
  audio.addEventListener('ended', reflectPlayback);
  audio.addEventListener('error', () => {
    reflectPlayback();
    notice(loadFailure);
  });

  button.addEventListener('click', () => {
    if (!isPlaying()) {
      playSong();
    } else {
      request++;
      automatic.abort();
      audio.pause();
      notice();
    }
  });

  doc.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('.music-control, .song-credit')) return;
    if (needsTap || event.target.closest('.cover-action, .skip-link, .masthead nav a')) playSong();
  }, passive);

  // A restored bookmark or an automatic jump to a chapter is not a reading gesture.
  view.addEventListener('wheel', event => {
    if (!event.ctrlKey && event.deltaY) userScrolling = true;
  }, passive);
  view.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) userScrolling = true;
  }, passive);
  view.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.clientX >= doc.documentElement.clientWidth) userScrolling = true;
  }, passive);
  view.addEventListener('scroll', () => {
    const readingByTouch = touchStart && view.scrollY > touchStart.scrollY + 2;
    if (triedOnScroll || (!userScrolling && !readingByTouch)) return;
    triedOnScroll = true;
    playSong();
  }, passive);
  // Keep native panning on the page. Only the opening link also acts as a swipe control.
  coverLink.dataset.swipeReady = 'true';
  view.addEventListener('touchstart', event => {
    touchStart = null;
    userScrolling = false;
    if (event.touches.length !== 1 || event.target.closest('.music-control, .song-credit')) return;
    const onCoverLink = coverLink.contains(event.target);
    if (automatic.signal.aborted && !onCoverLink) return;
    const finger = event.touches[0];
    touchStart = { id: finger.identifier, x: finger.clientX, y: finger.clientY, scrollY: view.scrollY, onCoverLink };
  }, { passive: true, capture: true });

  function swipedUp(finger, distance) {
    if (!touchStart || !finger || finger.identifier !== touchStart.id) return false;
    const up = touchStart.y - finger.clientY;
    return up >= distance && up > Math.abs(finger.clientX - touchStart.x);
  }

  view.addEventListener('touchmove', event => {
    if (event.touches.length === 1 && swipedUp(event.touches[0], 10)) userScrolling = true;
  }, passive);
  view.addEventListener('touchcancel', event => {
    // Native panning can take over a moving touch before a release reaches the page.
    if (swipedUp(event.changedTouches[0], 10)) userScrolling = true;
    touchStart = null;
  }, { passive: true, capture: true });

  function finishSwipe(event) {
    const onCoverLink = touchStart?.onCoverLink;
    const moved = !event.touches.length && swipedUp(event.changedTouches[0], onCoverLink ? 24 : 10);
    touchStart = null;
    if (!moved) return;
    // The release can arrive before scroll or its rejected play promise.
    triedOnScroll = true;
    if (onCoverLink) {
      if (event.currentTarget === coverLink && event.cancelable) event.preventDefault();
      // The link's click opens the album and calls play() in this same input handler.
      coverLink.click();
    } else if (!automatic.signal.aborted) {
      playSong();
    }
  }
  coverLink.addEventListener('touchend', finishSwipe, { passive: false });
  view.addEventListener('touchend', finishSwipe, { passive: true });
}
