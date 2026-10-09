'use strict';
const assert = require('node:assert/strict');
const M = require('../prototype/home-model.js');
const t = new Date(2026, 9, 8, 12, 0, 0).getTime();
let count = 0;
function test(name, body) { body(); count++; console.log(`PASS ${name}`); }
function active(now = t) { return M.resume(M.fresh(now), now); }

test('sixty actual seconds consume exactly sixty seconds', () => {
  const initial = active(), saved = JSON.stringify(initial);
  const s = M.advance(initial, t + 60000, 60000);
  assert.equal(s.clock.usedMs, 60000);
  assert.equal(M.format(M.TOTAL_MS - s.clock.usedMs), '44:00');
  assert.equal(JSON.stringify(initial), saved, 'APIs must not change their input');
});

test('actions have no preset time cost', () => {
  let s = active();
  s = M.begin(s, 'tea', t);
  s = M.setHome(s, 'lamp', false, t);
  s = M.note(s, '一杯茶，慢慢喝。', t);
  assert.equal(s.clock.usedMs, 0);
  assert.equal(s.home.lamp, false);
  assert.equal(s.notes[0].text, '一杯茶，慢慢喝。');
});

test('pause persists across reopening and next local day', () => {
  let s = M.pause(active(), t + 60000);
  s = M.open(JSON.parse(JSON.stringify(s)), t + 3600000);
  assert.equal(s.clock.usedMs, 60000);
  assert.equal(s.clock.running, false);
  s = M.open(s, new Date(2026, 9, 9, 12).getTime());
  assert.equal(s.clock.usedMs, 0);
  assert.equal(s.clock.running, false);
});

test('clean close restores active intention without charging offline hours', () => {
  const closed = M.close(active(), t + 60000);
  assert.equal(closed.clock.sessionOpen, false);
  assert.equal(closed.clock.running, true);
  const opened = M.open(closed, t + 3 * 3600000);
  assert.equal(opened.clock.usedMs, 60000);
  assert.equal(opened.clock.running, true);
  assert.equal(opened.clock.anchor, t + 3 * 3600000);
  assert.equal(M.advance(opened, opened.clock.anchor + 1000).clock.usedMs, 61000);
});

test('crash recovery never charges a persisted active anchor', () => {
  const crashSave = M.advance(active(), t + 12000);
  assert.equal(crashSave.clock.sessionOpen, true);
  const restored = M.open(crashSave, t + 6 * 3600000);
  assert.equal(restored.clock.usedMs, 12000);
  assert.equal(restored.clock.running, true);
});

test('wall-clock rollback cannot create a negative or duplicated charge', () => {
  let s = M.advance(active(), t + 10000);
  s = M.advance(s, t + 5000);
  assert.equal(s.clock.usedMs, 10000);
  s = M.advance(s, t + 10000);
  assert.equal(s.clock.usedMs, 10000);
  s = M.advance(s, t + 11000);
  assert.equal(s.clock.usedMs, 11000);
});

test('monotonic elapsed remains usable after wall-clock rollback', () => {
  let s = M.advance(active(), t + 10000, 10000);
  s = M.advance(s, t + 5000, 1000);
  assert.equal(s.clock.usedMs, 11000);
  assert.equal(s.clock.anchor, t + 5000);
  s = M.advance(s, t + 5100, 1000);
  assert.equal(s.clock.usedMs, 12000);
});

test('midnight divides the actual elapsed time between two local days', () => {
  const before = new Date(2026, 9, 8, 23, 59, 30).getTime();
  let s = active(before);
  s.clock.usedMs = 120000;
  s = M.begin(s, 'read', before);
  s = M.advance(s, before + 60000, 60000);
  assert.equal(s.clock.day, '2026-10-09');
  assert.equal(s.clock.usedMs, 30000);
  assert.equal(s.activity.elapsedMs, 60000);
  assert.equal(s.clock.running, true);
});

test('exact midnight exposes a fresh daily budget', () => {
  const before = new Date(2026, 9, 8, 23, 59, 30).getTime();
  const s = M.advance(active(before), before + 30000, 30000);
  assert.equal(s.clock.day, '2026-10-09');
  assert.equal(s.clock.usedMs, 0);
});

