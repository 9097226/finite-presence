const state = {
  total: 45,
  remaining: 45,
  mode: 'ACTIVE',
  memories: [],
  traces: [],
  preset: 'friendly',
  zones: []
};

const zoneDefs = [
  { level: 'L0', name: '公共领域', fixed: 'everyone' },
  { level: 'L1', name: '门前 / 门廊' },
  { level: 'L2', name: '会客区' },
  { level: 'L3', name: '熟人区' },
  { level: 'L4', name: '私人区' },
  { level: 'L5', name: '核心私域', fixed: 'self' }
];

const presets = {
  open:     ['everyone','everyone','everyone','friend','named','self'],
  friendly: ['everyone','everyone','friend','friend','named','self'],
  quiet:    ['everyone','everyone','friend','named','named','self'],
  private:  ['everyone','everyone','named','named','named','self']
};

const actions = [
  { id:'visit', title:'去见一个朋友', minutes:15, desc:'不保证发生重要事件。只是把今晚的一部分时间留给某个人。', memory:'你用了十五分钟去见一个人。没有奖励，但这段时间被留给了关系。' },
  { id:'home', title:'整理自己的房间', minutes:12, desc:'移动几件物品、挂起一张旧照片，让空间更像“你”。', memory:'你整理了自己的空间。它没有升级，只是更像你生活过的地方。' },
  { id:'walk', title:'去北边走一段', minutes:18, desc:'那里今天第一次降温。也许什么都不会发生。', memory:'你去了北边。没有完成任务，但记住了今天的风。' },
  { id:'wait', title:'在门口等一会', minutes:8, desc:'也许会遇见人，也许不会。等待本身就是一种选择。', memory:'你在门口等了一会。世界没有保证回应你。' },
  { id:'gift', title:'给某人留下一件东西', minutes:6, desc:'不附带好感度，也不要求对方回礼。', memory:'你留下了一件东西。它会在对方下次回来时被看见。' },
  { id:'nothing', title:'什么都不做', minutes:5, desc:'坐着、听一会环境声音。时间仍然会过去。', memory:'你什么都没有完成，但今晚并不是空白。' }
];

const accessLabels = {
  everyone:'所有人', friend:'好友', named:'指定对象', self:'仅本人'
};

function init() {
  state.zones = presets[state.preset].slice();
  renderActions();
  renderZones();
  renderTime();
  bindControls();
}

function bindControls() {

  document.getElementById('restButton').addEventListener('click', () => {
    state.mode = state.mode === 'ACTIVE' ? 'REST' : 'ACTIVE';
    renderTime();
    renderActions();
  });

  document.getElementById('privacyPreset').addEventListener('change', e => {
    state.preset = e.target.value;
    state.zones = presets[state.preset].slice();
    renderZones();
  });

  document.getElementById('simulateVisit').addEventListener('click', simulateVisit);

  document.querySelectorAll('[data-common]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.common;
      const data = {
        sit:  { minutes:3, text:'你在公共长椅坐了一会。一个陌生人从路边经过，没有打扰你。' },
        note: { minutes:2, text:'你在公共留言板留下了一句很短的话。它会在几天后自然淡出。' },
        lamp: { minutes:4, text:'你点亮了门外的公共灯。今晚经过的人都会得到一点光。' }
      }[type];
      spend(data.minutes, data.text);
      addTrace(data.text);
      moveTraveler();
    });
  });
}

function renderActions() {
  const root = document.getElementById('actions');
  root.innerHTML = '';
  actions.forEach(action => {
    const button = document.createElement('button');
    button.className = 'action';
    button.disabled = state.mode !== 'ACTIVE' || state.remaining < action.minutes;
    button.innerHTML = `<strong>${action.title}</strong><small>${action.desc}</small><em>${action.minutes} 分钟</em>`;
    button.addEventListener('click', () => spend(action.minutes, action.memory));
    root.appendChild(button);
  });
}

function spend(minutes, memory) {
  if (state.mode !== 'ACTIVE' || state.remaining < minutes) return;
  state.remaining -= minutes;
  state.memories.unshift({ remaining: state.remaining, text: memory });
  if (state.remaining === 0) state.mode = 'REST';
  renderTime();
  renderMemories();
  renderActions();
}

function renderTime() {
  document.getElementById('timeRemaining').textContent = state.remaining;
  document.getElementById('timeBar').style.width = `${Math.max(0, state.remaining / state.total * 100)}%`;
  document.getElementById('modeBadge').textContent = state.mode;
  document.getElementById('restButton').textContent = state.mode === 'ACTIVE' ? '进入静默时间' : '返回有效存在';
}

function renderMemories() {
  const log = document.getElementById('memoryLog');
  if (!state.memories.length) {
    log.className = 'log empty';
    log.textContent = '还没有发生什么。你不需要把今晚填满。';
    return;
  }
  log.className = 'log';
  log.innerHTML = state.memories.map(item => `
    <div class="log-entry"><time>剩余 ${item.remaining} 分钟</time>${item.text}</div>
  `).join('');
}

function renderZones() {
  const root = document.getElementById('zones');
  root.innerHTML = '';
  zoneDefs.forEach((zone, index) => {
    const el = document.createElement('div');
    el.className = `zone ${zone.fixed ? 'locked' : ''}`;
    const current = zone.fixed || state.zones[index];
    el.innerHTML = `
      <span class="level">${zone.level}</span>
      <strong>${zone.name}</strong>
      ${zone.fixed ? `<div>${accessLabels[current]}</div>` : `
      <select data-zone="${index}">
        ${['everyone','friend','named','self'].map(v => `<option value="${v}" ${current===v?'selected':''}>${accessLabels[v]}</option>`).join('')}
      </select>`}
    `;
    root.appendChild(el);
  });
  root.querySelectorAll('select[data-zone]').forEach(sel => {
    sel.addEventListener('change', e => {
      state.zones[Number(e.target.dataset.zone)] = e.target.value;
    });
  });
}

function canAccess(rule, visitor) {
  if (rule === 'everyone') return true;
  if (rule === 'friend') return visitor === 'friend' || visitor === 'named';
  if (rule === 'named') return visitor === 'named';
  return false;
}

function simulateVisit() {
  const visitor = document.getElementById('visitorType').value;
  const labels = { stranger:'陌生人', friend:'好友', named:'林' };
  let deepest = 'L0 公共领域';
  for (let i = 1; i < zoneDefs.length; i++) {
    const rule = zoneDefs[i].fixed || state.zones[i];
    if (canAccess(rule, visitor)) deepest = `${zoneDefs[i].level} ${zoneDefs[i].name}`;
    else break;
  }
  document.getElementById('visitResult').textContent = `${labels[visitor]}可以进入到：${deepest}。更深区域默认关闭。`;
}

function addTrace(text) {
  state.traces.unshift(text);
  const log = document.getElementById('traceLog');
  const el = document.createElement('div');
  el.className = 'trace';
  el.textContent = text;
  log.prepend(el);
  while (log.children.length > 6) log.removeChild(log.lastChild);
}

function moveTraveler() {
  const t = document.getElementById('traveler');
  const left = 55 + Math.floor(Math.random() * 25);
  const top = 90 + Math.floor(Math.random() * 45);
  t.style.left = `${left}%`;
  t.style.top = `${top}px`;
}

init();
