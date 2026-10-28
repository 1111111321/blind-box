/* ==========================================================================
   盲盒 · app.js
   1 物品与概率 · 2 存档 · 3 抽盒 · 4 首页 · 5 收藏册 · 6 概率页
   三个页面共用这个文件，靠 <body data-page="..."> 决定跑哪一段。
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     1 · 物品与概率
     ---------------------------------------------------------------------- */

  const RARITY = {
    N:   { key: 'N',   label: '普通', weight: 55,   order: 1 },
    R:   { key: 'R',   label: '稀有', weight: 27,   order: 2 },
    SR:  { key: 'SR',  label: '史诗', weight: 13,   order: 3 },
    SSR: { key: 'SSR', label: '传说', weight: 4.5,  order: 4 },
    UR:  { key: 'UR',  label: '隐藏', weight: 0.5,  order: 5 },
  };

  /* 史诗及以上算「出货」，保底只认这几档 */
  const HIGH = ['SR', 'SSR', 'UR'];

  /* 单色线稿：统一 48×48，描边用 currentColor，跟着文字颜色走 */
  const ICONS = {
    star: '<path d="M24 8l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L24 31.6 14.7 36.5l1.8-10.3-7.5-7.3 10.4-1.5z"/>',
    cloud: '<path d="M15 34h18a6.5 6.5 0 0 0 .6-13 9 9 0 0 0-17.2-2.2A6.6 6.6 0 0 0 15 34z"/>',
    mushroom: '<path d="M9 27a15 15 0 0 1 30 0z"/><path d="M20 27v8a4 4 0 0 0 8 0v-8"/>',
    strawberry: '<path d="M24 41c7.5-4.5 11.5-10.5 11.5-16.5A11.5 11.5 0 0 0 12.5 24.5C12.5 30.5 16.5 36.5 24 41z"/><path d="M17 12l7 5 7-5"/>',
    umbrella: '<path d="M7 25a17 17 0 0 1 34 0z"/><path d="M24 25v11a4 4 0 0 0 8 0"/>',
    rabbit: '<circle cx="24" cy="30" r="9"/><path d="M19 22c-2.5-6-2-12 1-12.5 3-.5 4.5 5.5 4 11"/><path d="M29 22c2.5-6 2-12-1-12.5-3-.5-4.5 5.5-4 11"/>',
    cat: '<circle cx="24" cy="29" r="10"/><path d="M16.5 21.5L15 12l8 4.5"/><path d="M31.5 21.5L33 12l-8 4.5"/>',
    whale: '<path d="M9 29c0-5.5 5-9 12-9 7.5 0 13 4.5 16.5 8-3.5 4.5-9.5 7-16.5 7-7.5 0-12-2.5-12-6z"/><path d="M37 30c3.5.5 5.5-1.5 5-4.5"/>',
    fox: '<path d="M24 39c-8-3.5-12-9.5-12-16l5.5-7.5 4.5 4.5h4l4.5-4.5L36 23c0 6.5-4 12.5-12 16z"/>',
    rocket: '<path d="M24 7c5.5 5 8 11.5 8 17l-8 8-8-8c0-5.5 2.5-12 8-17z"/><path d="M16 25l-4 8 7-2"/><path d="M32 25l4 8-7-2"/><path d="M24 36v7"/>',
    unicorn: '<path d="M27 10l-1.5 8.5"/><path d="M15 39V28c0-6.5 5-11.5 11.5-11.5S38 21.5 38 28v11"/><circle cx="30" cy="27" r="1.3" fill="currentColor" stroke="none"/>',
    ufo: '<ellipse cx="24" cy="30" rx="14" ry="4.5"/><path d="M17 30a7 7 0 0 1 14 0"/><path d="M19 35.5h.01"/><path d="M24 36.5h.01"/><path d="M29 35.5h.01"/>',
  };

  const ITEMS = [
    { id: 'star',     name: '小星星',   rarity: 'N',   icon: 'star' },
    { id: 'cloud',    name: '云朵',     rarity: 'N',   icon: 'cloud' },
    { id: 'mushroom', name: '蘑菇',     rarity: 'N',   icon: 'mushroom' },
    { id: 'berry',    name: '草莓',     rarity: 'N',   icon: 'strawberry' },
    { id: 'umbrella', name: '小雨伞',   rarity: 'N',   icon: 'umbrella' },
    { id: 'rabbit',   name: '兔兔',     rarity: 'R',   icon: 'rabbit' },
    { id: 'cat',      name: '猫猫',     rarity: 'R',   icon: 'cat' },
    { id: 'whale',    name: '鲸鱼',     rarity: 'R',   icon: 'whale' },
    { id: 'fox',      name: '小狐狸',   rarity: 'SR',  icon: 'fox' },
    { id: 'rocket',   name: '小火箭',   rarity: 'SR',  icon: 'rocket' },
    { id: 'unicorn',  name: '独角兽',   rarity: 'SSR', icon: 'unicorn' },
    { id: 'ufo',      name: '神秘飞碟', rarity: 'UR',  icon: 'ufo' },
  ];

  const BY_ID = {};
  ITEMS.forEach(function (item) { BY_ID[item.id] = item; });

  const PITY = 10;                 // 连续 10 抽没出史诗及以上，第 10 抽保底
  const BOXES = 12;                // 一箱 12 个盒子
  const STORE_KEY = 'xingyu.box.v1';

  const TOTAL_WEIGHT = Object.keys(RARITY).reduce(function (sum, k) {
    return sum + RARITY[k].weight;
  }, 0);

  function isHigh(rarity) { return HIGH.indexOf(rarity) > -1; }

  function glyph(icon, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 48 48" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + (ICONS[icon] || '') + '</svg>';
  }

  /* ----------------------------------------------------------------------
     2 · 存档：只存在本机浏览器
     ---------------------------------------------------------------------- */

  function emptyState() {
    return { draws: 0, counts: {}, pity: 0, history: [] };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyState();
      const data = JSON.parse(raw);
      return {
        draws: Number(data.draws) || 0,
        counts: data.counts && typeof data.counts === 'object' ? data.counts : {},
        pity: Math.max(0, Number(data.pity) || 0),
        history: Array.isArray(data.history) ? data.history.slice(0, 12) : [],
      };
    } catch (err) {
      return emptyState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      /* 无痕模式写不进去也能玩，只是刷新会丢 */
    }
  }

  function clearState() {
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
  }

  /* ----------------------------------------------------------------------
     3 · 抽盒：先按权重摇稀有度，再在该档里等概率取一件
     ---------------------------------------------------------------------- */

  function rollRarity(keys) {
    const pool = keys.map(function (k) { return RARITY[k]; });
    const total = pool.reduce(function (sum, r) { return sum + r.weight; }, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i += 1) {
      roll -= pool[i].weight;
      if (roll <= 0) return pool[i].key;
    }
    return pool[pool.length - 1].key;
  }

  function drawOne(state) {
    const forced = state.pity + 1 >= PITY;
    const rarity = rollRarity(forced ? HIGH : Object.keys(RARITY));
    const pool = ITEMS.filter(function (item) { return item.rarity === rarity; });
    const item = pool[Math.floor(Math.random() * pool.length)];
    const before = state.counts[item.id] || 0;

    state.counts[item.id] = before + 1;
    state.draws += 1;
    state.pity = isHigh(rarity) ? 0 : state.pity + 1;
    state.history.unshift(item.id);
    state.history = state.history.slice(0, 12);

    return {
      item: item,
      rarity: rarity,
      forced: forced,
      isNew: before === 0,
      count: before + 1,
      draws: state.draws,
      pityLeft: PITY - state.pity,
    };
  }

  function ownedCount(state) {
    return ITEMS.filter(function (item) { return (state.counts[item.id] || 0) > 0; }).length;
  }

  /* ----------------------------------------------------------------------
     4 · 首页：机台、开盒、结果
     ---------------------------------------------------------------------- */

  function initDrawPage() {
    const caseEl = document.getElementById('case');
    const freshBtn = document.getElementById('refillBtn');
    const recentEl = document.getElementById('recent');
    const liveEl = document.getElementById('live');

    const overlay = document.getElementById('overlay');
    const dialog = document.getElementById('reveal');
    const dGlyph = document.getElementById('revealGlyph');
    const dRarity = document.getElementById('revealRarity');
    const dName = document.getElementById('revealName');
    const dMeta = document.getElementById('revealMeta');
    const closeBtn = document.getElementById('revealClose');

    const statDraws = document.getElementById('statDraws');
    const statOwned = document.getElementById('statOwned');
    const statPity = document.getElementById('statPity');

    let state = loadState();
    let busy = false;
    let lastBox = null;
    const boxes = [];

    function buildCase() {
      caseEl.innerHTML = '';
      boxes.length = 0;

      for (let i = 0; i < BOXES; i += 1) {
        const box = document.createElement('button');
        box.type = 'button';
        box.className = 'box';
        box.setAttribute('aria-label', '第 ' + (i + 1) + ' 盒，未开启');
        box.innerHTML = '<span class="box__no">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="box__glyph"></span>';
        box.addEventListener('click', function () { openBox(i); });
        caseEl.appendChild(box);
        boxes.push(box);
      }
      freshBtn.hidden = true;
    }

    function closedBoxes() {
      const left = [];
      boxes.forEach(function (box, index) {
        if (!box.classList.contains('is-open')) left.push(index);
      });
      return left;
    }

    function openBox(index) {
      const box = boxes[index];
      if (busy || !box || box.classList.contains('is-open')) return;
      busy = true;
      lastBox = box;

      box.classList.add('is-shaking');

      window.setTimeout(function () {
        box.classList.remove('is-shaking');

        const result = drawOne(state);
        saveState(state);

        box.classList.add('is-open');
        box.dataset.rarity = result.rarity;
        box.querySelector('.box__glyph').innerHTML = glyph(result.item.icon, '');
        box.setAttribute('aria-label',
          '第 ' + (index + 1) + ' 盒，开出 ' + result.item.name + '（' + RARITY[result.rarity].label + '）');

        refreshStats();
        renderRecent();

        window.setTimeout(function () { showResult(result); }, 180);
      }, 420);
    }

    function showResult(result) {
      const meta = RARITY[result.rarity];

      dGlyph.innerHTML = glyph(result.item.icon, 'dialog__glyph');
      dRarity.textContent = meta.label;
      dName.textContent = result.item.name;

      let text = '第 ' + result.draws + ' 抽 · ' +
        (result.isNew ? '新藏品' : '重复，已有 ' + result.count + ' 个');
      if (result.forced) text += ' · 保底触发';
      dMeta.innerHTML = text.replace('新藏品', '<b>新藏品</b>');

      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      liveEl.textContent = '开出了' + meta.label + '「' + result.item.name + '」';
      closeBtn.focus();

      if (closedBoxes().length === 0) freshBtn.hidden = false;
    }

    function closeResult() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      busy = false;
      if (lastBox) { lastBox.focus(); lastBox = null; }
    }

    function refreshStats() {
      statDraws.textContent = state.draws;
      statOwned.textContent = ownedCount(state) + '/' + ITEMS.length;
      statPity.textContent = state.pity >= PITY - 1 ? '下一抽必出史诗+' : '还差 ' + (PITY - state.pity) + ' 抽';
    }

    function renderRecent() {
      if (!state.history.length) { recentEl.textContent = ''; return; }

      const names = state.history.slice(0, 6).map(function (id) {
        const item = BY_ID[id];
        return item ? '<b>' + item.name + '</b>' : '';
      }).filter(Boolean);

      recentEl.innerHTML = '最近开出：' + names.join('、');
    }

    function openRandom() {
      const left = closedBoxes();
      if (!left.length) return;
      openBox(left[Math.floor(Math.random() * left.length)]);
    }

    closeBtn.addEventListener('click', closeResult);
    document.getElementById('acceptBtn').addEventListener('click', closeResult);
    document.getElementById('againBtn').addEventListener('click', function () {
      closeResult();
      window.setTimeout(openRandom, 120);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeResult();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) closeResult();
    });
    freshBtn.addEventListener('click', function () {
      buildCase();
      refreshStats();
      liveEl.textContent = '新的一箱已经装好';
    });

    buildCase();
    refreshStats();
    renderRecent();
  }

  /* ----------------------------------------------------------------------
     5 · 收藏册
     ---------------------------------------------------------------------- */

  function initCollectionPage() {
    const grid = document.getElementById('grid');
    const fill = document.getElementById('progressFill');
    const text = document.getElementById('progressText');
    const resetBtn = document.getElementById('resetBtn');
    const liveEl = document.getElementById('live');

    function render() {
      const state = loadState();
      const owned = ownedCount(state);

      grid.innerHTML = '';

      ITEMS.slice()
        .sort(function (a, b) {
          return RARITY[a.rarity].order - RARITY[b.rarity].order || a.name.localeCompare(b.name, 'zh');
        })
        .forEach(function (item) {
          const count = state.counts[item.id] || 0;
          const found = count > 0;
          const meta = RARITY[item.rarity];

          const card = document.createElement('article');
          card.className = 'card ' + (found ? 'card--found' : 'card--locked');
          if (found) card.dataset.rarity = item.rarity;

          card.innerHTML =
            (found ? glyph(item.icon, 'card__glyph') : '<span class="card__glyph card__glyph--none" aria-hidden="true">—</span>') +
            '<span class="card__name">' + (found ? item.name : '未解锁') + '</span>' +
            '<span class="card__meta">' + (found ? meta.label : '—') + '</span>' +
            (count > 1 ? '<span class="card__count">已有 ' + count + ' 个</span>' : '');

          grid.appendChild(card);
        });

      const percent = Math.round((owned / ITEMS.length) * 100);
      fill.style.width = percent + '%';
      text.textContent = owned + ' / ' + ITEMS.length + ' · ' + percent + '%';

      if (owned === ITEMS.length) liveEl.textContent = '全部收集完成';
    }

    resetBtn.addEventListener('click', function () {
      if (!window.confirm('确定清空收藏和全部记录吗？这个操作不能撤销。')) return;
      clearState();
      render();
      liveEl.textContent = '收藏已清空';
    });

    render();
  }

  /* ----------------------------------------------------------------------
     6 · 概率页：表格由数据算出来，改数据不用改 HTML
     ---------------------------------------------------------------------- */

  function initOddsPage() {
    const body = document.getElementById('oddsBody');
    const list = document.getElementById('itemList');

    Object.keys(RARITY)
      .map(function (key) { return RARITY[key]; })
      .sort(function (a, b) { return a.order - b.order; })
      .forEach(function (meta) {
        const items = ITEMS.filter(function (item) { return item.rarity === meta.key; });
        const share = (meta.weight / TOTAL_WEIGHT) * 100;

        const row = document.createElement('tr');
        row.innerHTML =
          '<td>' + meta.label + '</td>' +
          '<td>' + items.length + ' 件</td>' +
          '<td>' + fmt(share) + '%</td>' +
          '<td>' + fmt(share / items.length) + '%</td>';
        body.appendChild(row);
      });

    ITEMS.slice()
      .sort(function (a, b) { return RARITY[a.rarity].order - RARITY[b.rarity].order; })
      .forEach(function (item) {
        const meta = RARITY[item.rarity];
        const count = ITEMS.filter(function (other) { return other.rarity === item.rarity; }).length;
        const each = ((meta.weight / TOTAL_WEIGHT) * 100) / count;

        const li = document.createElement('li');
        li.innerHTML =
          glyph(item.icon, 'li-glyph') +
          '<span class="li-name">' + item.name + '</span>' +
          '<span class="li-meta">' + meta.label + '</span>' +
          '<span class="li-chance">' + fmt(each) + '%</span>';
        list.appendChild(li);
      });
  }

  function fmt(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  /* ----------------------------------------------------------------------
     启动
     ---------------------------------------------------------------------- */

  const page = document.body.dataset.page;
  if (page === 'draw') initDrawPage();
  if (page === 'collection') initCollectionPage();
  if (page === 'odds') initOddsPage();
}());
