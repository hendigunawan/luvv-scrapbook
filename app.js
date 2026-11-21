import { setupAlbumMusic } from './music.mjs?v=8f38ed12b9';
import { photos, memories, extraPhotos } from './data.js?v=223203e2dc';
import { calendarDaysSince, filterMemories } from './utils.mjs';

const $ = selector => document.querySelector(selector);
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
});
const formatDate = date => dateFormat.format(new Date(date + 'T00:00:00+07:00'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const chapterForHash = () => memories.findIndex(memory => '#' + memory.id === location.hash);
const chapterByPhoto = new Map(memories.flatMap(memory => memory.photos.map(key => [key, memory])));
const spread = $('#spread');
const contents = $('#contents-dialog');
const lightbox = $('#photo-dialog');
let chapterIndex = Math.max(chapterForHash(), 0);
let photoGroup = [];
let photoIndex = 0;
let photoOpener;
let selectedContentsPage = null;

function mountPhoto(button, key, useThumbnail) {
  button.hidden = !key;
  const image = button.querySelector('img');
  if (!key) {
    button.removeAttribute('data-photo');
    button.removeAttribute('aria-label');
    image.removeAttribute('src');
    image.alt = '';
    return;
  }
  const photo = photos[key];
  image.width = photo.width;
  image.height = photo.height;
  image.alt = photo.alt;
  image.src = useThumbnail ? photo.thumb : photo.src;
  button.dataset.photo = key;
  button.style.setProperty('--source-ratio', String(photo.width / photo.height));
  button.dataset.format = photo.width > photo.height ? 'landscape' : 'portrait';
  button.setAttribute('aria-label', 'Perbesar foto. ' + photo.alt);
}

function showChapter(index, animate = false) {
  if (!memories[index]) return;
  const direction = index >= chapterIndex ? 1 : -1;
  chapterIndex = index;
  const chapter = memories[index];
  spread.dataset.paper = chapter.paper;
  showPostcardSide(false);
  $('#flip-postcard').hidden = chapter.paper !== 'sea';
  $('#chapter-date').dateTime = chapter.date;
  $('#chapter-date').textContent = formatDate(chapter.date);
  $('#chapter-title').textContent = chapter.title;
  $('#chapter-caption').textContent = chapter.caption;
  mountPhoto($('#featured'), chapter.photos[0], false);
  mountPhoto($('#companion'), chapter.photos[1], true);
  $('#all-photos').dataset.photo = chapter.photos[0];
  $('#all-photos').hidden = chapter.photos.length < 2;
  $('#all-photos span').textContent = 'Lihat ' + chapter.photos.length + ' foto';
  $('#page-counter b').textContent = String(index + 1);
  $('#prev-chapter').disabled = index === 0;
  const nextLabel = index === memories.length - 1 ? 'Ke surat' : 'Berikutnya';
  $('#next-chapter span').textContent = nextLabel;
  $('#next-chapter').dataset.last = String(index === memories.length - 1);
  $('#next-chapter').setAttribute('aria-label', index === memories.length - 1 ? 'Ke surat Hendi' : 'Halaman berikutnya');
  if (animate) {
    $('#chapter-announcement').textContent = 'Halaman ' + (index + 1) + ' dari ' + memories.length + '. ' + chapter.title + '. ' + formatDate(chapter.date) + '.';
    if (!reducedMotion.matches) {
      spread.classList.remove('is-turning');
      spread.style.setProperty('--turn-offset', direction * 6 + 'px');
      void spread.offsetWidth;
      spread.classList.add('is-turning');
    }
  }
}

function showPostcardSide(back) {
  spread.dataset.side = back ? 'back' : 'front';
  $('#postcard-message').hidden = !back;
  $('#flip-postcard').setAttribute('aria-expanded', String(back));
  $('#flip-postcard span').textContent = back ? 'Kembali ke foto' : 'Balik kartu pos';
}
$('#flip-postcard').addEventListener('click', () => {
  const back = spread.dataset.side !== 'back';
  showPostcardSide(back);
  if (back) $('#postcard-message').focus({ preventScroll: true });
  if (photoLeaf.getBoundingClientRect().top < $('.masthead').offsetHeight) {
    photoLeaf.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
});

function scrollToReader() {
  const top = $('#cerita').getBoundingClientRect().top;
  const headerHeight = $('.masthead').offsetHeight;
  if (top < headerHeight - 1 || top > window.innerHeight / 2) {
    $('#cerita').scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}

function visitPage(index) {
  if (!memories[index]) return;
  showChapter(index, true);
  history.replaceState(null, '', '#' + memories[index].id);
  scrollToReader();
}

$('#prev-chapter').addEventListener('click', () => visitPage(chapterIndex - 1));
$('#next-chapter').addEventListener('click', () => {
  if (chapterIndex < memories.length - 1) visitPage(chapterIndex + 1);
  else {
    location.hash = 'surat';
    ($('#love-letter').hidden ? $('#open-letter') : $('#love-letter')).focus({ preventScroll: true });
  }
});
$('.cover-action').addEventListener('click', () => { if (chapterIndex !== 0) showChapter(0); });
spread.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  visitPage(chapterIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  $('#chapter-title').focus({ preventScroll: true });
});

// A horizontal drag turns the page. A short tap on the same print opens the photograph.
const photoLeaf = $('.photo-leaf');
let dragStart = null;
let ignoreDragClick = false;
photoLeaf.addEventListener('pointerdown', event => {
  ignoreDragClick = false;
  dragStart = event.isPrimary && event.button === 0
    ? { id: event.pointerId, x: event.clientX, y: event.clientY }
    : null;
});
window.addEventListener('pointercancel', () => { dragStart = null; });
window.addEventListener('pointerup', event => {
  if (!dragStart || event.pointerId !== dragStart.id) return;
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  dragStart = null;
  if (Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
  ignoreDragClick = true;
  visitPage(chapterIndex + (dx < 0 ? 1 : -1));
});
photoLeaf.addEventListener('click', event => {
  if (ignoreDragClick && event.detail > 0) {
    ignoreDragClick = false;
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

function followChapterHash() {
  const index = chapterForHash();
  if (index !== -1) {
    if (index !== chapterIndex) showChapter(index);
    scrollToReader();
  }
}
window.addEventListener('hashchange', followChapterHash);

function renderContents() {
  const rows = filterMemories(memories, $('#period').value).map(memory => {
    const index = memories.indexOf(memory);
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.page = String(index);
    if (index === chapterIndex) button.setAttribute('aria-current', 'page');
    const number = document.createElement('span');
    number.className = 'index-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const preview = new Image();
    preview.className = 'index-print';
    preview.src = photos[memory.photos[0]].thumb;
    preview.alt = '';
    preview.loading = 'lazy';
    button.setAttribute('aria-label', 'Halaman ' + (index + 1) + '. ' + memory.title + ', ' + formatDate(memory.date));
    const summary = document.createElement('span');
    const name = document.createElement('span');
    name.className = 'index-name';
    name.textContent = memory.title;
    const date = document.createElement('time');
    date.className = 'index-date';
    date.dateTime = memory.date;
    date.textContent = formatDate(memory.date);
    summary.append(name, date);
    button.append(preview, summary, number);
    row.append(button);
    return row;
  });
  $('#index-list').replaceChildren(...rows);
  $('#index-list').scrollTop = 0;
}

$('#open-index').addEventListener('click', () => {
  selectedContentsPage = null;
  $('#period').value = 'all';
  renderContents();
  contents.showModal();
  $('#close-index').focus({ preventScroll: true });
  const list = $('#index-list');
  const current = list.querySelector('[aria-current="page"]');
  if (current) list.scrollTop = Math.max(0, current.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 3);
});
$('#period').addEventListener('change', renderContents);
$('#close-index').addEventListener('click', () => contents.close());
$('#index-list').addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (button) {
    selectedContentsPage = Number(button.dataset.page);
    contents.close();
  }
});
contents.addEventListener('close', () => {
  if (selectedContentsPage === null) {
    $('#open-index').focus({ preventScroll: true });
    return;
  }
  visitPage(selectedContentsPage);
  selectedContentsPage = null;
  $('#chapter-title').focus({ preventScroll: true });
});

function updateLightbox() {
  const key = photoGroup[photoIndex];
  const photo = photos[key];
  const chapter = chapterByPhoto.get(key);
  $('#photo-title').textContent = chapter?.title || 'Di saku belakang';
  $('#photo-date').textContent = chapter ? formatDate(chapter.date) : 'Kenangan tanpa tanggal';
  $('#large-photo').alt = photo.alt;
  $('#large-photo').src = photo.src;
  $('#photo-counter').textContent = 'Foto ' + (photoIndex + 1) + ' dari ' + photoGroup.length;
  $('#photo-dialog').classList.toggle('single-photo', photoGroup.length === 1);
  $('#prev-photo').hidden = photoGroup.length === 1;
  $('#next-photo').hidden = photoGroup.length === 1;
  $('#dialog-thumbs').hidden = photoGroup.length === 1;
  $('#photo-counter').hidden = photoGroup.length === 1;
  for (const thumb of $('#dialog-thumbs').children) {
    thumb.setAttribute('aria-pressed', String(Number(thumb.dataset.index) === photoIndex));
  }
}
function openPhoto(key, opener) {
  if (!photos[key]) return;
  photoGroup = chapterByPhoto.get(key)?.photos || extraPhotos;
  photoIndex = photoGroup.indexOf(key);
  photoOpener = opener;
  const strip = photoGroup.map((photoKey, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.dataset.index = String(index);
    thumb.setAttribute('aria-label', 'Pilih foto ' + (index + 1) + '. ' + photos[photoKey].alt);
    const image = new Image();
    image.src = photos[photoKey].thumb;
    image.alt = '';
    thumb.append(image);
    return thumb;
  });
  $('#dialog-thumbs').replaceChildren(...strip);
  updateLightbox();
  lightbox.showModal();
  $('#close-photo').focus({ preventScroll: true });
}
$('#dialog-thumbs').addEventListener('click', event => {
  const thumb = event.target.closest('[data-index]');
  if (!thumb) return;
  photoIndex = Number(thumb.dataset.index);
  updateLightbox();
});
function movePhoto(step) {
  if (photoGroup.length < 2) return;
  photoIndex = (photoIndex + step + photoGroup.length) % photoGroup.length;
  updateLightbox();
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (button) openPhoto(button.dataset.photo, button);
});
$('#prev-photo').addEventListener('click', () => movePhoto(-1));
$('#next-photo').addEventListener('click', () => movePhoto(1));
$('#close-photo').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('close', () => { if (photoOpener?.isConnected) photoOpener.focus({ preventScroll: true }); });
for (const dialog of [contents, lightbox]) {
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
}
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
let touchOrigin;
const stage = $('#photo-stage');
stage.addEventListener('touchstart', event => { touchOrigin = event.touches.length === 1 ? event.touches[0] : null; }, { passive: true });
stage.addEventListener('touchcancel', () => { touchOrigin = null; });
stage.addEventListener('touchend', event => {
  if (!touchOrigin) return;
  const dx = event.changedTouches[0].clientX - touchOrigin.clientX;
  const dy = event.changedTouches[0].clientY - touchOrigin.clientY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) movePhoto(dx > 0 ? -1 : 1);
  touchOrigin = null;
}, { passive: true });

$('#open-letter').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (button.getAttribute('aria-expanded') === 'true') return;
  button.setAttribute('aria-expanded', 'true');
  if (!reducedMotion.matches && typeof button.animate === 'function') {
    const lift = button.querySelector('.envelope-flap').animate(
      [{ transform: 'rotateX(0)' }, { transform: 'rotateX(152deg)' }],
      { duration: 340, easing: 'ease-out', fill: 'forwards' }
    );
    try { await lift.finished; } catch {}
    lift.cancel();
  }
  $('#envelope-wrap').hidden = true;
  $('#love-letter').hidden = false;
  $('#love-letter').focus({ preventScroll: true });
  $('#love-letter').scrollIntoView({ block: 'start' });
});
$('#close-letter').addEventListener('click', () => {
  $('#love-letter').hidden = true;
  $('#envelope-wrap').hidden = false;
  $('#open-letter').setAttribute('aria-expanded', 'false');
  $('#open-letter').focus({ preventScroll: true });
  $('#surat').scrollIntoView({ block: 'start' });
});
function updateDayCount() {
  $('#days-together').textContent = new Intl.NumberFormat('id-ID').format(calendarDaysSince('2025-11-22')) + ' hari ';
  $('#days-label').textContent = 'sejak 22 November 2025';
}
updateDayCount();
setInterval(updateDayCount, 60_000);
showChapter(chapterIndex);
if (chapterForHash() !== -1) requestAnimationFrame(followChapterHash);
if ('IntersectionObserver' in window) {
  const links = Array.from(document.querySelectorAll('.masthead nav a'));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const link = links.find(item => item.hash === '#' + entry.target.id);
      if (!link) continue;
      if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-10% 0px -43% 0px' });
  links.forEach(link => observer.observe(document.querySelector(link.hash)));
}

setupAlbumMusic();