test('budget cannot carry unused minutes into another day', () => {
  const saved = M.pause(active(), t + 60000);
  const tomorrow = new Date(2026, 9, 9, 12).getTime();
  const s = M.open(saved, tomorrow);
  assert.equal(M.TOTAL_MS - s.clock.usedMs, 45 * 60000);
});

test('daily exhaustion caps consumption and stops activity accrual', () => {
  let s = active();
  s.clock.usedMs = M.TOTAL_MS - 1000;
  s = M.begin(s, 'rest', t);
  s = M.advance(s, t + 5000, 5000);
  assert.equal(s.clock.usedMs, M.TOTAL_MS);
  assert.equal(s.clock.running, false);
  assert.equal(s.activity.elapsedMs, 1000);
  const later = M.advance(s, t + 60000, 55000);
  assert.equal(later.activity.elapsedMs, 1000);
  assert.equal(M.setHome(later, 'lamp', false, t + 60000).home.lamp, true);
});

test('activity logs real duration and excludes paused/offline time', () => {
  let s = M.begin(active(), 'read', t);
  s = M.pause(s, t + 4500);
  assert.equal(s.activity.elapsedMs, 4500);
  s = M.close(s, t + 10000);
  s = M.open(s, t + 3600000);
  s = M.resume(s, t + 3600000);
  s = M.finish(s, t + 3601500);
  assert.equal(s.clock.usedMs, 6000);
  assert.equal(s.activity, null);
  assert.match(s.entries.at(-1).text, /实际陪自己待了 6 秒/);
});

test('paused state refuses activity, notes and home changes', () => {
  const paused = M.fresh(t);
  assert.equal(M.begin(paused, 'tea', t).activity, null);
  assert.equal(M.note(paused, '应拒绝写入', t).notes.length, 0);
  assert.equal(M.setHome(paused, 'flowers', true, t).home.flowers, false);
  assert.equal(M.setHome(active(), 'porch', true, t).home.porch, undefined);
});

test('gift receipt and reply follow wall time, including closed sessions', () => {
  let s = M.advance(active(), t + 20000);
  assert.equal(s.visitor.phase, 'doorstep');
  s = M.visitorAction(s, 'gift', t + 20000);
  assert.equal(s.visitor.gift.status, 'waiting');
  assert.equal(s.visitor.replyAt, t + 40000);
  s = M.close(s, t + 20000);
  s = M.open(s, t + 60000);
  assert.equal(s.visitor.gift.status, 'replied');
  assert.equal(s.clock.usedMs, 20000, 'wall events must not spend active minutes');
  assert.ok(s.entries.some(e => e.at === t + 30000 && /收到/.test(e.text)));
  assert.ok(s.entries.some(e => e.at === t + 40000 && /回信/.test(e.text)));
});

test('invitation grants only guest space and revocation removes it', () => {
  let s = M.advance(active(), t + 20000);
  s = M.visitorAction(s, 'invite', t + 20000);
  assert.equal(s.visitor.phase, 'invited');
  assert.deepEqual(s.visitor.permissions, { guest: true, private: false });
  const rejected = M.visitorAction(s, 'private', t + 20000);
  assert.equal(rejected.visitor.phase, 'invited');
  assert.deepEqual(rejected.visitor.permissions, { guest: true, private: false });
  s = M.visitorAction(rejected, 'close_guest', t + 20000);
  assert.equal(s.visitor.phase, 'left');
  assert.equal(s.visitor.permissions.guest, false);
});

test('doorstep snooze eventually ends without an invitation', () => {
  let s = M.advance(active(), t + 20000);
  s = M.visitorAction(s, 'snooze', t + 20000);
  s = M.pause(s, t + 20000);
  s = M.advance(s, t + 50000);
  assert.equal(s.visitor.phase, 'left');
  assert.equal(s.clock.usedMs, 20000);
  assert.equal(s.visitor.permissions.guest, false);
});

test('open accepts old unpadded day keys without resetting the same day', () => {
  const saved = M.fresh(t);
  saved.clock.day = '2026-10-8';
  saved.clock.usedMs = 13 * 60000;
  const opened = M.open(saved, t);
  assert.equal(opened.clock.usedMs, 13 * 60000);
  assert.equal(M.format(M.TOTAL_MS - opened.clock.usedMs), '32:00');
});

console.log(`${count} home-model tests passed.`);
