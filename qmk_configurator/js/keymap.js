// ═══════════════════════════════════════════════════
// KEYMAP EDITOR
// ═══════════════════════════════════════════════════
function initKeymapData() {
  const rows = matrixState.rows || parseInt(document.getElementById('kbRows').value) || 4;
  const cols = matrixState.cols || parseInt(document.getElementById('kbCols').value) || 6;
  keymapData = [];
  for (let l = 0; l < LAYER_NAMES.length; l++) {
    const layer = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols * 2; c++) row.push('KC_NO');
      layer.push(row);
    }
    keymapData.push(layer);
  }
}

function initKeymap() {
  if (keymapData.length === 0) initKeymapData();
  renderLayerTabs();
  rebuildKeyboard();
  initKeycodeGrid();
  const sub = document.getElementById('keymapSubtitle');
  if (sub && keymapPath) sub.textContent = keymapPath + ' — click a key to assign a keycode';
}

function rebuildKeyboard() {
  const vis = document.getElementById('keyboardVisual');
  vis.innerHTML = '';
  vis.style.position = '';
  vis.style.width = '';
  vis.style.height = '';

  if (layoutKeys.length === 0) return;

  if (keymapData.length === 0 || !keymapData[currentLayer]) initKeymapData();

  const rows   = matrixState.rows || parseInt(document.getElementById('kbRows').value) || 4;
  const cols   = matrixState.cols || parseInt(document.getElementById('kbCols').value) || 6;
  const unitPx = parseInt(document.getElementById('layoutUnitPx')?.value) || 54;
  const GAP    = 4;

  let maxX = 0, maxY = 0;
  layoutKeys.forEach(k => {
    maxX = Math.max(maxX, k.x + (k.w || 1));
    maxY = Math.max(maxY, k.y + (k.h || 1));
  });

  vis.style.position = 'relative';
  vis.style.width    = (maxX * unitPx + GAP * 2) + 'px';
  vis.style.height   = (maxY * unitPx + GAP * 2) + 'px';

  layoutKeys.forEach(lk => {
    const [matRow, matCol] = lk.matrix;
    // Convert matrix coords → visual grid coords used by keymapData
    const vRow = matRow < rows ? matRow : matRow - rows;
    const vCol = matRow < rows ? matCol : matCol + cols;

    const kc  = keymapData[currentLayer]?.[vRow]?.[vCol] || 'KC_NO';
    const div = document.createElement('div');
    div.className    = 'key';
    div.style.position = 'absolute';
    div.style.left   = (lk.x * unitPx + GAP) + 'px';
    div.style.top    = (lk.y * unitPx + GAP) + 'px';
    div.style.width  = ((lk.w || 1) * unitPx - GAP) + 'px';
    div.style.height = ((lk.h || 1) * unitPx - GAP) + 'px';
    div.dataset.row  = vRow;
    div.dataset.col  = vCol;
    div.innerHTML    = `<span class="key-label">${formatKeyLabel(kc)}</span>`;
    div.addEventListener('click', () => selectKey(div, vRow, vCol));
    vis.appendChild(div);
  });
}

function selectKey(el, r, c) {
  document.querySelectorAll('.key').forEach(k => k.classList.remove('selected'));
  el.classList.add('selected');
  selectedKey = { el, r, c };
  const kc = keymapData[currentLayer]?.[r]?.[c] || 'KC_TRNS';
  document.getElementById('selectedKeyLabel').textContent = `Row ${r}, Col ${c} — ${kc}`;
}

function assignKeycode(kc) {
  if (!selectedKey) { toast('Select a key first', 'error'); return; }
  const { el, r, c } = selectedKey;
  if (!keymapData[currentLayer]) keymapData[currentLayer] = [];
  if (!keymapData[currentLayer][r]) keymapData[currentLayer][r] = [];
  keymapData[currentLayer][r][c] = kc;
  el.querySelector('.key-label').textContent = formatKeyLabel(kc);
  document.getElementById('selectedKeyLabel').textContent = `Row ${r}, Col ${c} — ${kc}`;
}

function formatKeyLabel(kc) {
  return kc.replace(/^KC_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()).substring(0, 8);
}

// ─── Dynamic layer tabs ───
function renderLayerTabs() {
  const container = document.getElementById('layerTabs');
  container.innerHTML = '';
  LAYER_NAMES.forEach((name, i) => {
    const tab = document.createElement('div');
    tab.className = 'layer-tab' + (i === currentLayer ? ' active' : '');
    tab.dataset.layer = i;
    tab.textContent = name;
    if (LAYER_NAMES.length > 1) {
      const rm = document.createElement('span');
      rm.className = 'remove-layer';
      rm.title = 'Remove layer';
      rm.textContent = '×';
      rm.addEventListener('click', (e) => { e.stopPropagation(); removeLayer(i); });
      tab.appendChild(rm);
    }
    tab.addEventListener('click', () => {
      currentLayer = i;
      renderLayerTabs();
      rebuildKeyboard();
      const inp = document.getElementById('layerNameInput');
      if (inp) inp.value = LAYER_NAMES[currentLayer] || '';
    });
    container.appendChild(tab);
  });
  const addTab = document.createElement('div');
  addTab.className = 'layer-tab add-layer';
  addTab.textContent = '+ Add Layer';
  addTab.addEventListener('click', addLayer);
  container.appendChild(addTab);
  const inp = document.getElementById('layerNameInput');
  if (inp) inp.value = LAYER_NAMES[currentLayer] || '';
}

