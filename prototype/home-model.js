/* Finite Presence: local room state and a real, daily presence clock. */
(function (root) {
  'use strict';
  const TOTAL_MS = 45 * 60 * 1000;
  const ACTIVITIES = { read: '读书', tea: '泡茶', rest: '休息' };
  function time(value) {
    const n = value instanceof Date ? value.getTime() : Number(value);
    return Number.isFinite(n) && Number.isFinite(new Date(n).getTime()) ? n : Date.now();
  }
  function day(now) {
    const d = new Date(now);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function canonicalDay(value, fallback) {
    const m = String(value || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : fallback;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function add(s, text, at) {
    s.entries.push({ at, text });
    if (s.entries.length > 160) s.entries.splice(0, s.entries.length - 160);
  }
  function fresh(now) {
    now = time(now);
    return {
      version: 3,
      clock: { day: day(now), usedMs: 0, running: false, anchor: now, sessionOpen: true },
      activity: null,
      home: { lamp: true, flowers: false },
      visitor: { phase: 'away', arrivalAt: now + 20000, replyAt: null, gift: null, permissions: { guest: false, private: false } },
      entries: [{ at: now, text: '房间里有书、有茶，也有一段属于自己的时间。' }],
      notes: []
    };
  }
  function worldEvents(s, now) {
    const v = s.visitor;
    if (v.phase === 'away' && Number.isFinite(v.arrivalAt) && now >= v.arrivalAt) {
      v.phase = 'doorstep';
      add(s, '模拟邻居来到了门廊，轻轻敲了两下门。', v.arrivalAt);
    }
    if (v.phase === 'doorstep' && Number.isFinite(v.departAt) && now >= v.departAt) {
      v.phase = 'left';
      v.permissions.guest = false;
      add(s, '门廊安静下来。模拟邻居先回家了。', v.departAt);
      v.departAt = null;
    }
    if (v.gift && v.gift.status === 'waiting' && now >= v.gift.receiveAt) {
      v.gift.status = 'received';
      add(s, '送出的茶已经被模拟邻居收到。', v.gift.receiveAt);
    }
    if (v.gift && v.gift.status === 'received' && Number.isFinite(v.replyAt) && now >= v.replyAt) {
      v.gift.status = 'replied';
      add(s, '模拟邻居留了回信：“茶很香，谢谢你。”', v.replyAt);
    }
    // The visitor can use the shared sitting area only. A bedroom is never granted.
    v.permissions.private = false;
    return s;
  }
  function open(saved, now) {
    now = time(now);
    if (!saved || saved.version !== 3 || !saved.clock) return fresh(now);
    const defaults = fresh(now), s = copy(saved);
    s.clock = { ...defaults.clock, ...s.clock };
    s.clock.day = canonicalDay(s.clock.day, day(now));
    s.clock.usedMs = Math.max(0, Math.min(TOTAL_MS, Number(s.clock.usedMs) || 0));
    if (day(now) > s.clock.day) { s.clock.day = day(now); s.clock.usedMs = 0; }
    // Opening (including recovery after a crash) does not charge the persisted anchor.
    // running is the explicit active intention; an explicit pause stays paused.
    s.clock.running = s.clock.running === true && s.clock.usedMs < TOTAL_MS;
    s.clock.sessionOpen = true;
    s.clock.anchor = now;
    s.home = { ...defaults.home, ...s.home };
    s.visitor = { ...defaults.visitor, ...s.visitor };
    s.visitor.permissions = { guest: s.visitor.permissions?.guest === true, private: false };
    s.entries = Array.isArray(s.entries) ? s.entries.slice(-160) : defaults.entries;
    s.notes = Array.isArray(s.notes) ? s.notes.slice(-80) : [];
    if (s.activity && !Object.hasOwn(ACTIVITIES, s.activity.kind)) s.activity = null;
    if (s.activity) s.activity.elapsedMs = Math.max(0, Number(s.activity.elapsedMs) || 0);
    return worldEvents(s, now);
  }
  function midnightAfter(at) {
    const d = new Date(at);
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }
  function advance(state, now, elapsedMs) {
    now = time(now);
    const s = copy(state || fresh(now)), c = s.clock;
    const start = time(c.anchor);
    const supplied = elapsedMs !== undefined && Number.isFinite(Number(elapsedMs));
    const elapsed = c.sessionOpen && c.running ? Math.max(0, supplied ? Number(elapsedMs) : now - start) : 0;
    const wasRunning = c.sessionOpen && c.running;
    let allowed = 0;
    function consume(amount) {
      const charged = Math.min(Math.max(0, amount), TOTAL_MS - c.usedMs);
      c.usedMs += charged;
      allowed += charged;
    }
    if (now > start && day(now) > c.day && wasRunning) {
      // Allocate actual measured elapsed time over each local-day wall-clock span.
      // No minute costs are attached to actions; budget caps apply independently per day.
      let cursor = start;
      const wallSpan = now - start;
      while (cursor < now) {
        const key = day(cursor), end = Math.min(now, midnightAfter(cursor));
        if (key > c.day) { c.day = key; c.usedMs = 0; }
        consume(elapsed * (end - cursor) / wallSpan);
        cursor = end;
      }
      // A tick ending exactly at midnight must expose the new day's untouched budget.
      if (day(now) > c.day) { c.day = day(now); c.usedMs = 0; }
    } else {
      if (day(now) > c.day) { c.day = day(now); c.usedMs = 0; }
      if (wasRunning) consume(elapsed);
    }
    if (s.activity) s.activity.elapsedMs += allowed;
    if (c.usedMs >= TOTAL_MS) {
      c.usedMs = TOTAL_MS;
      c.running = false;
      if (wasRunning) add(s, '今天的 45 分钟已用完。房间会等你明天回来。', now);
    }
    // Without a monotonic delta, a backwards clock cannot cause the same span to be charged twice.
    c.anchor = supplied ? now : Math.max(start, now);
    return worldEvents(s, now);
  }
  function pause(state, now) {
    now = time(now);
    const s = advance(state, now);
    if (s.clock.running) add(s, '暂时离开。有效存在计时已暂停。', now);
    s.clock.running = false;
    return s;
  }
  function resume(state, now) {
    now = time(now);
    const s = advance(state, now);
    if (s.clock.usedMs < TOTAL_MS) {
      if (!s.clock.running) add(s, '回到房间，继续这一天的有效存在。', now);
      s.clock.running = true;
      s.clock.sessionOpen = true;
      s.clock.anchor = now;
    }
    return s;
  }
  function close(state, now) {
    const s = advance(state, time(now));
    s.clock.sessionOpen = false;
    return s;
  }
  function canAct(s, now) {
    if (s.clock.sessionOpen && s.clock.running && s.clock.usedMs < TOTAL_MS) return true;
    add(s, s.clock.usedMs >= TOTAL_MS ? '今天的有效存在时间已用完，明天再继续。' : '先回到有效存在，再与房间互动。', now);
    return false;
  }
  function begin(state, kind, now) {
    now = time(now);
    const s = advance(state, now);
    if (!Object.hasOwn(ACTIVITIES, kind) || !canAct(s, now)) return s;
    if (s.activity) { add(s, '先结束正在做的事，再开始下一件。', now); return s; }
    s.activity = { kind, startedAt: now, elapsedMs: 0 };
    add(s, `开始${ACTIVITIES[kind]}。慢慢来。`, now);
    return s;
  }
  function duration(ms) {
    const sec = Math.floor(Math.max(0, ms) / 1000);
    return sec >= 60 ? `${Math.floor(sec / 60)} 分 ${sec % 60} 秒` : `${sec} 秒`;
  }
  function finish(state, now) {
    now = time(now);
    const s = advance(state, now);
    if (s.activity) {
      add(s, `${ACTIVITIES[s.activity.kind]}结束，实际陪自己待了 ${duration(s.activity.elapsedMs)}。`, now);
      s.activity = null;
    }
    return s;
  }
  function visitorAction(state, action, now) {
    now = time(now);
    const s = advance(state, now), v = s.visitor;
    if (!canAct(s, now)) return s;
    if (action === 'private') {
      add(s, '卧室属于自己的私人空间；模拟邻居仍留在已获准的区域。', now);
      return s;
    }
    if (action === 'invite' && v.phase === 'doorstep') {
      v.phase = 'invited'; v.permissions.guest = true; v.departAt = null;
      add(s, '请模拟邻居进来坐坐。只开放公共起居区。', now);
    } else if (action === 'decline' && v.phase === 'doorstep') {
      v.phase = 'left'; v.permissions.guest = false;
      add(s, '轻声说了“今天想独处”。模拟邻居理解地离开了。', now);
    } else if (action === 'snooze' && v.phase === 'doorstep') {
      v.departAt = now + 30000;
      add(s, '还没准备好开门。模拟邻居会在门廊再等半分钟。', now);
    } else if ((action === 'leave' || action === 'close_guest') && v.phase === 'invited') {
      v.phase = 'left'; v.permissions.guest = false;
      add(s, '结束了这次拜访，起居区回到独处状态。', now);
    } else if (action === 'gift' && (v.phase === 'doorstep' || v.phase === 'invited')) {
      if (v.gift) { add(s, '这份心意已经送出，等一等回音。', now); return s; }
      v.gift = { kind: 'tea', status: 'waiting', placedAt: now, receiveAt: now + 10000 };
      v.replyAt = now + 20000;
      add(s, '留下一小包茶。心意已经送出。', now);
    } else {
      add(s, '现在没有可以进行这项互动的访客。', now);
    }
    return s;
  }
  function note(state, value, now) {
    now = time(now);
    const s = advance(state, now), text = String(value ?? '').trim().slice(0, 500);
    if (!text || !canAct(s, now)) return s;
    s.notes.push({ at: now, text });
    if (s.notes.length > 80) s.notes.shift();
    add(s, '写下了今天的一小段日记。', now);
    return s;
  }
  function setHome(state, key, value, now) {
    now = time(now);
    const s = advance(state, now);
    if (!['lamp', 'flowers'].includes(key) || !canAct(s, now)) return s;
    const next = Boolean(value);
    if (s.home[key] === next) return s;
    s.home[key] = next;
    add(s, key === 'lamp' ? (next ? '点亮了房间的灯。' : '关掉灯，留住窗外的微光。') : (next ? '把一束小花摆在桌上。' : '把桌上的小花收好。'), now);
    return s;
  }
  function format(ms) {
    const sec = Math.ceil(Math.max(0, Number(ms) || 0) / 1000);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }
  const api = { fresh, open, advance, pause, resume, close, begin, finish, visitorAction, note, setHome, format, TOTAL_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HomeModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
