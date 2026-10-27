/* ==========================================================================
   星屿盲盒 · app.js
   1) 数据  2) 存档  3) 抽盒  4) 首页渲染  5) 收藏册  6) 概率页
   三个页面共用这一个文件，靠 <body data-page="..."> 决定跑哪一段。
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     1 · 数据：稀有度权重 + 十二个藏品
     ---------------------------------------------------------------------- */

  const RARITY = {
    N:   { key: 'N',   label: '普通', weight: 55,  color: '#94a3b8', order: 1 },
    R:   { key: 'R',   label: '稀有', weight: 27,  color: '#3ba7e0', order: 2 },
    SR:  { key: 'SR',  label: '史诗', weight: 13,  color: '#a35bf0', order: 3 },
    SSR: { key: 'SSR', label: '传说', weight: 4.5, color: '#f0952b', order: 4 },
    UR:  { key: 'UR',  label: '隐藏', weight: 0.5, color: '#f43f7e', order: 5 },
  };

  /* 史诗及以上才算「出货」，保底只认这几档 */
  const HIGH = ['SR', 'SSR', 'UR'];

  const ITEMS = [
    { id: 'star',     name: '小星星',   emoji: '⭐',  rarity: 'N' },
    { id: 'cloud',    name: '云朵',     emoji: '☁️', rarity: 'N' },
    { id: 'mushroom', name: '蘑菇',     emoji: '🍄', rarity: 'N' },
    { id: 'berry',    name: '草莓',     emoji: '🍓', rarity: 'N' },
    { id: 'umbrella', name: '小雨伞',   emoji: '☂️', rarity: 'N' },
    { id: 'rabbit',   name: '兔兔',     emoji: '🐰', rarity: 'R' },
    { id: 'cat',      name: '猫猫',     emoji: '🐱', rarity: 'R' },
    { id: 'whale',    name: '鲸鱼',     emoji: '🐳', rarity: 'R' },
    { id: 'fox',      name: '小狐狸',   emoji: '🦊', rarity: 'SR' },
    { id: 'rocket',   name: '小火箭',   emoji: '🚀', rarity: 'SR' },
    { id: 'unicorn',  name: '独角兽',   emoji: '🦄', rarity: 'SSR' },
    { id: 'ufo',      name: '神秘飞碟', emoji: '🛸', rarity: 'UR' },
  ];

  const BY_ID = {};
  ITEMS.forEach(function (item) { BY_ID[item.id] = item; });

  const PITY = 10;                      // 连续 10 抽不出史诗及以上，第 10 抽保底
  const BOXES = 12;                     // 一箱 12 个盒子
  const STORE_KEY = 'xingyu.box.v1';

  const TOTAL_WEIGHT = Object.keys(RARITY).reduce(function (sum, k) {
    return sum + RARITY[k].weight;
  }, 0);

  const isHigh = function (rarity) { return HIGH.indexOf(rarity) > -1; };

  /* ----------------------------------------------------------------------
     2 · 存档：全部存在浏览器本地，不上传任何服务器
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
     3 · 抽盒：先按权重摇稀有度，再在该稀有度里等概率取一个
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
    const forced = state.pity + 1 >= PITY;                 // 这一抽是不是保底
    const rarity = rollRarity(forced ? HIGH : Object.keys(RARITY));
    const pool = ITEMS.filter(function (item) { return item.rarity === rarity; });
    const item = pool[Math.floor(Math.random() * pool.length)];
    const before = state.counts[item.id] || 0;

    state.counts[item.id] = before + 1;
    state.draws += 1;
    state.pity = isHigh(rarity) ? 0 : state.pity + 1;
    state.history.unshift({ id: item.id, forced: forced });
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
     4 · 首页：机台、开盒、结果浮层
     ---------------------------------------------------------------------- */

  function initDrawPage() {
    const caseEl = document.getElementById('case');
    const freshBtn = document.getElementById('refillBtn');
    const recentEl = document.getElementById('recent');
    const liveEl = document.getElementById('live');

    const overlay = document.getElementById('overlay');
    const reveal = document.getElementById('reveal');
    const revealEmoji = document.getElementById('revealEmoji');
    const revealRarity = document.getElementById('revealRarity');
    const revealName = document.getElementById('revealName');
    const revealMeta = document.getElementById('revealMeta');

    const statDraws = document.getElementById('statDraws');
    const statOwned = document.getElementById('statOwned');
    const statPity = document.getElementById('statPity');

    let state = loadState();
    let busy = false;               // 动画期间不接受点击
    let current = null;             // 当前结果
    const boxes = [];

    /* ---- 机台 ---- */
    function buildCase() {
      caseEl.innerHTML = '';
      boxes.length = 0;
      for (let i = 0; i < BOXES; i += 1) {
        const box = document.createElement('button');
        box.type = 'button';
        box.className = 'box';
        box.setAttribute('aria-label', '第 ' + (i + 1) + ' 号盲盒，未开启');
        box.innerHTML =
          '<span class="box__lid" aria-hidden="true"></span>' +
          '<span class="box__q" aria-hidden="true">?</span>' +
          '<span class="box__yes" aria-hidden="true"></span>';
        box.addEventListener('click', function () { openBox(i); });
        caseEl.appendChild(box);
        boxes.push(box);
      }
      freshBtn.hidden = true;
    }

    function emptyBoxes() {
      return boxes.filter(function (box) { return !box.classList.contains('is-open'); })
        .map(function (box) { return boxes.indexOf(box); });
    }

    /* ---- 开一个盒子 ---- */
    function openBox(index) {
      const box = boxes[index];
      if (busy || !box || box.classList.contains('is-open')) return;
      busy = true;

      box.classList.add('is-shaking');

      window.setTimeout(function () {
        box.classList.remove('is-shaking');

        const result = drawOne(state);
        saveState(state);
        current = result;

        box.classList.add('is-open');
        box.style.setProperty('--rarity', RARITY[result.rarity].color);
        box.querySelector('.box__yes').textContent = result.item.emoji;
        box.setAttribute(
          'aria-label',
          '第 ' + (index + 1) + ' 号盲盒，开出 ' + result.item.name + '（' + RARITY[result.rarity].label + '）'
        );

        refreshStats();
        renderRecent();

        window.setTimeout(function () { showReveal(result); }, 260);
      }, 520);
    }

    /* ---- 结果浮层 ---- */
    function showReveal(result) {
      const meta = RARITY[result.rarity];

      reveal.style.setProperty('--rarity', meta.color);
      reveal.classList.toggle('is-legendary', result.rarity === 'SSR' || result.rarity === 'UR');
      revealEmoji.textContent = result.item.emoji;
      revealRarity.textContent = meta.label;
      revealName.textContent = result.item.name;

      let text = '第 ' + result.draws + ' 抽 · ' + (result.isNew ? '新藏品！' : '重复，已有 ' + result.count + ' 个');
      if (result.forced) text += ' · 保底触发';
      revealMeta.innerHTML = text.replace('新藏品！', '<b>新藏品！</b>');

      drawConfetti(meta.color, result.rarity === 'SSR' || result.rarity === 'UR');

      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      liveEl.textContent = '开出了' + meta.label + '『' + result.item.name + '』';
      document.getElementById('revealClose').focus();

      if (emptyBoxes().length === 0) freshBtn.hidden = false;
    }

    function closeReveal() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      reveal.classList.remove('is-legendary');
      current = null;
      busy = false;
    }

    function drawConfetti(color, plenty) {
      const old = reveal.querySelector('.confetti');
      if (old) old.remove();
      if (!plenty) return;

      const layer = document.createElement('div');
      layer.className = 'confetti';
      layer.setAttribute('aria-hidden', 'true');
      const palette = [color, '#ff6f9c', '#8a6bff', '#fdd85d', '#ffffff'];

      for (let i = 0; i < 22; i += 1) {
        const piece = document.createElement('i');
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = palette[i % palette.length];
        piece.style.animationDuration = (1.1 + Math.random() * 1.1).toFixed(2) + 's';
        piece.style.animationDelay = (Math.random() * 0.35).toFixed(2) + 's';
        piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
        layer.appendChild(piece);
      }
      reveal.appendChild(layer);
    }

    /* ---- 统计与最近记录 ---- */
    function refreshStats() {
      statDraws.textContent = state.draws;
      statOwned.textContent = ownedCount(state) + '/' + ITEMS.length;
      statPity.textContent = state.pity >= PITY - 1 ? '下一抽必出史诗+' : '还差 ' + (PITY - state.pity) + ' 抽';
    }

    function renderRecent() {
      recentEl.innerHTML = '';
      if (!state.history.length) return;

      const label = document.createElement('span');
      label.className = 'recent__label';
      label.textContent = '最近开出';
      recentEl.appendChild(label);

      state.history.slice(0, 8).forEach(function (entry) {
        const item = BY_ID[entry.id];
        if (!item) return;
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.setProperty('--rarity', RARITY[item.rarity].color);
        chip.innerHTML = '<i>' + item.emoji + '</i>' + item.name;
        recentEl.appendChild(chip);
      });
    }

    /* ---- 事件 ---- */
    function randomOpen() {
      const left = emptyBoxes();
      if (!left.length) return;
      openBox(left[Math.floor(Math.random() * left.length)]);
    }

    document.getElementById('revealClose').addEventListener('click', closeReveal);
    document.getElementById('acceptBtn').addEventListener('click', closeReveal);
    document.getElementById('againBtn').addEventListener('click', function () {
      closeReveal();
      window.setTimeout(randomOpen, 120);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeReveal();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) closeReveal();
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
        .sort(function (a, b) { return RARITY[a.rarity].order - RARITY[b.rarity].order || a.name.localeCompare(b.name, 'zh'); })
        .forEach(function (item) {
          const count = state.counts[item.id] || 0;
          const found = count > 0;
          const meta = RARITY[item.rarity];

          const card = document.createElement('article');
          card.className = 'card ' + (found ? 'card--found' : 'card--locked');
          card.style.setProperty('--rarity', meta.color);
          card.innerHTML =
            '<span class="card__art">' + (found ? item.emoji : '?') + '</span>' +
            '<span class="card__name">' + (found ? item.name : '未解锁') + '</span>' +
            '<span class="card__tag">' + (found ? meta.label : '？？？') + '</span>' +
            (count > 1 ? '<span class="card__count">×' + count + '</span>' : '');
          grid.appendChild(card);
        });

      const percent = Math.round((owned / ITEMS.length) * 100);
      fill.style.width = percent + '%';
      text.textContent = owned + ' / ' + ITEMS.length + ' · ' + percent + '%';

      if (owned === ITEMS.length) {
        liveEl.textContent = '全部收集完成';
      }
    }

    resetBtn.addEventListener('click', function () {
      if (!window.confirm('确定清空收藏和全部记录吗？此操作不能撤销。')) return;
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
      .forEach(function (meta) {
        const items = ITEMS.filter(function (item) { return item.rarity === meta.key; });
        const share = (meta.weight / TOTAL_WEIGHT) * 100;
        const each = share / items.length;

        const row = document.createElement('tr');
        row.innerHTML =
          '<td><span class="dot" style="background:' + meta.color + '"></span>' + meta.label + '</td>' +
          '<td>' + items.length + ' 件</td>' +
          '<td>' + fmt(share) + '%</td>' +
          '<td>' + fmt(each) + '%</td>';
        body.appendChild(row);
      });

    ITEMS.slice()
      .sort(function (a, b) { return RARITY[a.rarity].order - RARITY[b.rarity].order; })
      .forEach(function (item) {
        const meta = RARITY[item.rarity];
        const items = ITEMS.filter(function (other) { return other.rarity === item.rarity; });
        const each = ((meta.weight / TOTAL_WEIGHT) * 100) / items.length;

        const li = document.createElement('li');
        li.innerHTML =
          '<span style="font-size:1.1rem">' + item.emoji + '</span>' +
          '<b>' + item.name + '</b>' +
          '<span style="color:' + meta.color + ';font-weight:700">' + meta.label + '</span>' +
          '<span style="margin-left:auto;color:var(--muted)">' + fmt(each) + '%</span>';
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
