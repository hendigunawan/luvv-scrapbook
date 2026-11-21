import test from 'node:test';
import assert from 'node:assert/strict';
import { setupAlbumMusic } from '../music.mjs';

function fixture() {
  const audio = Object.assign(new EventTarget(), {
    paused: true, ended: false, allowed: true, attempts: 0, currentTime: 0,
    async play() {
      this.attempts++;
      if (!this.allowed) throw new DOMException('Tap required', 'NotAllowedError');
      this.paused = false;
      this.ended = false;
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    },
    pause() {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    }
  });
  const button = Object.assign(new EventTarget(), { dataset: {}, setAttribute() {} });
  const coverLink = Object.assign(new EventTarget(), {
    dataset: {},
    opens: 0,
    contains: node => node === coverLink,
    closest: selectors => selectors.split(', ').includes('.cover-action') ? coverLink : null,
    click() { this.opens++; tap('.cover-action'); }
  });
  const label = { textContent: 'Putar lagu' };
  const status = { textContent: '' };
  const elements = { 'album-audio': audio, 'music-toggle': button, 'music-label': label, 'music-status': status, 'open-album': coverLink };
  const doc = Object.assign(new EventTarget(), { getElementById: id => elements[id] });
  const view = Object.assign(new EventTarget(), {
    scrollY: 0, navigator: { userActivation: { isActive: true } }, clearTimeout() {}, setTimeout() {}
  });
  setupAlbumMusic(doc, view);
  function tap(selector) {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: { closest: selectors => selectors.split(', ').includes(selector) } });
    doc.dispatchEvent(event);
  }
  function scroll() {
    view.dispatchEvent(Object.assign(new Event('wheel'), { deltaY: 40 }));
    view.dispatchEvent(new Event('scroll'));
  }
  function touch(type, x, y, target = doc, count = 1) {
    const finger = { identifier: 1, clientX: x, clientY: y };
    const event = Object.assign(new Event(type, { cancelable: true }), {
      touches: type === 'touchend' || type === 'touchcancel' ? [] : Array(count).fill(finger),
      changedTouches: [finger]
    });
    Object.defineProperty(event, 'target', { value: target === doc ? { closest: () => null } : target });
    (type === 'touchend' && target === coverLink ? coverLink : view).dispatchEvent(event);
    return event;
  }
  return { audio, button, coverLink, label, status, view, tap, scroll, touch };
}

test('a restored scroll stays silent, a reading scroll tries once, and a tap recovers blocked playback', async () => {
  const { audio, view, label, status, scroll, tap } = fixture();
  view.dispatchEvent(new Event('scroll'));
  assert.equal(audio.attempts, 0);
  audio.allowed = false;
  scroll();
  await Promise.resolve();
  assert.match(status.textContent, /Ketuk.*lagu/);
  assert.equal(label.textContent, 'Putar lagu');
  scroll();
  assert.equal(audio.attempts, 1);
  audio.allowed = true;
  tap('#next-chapter');
  assert.equal(audio.paused, false);
  assert.equal(label.textContent, 'Jeda lagu');
  assert.equal(status.textContent, '');
});

test('opening the album plays immediately and reading never overrides a manual pause or rewinds a resume', () => {
  const { audio, button, label, scroll, tap } = fixture();
  tap('.cover-action');
  assert.equal(audio.paused, false);
  audio.currentTime = 42;
  tap('.cover-action');
  scroll();
  assert.equal(audio.attempts, 1);
  button.dispatchEvent(new Event('click'));
  tap('.cover-action');
  scroll();
  assert.equal(audio.paused, true);
  assert.equal(label.textContent, 'Putar lagu');
  button.dispatchEvent(new Event('click'));
  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 42);
});

test('the finished song waits for a deliberate replay', () => {
  const { audio, button, label, scroll, tap } = fixture();
  tap('.cover-action');
  audio.paused = true;
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  scroll();
  tap('.cover-action');
  assert.equal(audio.attempts, 1);
  assert.equal(label.textContent, 'Putar lagi');
  button.dispatchEvent(new Event('click'));
  assert.equal(audio.attempts, 2);
  assert.equal(label.textContent, 'Jeda lagu');
});

test('a fast upward swipe starts the song on release before any scroll event', () => {
  const { audio, touch, view } = fixture();
  view.navigator.userActivation.isActive = false;
  touch('touchstart', 90, 240);
  touch('touchend', 92, 125);
  assert.equal(audio.attempts, 1);
  assert.equal(audio.paused, false);
  view.dispatchEvent(new Event('scroll'));
  assert.equal(audio.attempts, 1);
});

test('a real release retries when a scroll play request is still being rejected', async () => {
  const { audio, button, touch, view, status } = fixture();
  audio.allowed = false;
  touch('touchstart', 80, 240);
  touch('touchmove', 82, 180);
  view.dispatchEvent(new Event('scroll'));
  assert.equal(audio.attempts, 1);
  audio.allowed = true;
  touch('touchend', 85, 110);
  await Promise.resolve();
  assert.equal(audio.attempts, 2);
  assert.equal(audio.paused, false);
  assert.equal(button.dataset.needsTap, 'false');
  assert.equal(status.textContent, '');
});

test('a swipe that the browser denies exposes a persistent one-tap play action', async () => {
  const { audio, button, touch, status } = fixture();
  audio.allowed = false;
  touch('touchstart', 90, 240);
  touch('touchend', 90, 150);
  await Promise.resolve();
  assert.equal(button.dataset.needsTap, 'true');
  assert.match(status.textContent, /Ketuk/);
  audio.allowed = true;
  button.dispatchEvent(new Event('click'));
  assert.equal(audio.paused, false);
  assert.equal(status.textContent, '');
});

test('native scrolling can start before touchmove, or after the browser takes over the touch', () => {
  for (const browserTakesOver of [false, true]) {
    const { audio, touch, view } = fixture();
    touch('touchstart', 80, 240);
    if (browserTakesOver) touch('touchcancel', 82, 200);
    assert.equal(audio.attempts, 0);
    view.scrollY = 40;
    view.dispatchEvent(new Event('scroll'));
    assert.equal(audio.attempts, 1);
  }
});

test('swiping the cover link opens the album and respects an existing pause', () => {
  const { audio, button, coverLink, touch } = fixture();
  touch('touchstart', 50, 200, coverLink);
  const release = touch('touchend', 52, 150, coverLink);
  assert.equal(coverLink.opens, 1);
  assert.equal(release.defaultPrevented, true);
  assert.equal(audio.attempts, 1);
  button.dispatchEvent(new Event('click'));
  touch('touchstart', 50, 200, coverLink);
  touch('touchend', 52, 150, coverLink);
  assert.equal(coverLink.opens, 2);
  assert.equal(audio.paused, true);
});

test('taps, horizontal page turns, pinches and cancelled gestures do not start music', () => {
  const { audio, touch } = fixture();
  for (const [x, y] of [[90, 235], [30, 220], [92, 285]]) {
    touch('touchstart', 90, 240);
    touch('touchend', x, y);
  }
  touch('touchstart', 90, 240);
  touch('touchstart', 90, 240, undefined, 2);
  touch('touchend', 90, 100);
  touch('touchstart', 90, 240);
  touch('touchcancel', 90, 200);
  touch('touchend', 90, 100);
  assert.equal(audio.attempts, 0);
});
