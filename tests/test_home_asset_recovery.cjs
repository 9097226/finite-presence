'use strict';
// Run the real UI and state model with controlled image events and elapsed time.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../prototype/home-model.js');
const app = fs.readFileSync(path.join(__dirname, '../prototype/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../prototype/index.html'), 'utf8');
const STORE = 'finite-presence-home-v3:qa:asset-recovery';

class Element {
  constructor() { this.style = {}; this.dataset = {}; this.hidden = false; this.disabled = false; this.children = []; this.handlers = {}; }
  setAttribute(name, value) { this[name] = value; }
  querySelector() { return this.label ||= new Element(); }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  showModal() { this.open = true; }
  close() { this.open = false; this.handlers.close?.(); }
  focus() {}
  click() { assert.equal(this.disabled, false, 'a user cannot click a disabled control'); this.onclick?.(); }
}

function fixture() {
  let wall = new Date(2026, 9, 9, 12).getTime(), mono = 0;
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const controls = ['bookSpot', 'teaSpot', 'bedSpot', 'shelfSpot', 'lampSpot', 'doorSpot', 'porchButton', 'restButton'].map(id => elements.get(id));
  elements.get('retryImageButton').hidden = true;
  const saved = M.resume(M.fresh(wall), wall);
  saved.clock.usedMs = 1000;
  const storage = new Map([[STORE, JSON.stringify(saved)]]), requests = [], intervals = [], errors = [];
  let lockHeld = false;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [wall])); } static now() { return wall; } }
  class Image { set src(url) { this.url = url; requests.push(this); } }
  const context = vm.createContext({
    window: { HomeModel: M, addEventListener() {} },
    document: { getElementById: id => elements.get(id), querySelectorAll: () => controls, createElement: () => new Element() },
    location: { search: '?qa=asset-recovery' }, URLSearchParams,
    Date: Clock, performance: { now: () => mono }, Image,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    navigator: { locks: { request: (_name, _options, handler) => {
      lockHeld = true;
      return Promise.resolve(handler({})).finally(() => { lockHeld = false; }).catch(error => errors.push(error));
    } } },
    setInterval: callback => { intervals.push(callback); }, setTimeout: callback => callback(),
  });
  vm.runInContext(app, context, { filename: 'prototype/app.js' });
  return {
    el: id => elements.get(id), controls, requests, intervals, errors,
    saved: () => JSON.parse(storage.get(STORE)),
    lockHeld: () => lockHeld,
    step(ms) { wall += ms; mono += ms; intervals.forEach(callback => callback()); },
    settleImages(fail) {
      const batch = requests.splice(0);
      for (const image of batch) (fail?.(image.url) ? image.onerror : image.onload)?.();
      return batch;
    },
  };
}
const turn = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const f = fixture();
  assert.equal(f.requests.length, 9);
  f.settleImages(url => url.endsWith('/room-tea.png'));
  await turn();
  assert.equal(f.el('enterButton').textContent, '画面没打开，点这里重试');
  assert.equal(f.el('enterButton').disabled, false);
  assert.equal(f.intervals.length, 0, 'failed startup must not begin the timer');
  f.step(10000);
  assert.equal(f.saved().clock.usedMs, 1000, 'preload failure must not charge time');
  assert.equal(f.lockHeld(), true, 'startup retry retains the same session lock');
  console.log('PASS failed preload offers retry without charging time or releasing ownership');

  f.el('enterButton').click();
  await turn();
  assert.equal(f.requests.length, 9, 'retry requests every required asset again');
  f.settleImages();
  await turn();
  f.settleImages();
  assert.equal(f.intervals.length, 1);
  assert.equal(f.el('sceneImage').src, 'assets/room-idle.png');
  assert.equal(f.saved().clock.usedMs, 1000);
  assert.equal(f.saved().clock.running, true);
  console.log('PASS successful startup retry restores the room and saved active intention');

  f.step(1000);
  f.el('teaSpot').click();
  assert.equal(f.controls.every(control => control.disabled), true);
  assert.equal(f.requests.length, 1);
  f.settleImages(url => url.endsWith('/room-tea.png'));
  assert.equal(f.saved().clock.running, false, 'a failed scene auto-pauses and persists');
  assert.equal(f.controls.every(control => !control.disabled), true, 'pause and scene controls remain usable');
  assert.equal(f.el('retryImageButton').hidden, false);
  assert.equal(f.el('sceneImage').src, 'assets/room-idle.png', 'keep the previous usable picture');
  const stoppedAt = f.saved().clock.usedMs;
  f.step(5000);
  assert.equal(f.saved().clock.usedMs, stoppedAt);
  assert.equal(f.requests.length, 0, 'a failed image is not requested every timer tick');
  console.log('PASS runtime image failure pauses time, preserves controls, and avoids retry loops');

  f.el('retryImageButton').click();
  assert.equal(f.requests.length, 1);
  f.settleImages();
  assert.equal(f.el('sceneImage').src, 'assets/room-tea.png');
  assert.equal(f.el('retryImageButton').hidden, true);
  assert.equal(f.controls.every(control => !control.disabled), true);
  assert.equal(f.saved().clock.running, false, 'retry must not silently restart the timer');
  f.el('restButton').click();
  f.step(1000);
  assert.equal(f.saved().clock.usedMs, stoppedAt + 1000, 'explicit resume uses actual elapsed seconds');
  assert.equal(f.errors.length, 0);
  console.log('PASS scene retry recovers normally and timer resumes only on request');
  console.log('4 / 4 asset recovery tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