function addLayer() {
  const idx = LAYER_NAMES.length;
  LAYER_NAMES.push('LAYER_' + idx);
  const rows = matrixState.rows || parseInt(document.getElementById('kbRows').value) || 4;
  const cols = matrixState.cols || parseInt(document.getElementById('kbCols').value) || 6;
  const layer = [];
  for (let r = 0; r < rows; r++) { const row = []; for (let c = 0; c < cols * 2; c++) row.push('KC_NO'); layer.push(row); }
  keymapData.push(layer);
  currentLayer = idx;
  renderLayerTabs();
  rebuildKeyboard();
  toast(`Added ${LAYER_NAMES[idx]}`, 'success');
}

function removeLayer(idx) {
  if (LAYER_NAMES.length <= 1) { toast('Cannot remove the last layer', 'error'); return; }
  const name = LAYER_NAMES[idx];
  LAYER_NAMES.splice(idx, 1);
  keymapData.splice(idx, 1);
  if (currentLayer >= LAYER_NAMES.length) currentLayer = LAYER_NAMES.length - 1;
  renderLayerTabs();
  rebuildKeyboard();
  toast(`Removed ${name}`, 'success');
}

// Wire layer name input to rename current layer
document.getElementById('layerNameInput').addEventListener('input', (e) => {
  const name = e.target.value.trim();
  if (!name) return;
  LAYER_NAMES[currentLayer] = name;
  const activeTab = document.querySelector('.layer-tab.active[data-layer]');
  if (activeTab) {
    const rm = activeTab.querySelector('.remove-layer');
    activeTab.textContent = name;
    if (rm) activeTab.appendChild(rm);
  }
});

// ═══════════════════════════════════════════════════
// KEYCODE GRID
// ═══════════════════════════════════════════════════
const KEYCODES = {
  Basic: ['KC_A','KC_B','KC_C','KC_D','KC_E','KC_F','KC_G','KC_H','KC_I','KC_J','KC_K','KC_L','KC_M','KC_N','KC_O','KC_P','KC_Q','KC_R','KC_S','KC_T','KC_U','KC_V','KC_W','KC_X','KC_Y','KC_Z','KC_1','KC_2','KC_3','KC_4','KC_5','KC_6','KC_7','KC_8','KC_9','KC_0'],
  Special: ['KC_ENT','KC_ESC','KC_BSPC','KC_TAB','KC_SPC','KC_MINS','KC_EQL','KC_LBRC','KC_RBRC','KC_BSLS','KC_SCLN','KC_QUOT','KC_GRV','KC_COMM','KC_DOT','KC_SLSH','KC_CAPS','KC_DEL','KC_INS','KC_HOME','KC_END','KC_PGUP','KC_PGDN'],
  Fn: ['KC_F1','KC_F2','KC_F3','KC_F4','KC_F5','KC_F6','KC_F7','KC_F8','KC_F9','KC_F10','KC_F11','KC_F12'],
  Mods: ['KC_LSFT','KC_RSFT','KC_LCTL','KC_RCTL','KC_LALT','KC_RALT','KC_LGUI','KC_RGUI','KC_MEH','KC_HYPR'],
  Layers: ['MO(1)','MO(2)','MO(3)','TG(1)','TG(2)','TG(3)','TO(0)','TO(1)','TO(2)','LT(1,KC_SPC)','LT(2,KC_SPC)','DF(0)','DF(1)','OSL(1)','OSM(MOD_LSFT)'],
  Mouse: ['KC_BTN1','KC_BTN2','KC_BTN3','KC_BTN4','KC_BTN5','KC_MS_U','KC_MS_D','KC_MS_L','KC_MS_R','KC_WH_U','KC_WH_D','KC_ACL0','KC_ACL1','KC_ACL2'],
  Media: ['KC_MPLY','KC_MNXT','KC_MPRV','KC_MSTP','KC_MUTE','KC_VOLU','KC_VOLD','KC_BRIU','KC_BRID'],
  Misc: ['KC_TRNS','KC_NO','QK_BOOT','QK_REBOOT','EE_CLR','QK_MAKE'],
};

let activeCat = 'Basic';

function initKeycodeGrid() {
  const catsEl = document.getElementById('keycodeCats');
  catsEl.innerHTML = '';
  Object.keys(KEYCODES).forEach(cat => {
    const btn = document.createElement('div');
    btn.className = 'cat-btn' + (cat === activeCat ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCat = cat;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderKeycodeGrid(cat);
    });
    catsEl.appendChild(btn);
  });
  renderKeycodeGrid(activeCat);

  document.getElementById('keycodeSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    if (!q) { renderKeycodeGrid(activeCat); return; }
    const all = Object.values(KEYCODES).flat();
    const filtered = all.filter(k => k.toLowerCase().includes(q));
    renderKeycodeGrid(null, filtered);
  });
}

function renderKeycodeGrid(cat, override) {
  const grid = document.getElementById('keycodeGrid');
  grid.innerHTML = '';
  const list = override || KEYCODES[cat] || [];
  list.forEach(kc => {
    const chip = document.createElement('div');
    chip.className = 'kc-chip';
    chip.textContent = kc;
    chip.addEventListener('click', () => assignKeycode(kc));
    grid.appendChild(chip);
  });
}
