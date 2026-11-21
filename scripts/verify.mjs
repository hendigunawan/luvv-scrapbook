import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { memories, photos, extraPhotos } from '../data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = root;
assert.equal(memories.length, 22, 'Every distinct dated event should be represented');
assert.equal(new Set(memories.map(m => m.id)).size, memories.length);
assert.equal(memories[0].date, '2025-11-22');
assert.equal(memories.at(-1).date, '2026-11-01');
for (let i = 1; i < memories.length; i++) assert.ok(memories[i - 1].date < memories[i].date, 'Chapters must be chronological');
for (const key of [...memories.flatMap(m => m.photos), ...extraPhotos]) {
  assert.ok(photos[key], `Photo ${key} must exist`);
}
const publishedKeys = new Set([...memories.flatMap(m => m.photos), ...extraPhotos]);
assert.deepEqual(publishedKeys, new Set(Object.keys(photos)), 'The catalogue contains only curated images');
const publishedFiles = Object.values(photos).flatMap(photo => [photo.src, photo.thumb]);
assert.deepEqual(new Set(readdirSync(resolve(dist, 'assets/photos')).map(file => 'assets/photos/' + file)),
  new Set(publishedFiles), 'Removed photos and thumbnails must also leave the deployment');
for (const memory of memories) {
  assert.ok(['garden', 'film', 'table', 'sea'].includes(memory.paper), 'Each chapter needs a paper design');
}
const beach = memories.find(memory => memory.date === '2026-10-25');
assert.deepEqual(beach.photos, ['m068'], 'The beach postcard uses the verified shoreline with no portraits');
assert.ok(!publishedKeys.has('m004'), 'Exclude the rejected beach photograph from all galleries');
for (const [key, photo] of Object.entries(photos)) {
  for (const path of [photo.src, photo.thumb]) assert.ok(existsSync(resolve(dist, path)), `${key}: ${path} must exist`);
}
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
const css = readFileSync(resolve(dist, 'style.css'), 'utf8');
const localReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(m => m[1]).filter(path => !/^(?:#|https?:|data:)/.test(path)).map(path => path.split(/[?#]/)[0]);
const fonts = [...css.matchAll(/url\('(assets\/[^']+)'\)/g)].map(m => m[1]);
for (const path of [...localReferences, ...fonts]) assert.ok(existsSync(resolve(dist, path)), `Missing page asset: ${path}`);
for (const path of ['index.html', 'style.css', 'app.js', 'data.js', 'utils.mjs']) {
  assert.doesNotMatch(readFileSync(resolve(dist, path), 'utf8'), /sdmntpr|[?&]sig=|Bearer |latitude|longitude|BEGIN PRIVATE KEY/i, `Private download details must not appear in ${path}`);
}
console.log(`Verified ${memories.length} chronological chapters, ${Object.keys(photos).length} photos, local page/font references, and absence of private download credentials.`);
