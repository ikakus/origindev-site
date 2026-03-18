// ═══════════════════════════════════════════════════
// LAYOUT EDITOR
// ═══════════════════════════════════════════════════
let layoutKeys = [];    // [{matrix:[r,c], x, y, w, h, label}]
// Multi-select: Set of indices
let selectedKeyIdxs = new Set();

function _updateDeleteSelBtn() {
  const btn = document.getElementById('layoutDeleteSelBtn');
  if (btn) btn.style.display = selectedKeyIdxs.size > 0 ? 'inline-flex' : 'none';
}

function getLayoutFromRaw() {
  const nameEl = document.getElementById('layoutName');
  let name = nameEl?.value || 'LAYOUT';

  // If the named layout doesn't exist, fall back to first available key
  if (_rawInfoJson?.layouts && !_rawInfoJson.layouts[name]) {
    const firstKey = Object.keys(_rawInfoJson.layouts)[0];
    if (firstKey) {
      name = firstKey;
      if (nameEl) nameEl.value = firstKey;
    }
  }

  const raw = _rawInfoJson?.layouts?.[name]?.layout;
  if (Array.isArray(raw) && raw.length > 0) {
    layoutKeys = raw.map(k => ({
      matrix: k.matrix ? [...k.matrix] : [0,0],
      x:      k.x ?? 0,
      y:      k.y ?? 0,
      w:      k.w ?? 1,
      h:      k.h ?? 1,
      label:  k.label || '',
    }));
  }
}

function generateLayoutFromMatrix(silent) {
  // Auto-generate a split layout from matrixState
  // Left half: rows 0..rows-1, cols 0..cols-1
  // Right half: same rows, cols offset by (cols+1) in x
  const rows = matrixState.rows;
  const cols = matrixState.cols;
  layoutKeys = [];
  const GAP = 1; // 1u gap between halves

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Left half
      layoutKeys.push({ matrix:[r, c], x: c, y: r, w:1, h:1, label:'' });
      // Right half — matrix rows offset by rows, cols in natural order
      layoutKeys.push({ matrix:[r + rows, c], x: cols + GAP + c, y: r, w:1, h:1, label:'' });
    }
  }
  revalidateLayout();
  renderLayoutCanvas();
  updateLayoutJsonPreview();
  rebuildKeyboard();
  if (!silent) toast('Generated layout from matrix — adjust positions as needed', 'success');
}

// Cached conflict set — only recomputed when matrix row/col fields change, not on drag
let _cachedConflicts = new Set();

function revalidateLayout() {
  const { dupes, oob } = getConflictIdxs();
  _cachedConflicts = { dupes, oob };
  updateConflictBanner(dupes, oob);
  _updateAddKeyBtn(dupes, oob);
}

function _updateAddKeyBtn(dupes, oob) {
  const btn = document.getElementById('layoutAddKeyBtn');
  if (!btn) return;
  // Count distinct used [row,col] positions (excluding oob which aren't real slots)
  const usedSlots = new Set(layoutKeys
    .filter((k, i) => !oob.has(i))
    .map(k => k.matrix[0] + ',' + k.matrix[1])
  );
  const maxRow = matrixState.rows * 2;  // total rows both halves
  const maxCol = matrixState.cols;
  const totalSlots = maxRow * maxCol;
  const full = usedSlots.size >= totalSlots;
  btn.disabled = full;
  btn.title = full ? `All ${totalSlots} matrix positions used (${maxRow} rows × ${maxCol} cols)` : '';
}

function getConflictIdxs() {
  // Returns { dupes: Set<idx>, oob: Set<idx> }
  // dupes = matrix[row,col] used more than once
  // oob   = matrix[row,col] outside the actual matrix dimensions
  //
  // For a split keyboard: valid rows = 0 .. (matrixState.rows * 2 - 1)
  //                       valid cols = 0 .. (matrixState.cols - 1)
  const maxRow = matrixState.rows * 2 - 1;  // both halves
  const maxCol = matrixState.cols - 1;

  const seen  = {};
  const dupes = new Set();
  const oob   = new Set();

  layoutKeys.forEach((k, i) => {
    const r = k.matrix[0], c = k.matrix[1];

    // Out-of-bounds check
    if (r < 0 || r > maxRow || c < 0 || c > maxCol) {
      oob.add(i);
    }

    // Duplicate check
    const key = r + ',' + c;
    if (seen[key] !== undefined) {
      dupes.add(seen[key]);
      dupes.add(i);
    } else {
      seen[key] = i;
    }
  });

  return { dupes, oob };
}

function updateConflictBanner(dupes, oob) {
  const box      = document.getElementById('layoutConflictBox');
  const dupesEl  = document.getElementById('layoutConflictDupes');
  const oobEl    = document.getElementById('layoutConflictOob');
  if (!box) return;

  const hasIssues = dupes.size > 0 || oob.size > 0;
  box.style.display = hasIssues ? 'block' : 'none';
  if (!hasIssues) return;

  // ── Duplicates ──
  if (dupes.size > 0) {
    const grouped = {};
    dupes.forEach(i => {
      const k = layoutKeys[i];
      const key = `[${k.matrix[0]},${k.matrix[1]}]`;
      grouped[key] = (grouped[key] || 0) + 1;
    });
    dupesEl.style.display = 'block';
    dupesEl.textContent = 'Duplicate position: '
      + Object.entries(grouped).map(([pos, n]) => `matrix${pos} ×${n + 1}`).join('  ');
  } else {
    dupesEl.style.display = 'none';
  }

  // ── Out of bounds ──
  if (oob.size > 0) {
    const maxRow = matrixState.rows * 2 - 1;
    const maxCol = matrixState.cols - 1;
    const positions = [...oob].map(i => {
      const k = layoutKeys[i];
      return `[${k.matrix[0]},${k.matrix[1]}]`;
    });
    oobEl.style.display = 'block';
    oobEl.textContent = `Out of bounds (max row ${maxRow}, max col ${maxCol}): `
      + [...new Set(positions)].join('  ');
  } else {
    oobEl.style.display = 'none';
  }
}

// ── Single shared drag state — set up ONCE, never inside a render loop ──
const _lkDrag = {
  active: false,
  startMX: 0, startMY: 0,
  startPositions: [],   // snapshot of all key positions at drag start
  unitPx: 54,
};

window.addEventListener('mousemove', (e) => {
  if (!_lkDrag.active) return;
  const dx = (e.clientX - _lkDrag.startMX) / _lkDrag.unitPx;
  const dy = (e.clientY - _lkDrag.startMY) / _lkDrag.unitPx;
  selectedKeyIdxs.forEach(idx => {
    if (!_lkDrag.startPositions[idx]) return;
    layoutKeys[idx].x = Math.max(0, Math.round((_lkDrag.startPositions[idx].x + dx) * 4) / 4);
    layoutKeys[idx].y = Math.max(0, Math.round((_lkDrag.startPositions[idx].y + dy) * 4) / 4);
  });
  renderLayoutCanvas();
  _syncKeyEditor();
  updateLayoutJsonPreview();
});

window.addEventListener('mouseup', () => {
  _lkDrag.active = false;
});

function renderLayoutCanvas() {
  const canvas = document.getElementById('layoutCanvas');
  if (!canvas) return;

  const unitPx = parseInt(document.getElementById('layoutUnitPx')?.value) || 54;
  _lkDrag.unitPx = unitPx;
  const GAP = 4;

  let maxX = 0, maxY = 0;
  layoutKeys.forEach(k => {
    maxX = Math.max(maxX, k.x + (k.w || 1));
    maxY = Math.max(maxY, k.y + (k.h || 1));
  });
  const W = Math.max(maxX * unitPx + GAP * 2, 200);
  const H = Math.max(maxY * unitPx + GAP * 2, 120);

  canvas.style.setProperty('--lk-unit', unitPx + 'px');
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.position = 'relative';
  canvas.innerHTML = '';

  // Grid background
  const grid = document.createElement('div');
  grid.className = 'layout-grid-bg';
  canvas.appendChild(grid);

  // Use cached conflict set — only recomputed when matrix row/col fields change
  const conflictIdxs = _cachedConflicts;

  layoutKeys.forEach((k, i) => {
    const el = document.createElement('div');
    const isSel   = selectedKeyIdxs.has(i);
    const isDupe  = _cachedConflicts?.dupes?.has(i) || false;
    const isOob   = _cachedConflicts?.oob?.has(i)   || false;
    el.className  = 'lk'
      + (isSel  ? ' selected'      : '')
      + (isDupe ? ' conflict-dupe' : '')
      + (isOob  ? ' conflict-oob'  : '');
    el.style.left   = (k.x * unitPx + GAP) + 'px';
    el.style.top    = (k.y * unitPx + GAP) + 'px';
    el.style.width  = ((k.w || 1) * unitPx - GAP) + 'px';
    el.style.height = ((k.h || 1) * unitPx - GAP) + 'px';

    el.innerHTML = `
      <span class="lk-matrix">${isOob ? 'x ' : isDupe ? '' : ''}${k.matrix[0]},${k.matrix[1]}</span>
      ${k.label ? `<span class="lk-label">${k.label}</span>` : ''}
      <span class="lk-pos">${k.x},${k.y}</span>
    `;

    // Click: Ctrl/Shift = toggle add, plain click = exclusive select
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        if (selectedKeyIdxs.has(i)) selectedKeyIdxs.delete(i);
        else selectedKeyIdxs.add(i);
      } else {
        selectedKeyIdxs.clear();
        selectedKeyIdxs.add(i);
      }
      _updateDeleteSelBtn();
      renderLayoutCanvas();
      _syncKeyEditor();
    });

    // Mousedown: start drag via shared _lkDrag state
    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      // Select exclusively if not already in selection (without modifier)
      if (!selectedKeyIdxs.has(i) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        selectedKeyIdxs.clear();
        selectedKeyIdxs.add(i);
        _updateDeleteSelBtn();
        renderLayoutCanvas();
        _syncKeyEditor();
      }
      _lkDrag.active = true;
      _lkDrag.startMX = e.clientX;
      _lkDrag.startMY = e.clientY;
      _lkDrag.startPositions = layoutKeys.map(k2 => ({ x: k2.x, y: k2.y }));
      e.preventDefault();
      e.stopPropagation();
    });

    canvas.appendChild(el);
  });

  // Click canvas background = deselect all
  canvas.addEventListener('click', (e) => {
    if (e.target === canvas || e.target === grid) {
      selectedKeyIdxs.clear();
      _updateDeleteSelBtn();
      renderLayoutCanvas();
      _syncKeyEditor();
    }
  });

  document.getElementById('layoutWarnBox').style.display = layoutKeys.length === 0 ? 'block' : 'none';
}

function _syncKeyEditor() {
  const editor = document.getElementById('layoutKeyEditor');
  if (selectedKeyIdxs.size === 1) {
    const i = [...selectedKeyIdxs][0];
    editor.style.display = 'block';
    fillKeyEditor(i);
  } else {
    editor.style.display = 'none';
  }
}

function fillKeyEditor(i) {
  const k = layoutKeys[i];
  if (!k) return;
  // Update input bounds to match current matrix dimensions
  document.getElementById('lkRow').max = matrixState.rows * 2 - 1;
  document.getElementById('lkCol').max = matrixState.cols - 1;
  document.getElementById('lkRow').value   = k.matrix[0];
  document.getElementById('lkCol').value   = k.matrix[1];
  document.getElementById('lkX').value     = k.x;
  document.getElementById('lkY').value     = k.y;
  document.getElementById('lkW').value     = k.w ?? 1;
  document.getElementById('lkH').value     = k.h ?? 1;
  document.getElementById('lkLabel').value = k.label || '';
}

function updateSelectedKey() {
  if (selectedKeyIdxs.size !== 1) return;
  const i = [...selectedKeyIdxs][0];
  const k = layoutKeys[i];
  if (!k) return;
  k.matrix[0] = parseInt(document.getElementById('lkRow').value)  || 0;
  k.matrix[1] = parseInt(document.getElementById('lkCol').value)  || 0;
  k.x         = parseFloat(document.getElementById('lkX').value)  || 0;
  k.y         = parseFloat(document.getElementById('lkY').value)  || 0;
  k.w         = parseFloat(document.getElementById('lkW').value)  || 1;
  k.h         = parseFloat(document.getElementById('lkH').value)  || 1;
  k.label     = document.getElementById('lkLabel').value.trim();
  revalidateLayout();   // row/col may have changed — recheck conflicts + bounds
  renderLayoutCanvas();
  updateLayoutJsonPreview();
}

function deleteSelectedKeys() {
  if (selectedKeyIdxs.size === 0) return;
  // Delete in reverse index order so splicing doesn't shift remaining indices
  const sorted = [...selectedKeyIdxs].sort((a, b) => b - a);
  sorted.forEach(i => layoutKeys.splice(i, 1));
  selectedKeyIdxs.clear();
  _updateDeleteSelBtn();
  document.getElementById('layoutKeyEditor').style.display = 'none';
  revalidateLayout();
  renderLayoutCanvas();
  updateLayoutJsonPreview();
  rebuildKeyboard();
  toast(`Deleted ${sorted.length} key${sorted.length > 1 ? 's' : ''}`, 'success');
}

// Keep old name working (called from inline onclick)
function deleteSelectedKey() { deleteSelectedKeys(); }

function addLayoutKey() {
  let maxY = layoutKeys.reduce((m, k) => Math.max(m, k.y), 0);
  // Pick the first [row,col] within actual matrix bounds that isn't already used
  const usedMatrixKeys = new Set(layoutKeys.map(k => k.matrix[0] + ',' + k.matrix[1]));
  const maxRow = matrixState.rows * 2;  // both halves
  const maxCol = matrixState.cols;
  let newRow = 0, newCol = 0, foundSlot = false;
  outer: for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < maxCol; c++) {
      if (!usedMatrixKeys.has(r + ',' + c)) { newRow = r; newCol = c; foundSlot = true; break outer; }
    }
  }
  // Matrix is full — button should already be disabled, but guard anyway
  if (!foundSlot) { toast('All matrix positions are used', 'error'); return; }
  layoutKeys.push({ matrix:[newRow, newCol], x:0, y: maxY + 1.25, w:1, h:1, label:'' });
  const newIdx = layoutKeys.length - 1;
  selectedKeyIdxs.clear();
  selectedKeyIdxs.add(newIdx);
  _updateDeleteSelBtn();
  revalidateLayout();
  renderLayoutCanvas();
  fillKeyEditor(newIdx);
  document.getElementById('layoutKeyEditor').style.display = 'block';
  updateLayoutJsonPreview();
  rebuildKeyboard();
}

function layoutJsonToString(keys, itemIndent, closeIndent) {
  // Group keys by y row, each key on one line, blank line between rows
  // itemIndent: prefix for each key line (default '  ')
  // closeIndent: prefix for closing ] (default '')
  if (itemIndent  === undefined) itemIndent  = '  ';
  if (closeIndent === undefined) closeIndent = '';
  const rowMap = new Map();
  keys.forEach(k => {
    const y = Math.round(k.y * 4) / 4;
    if (!rowMap.has(y)) rowMap.set(y, []);
    rowMap.get(y).push(JSON.stringify(k));
  });
  const rowStrings = [...rowMap.values()].map(row => row.map(k => itemIndent + k).join(',\n'));
  return '[\n' + rowStrings.join(',\n\n') + '\n' + closeIndent + ']';
}

function updateLayoutJsonPreview() {
  const el = document.getElementById('layoutJsonPreview');
  if (!el) return;
  el.textContent = layoutJsonToString(buildLayoutObject());
}

function buildLayoutObject() {
  // Produce spec-compliant layout entries
  // Required: matrix, x, y. Optional: w, h, label
  return layoutKeys.map(k => {
    const entry = {
      matrix: [k.matrix[0], k.matrix[1]],
      x: k.x,
      y: k.y,
    };
    if ((k.w ?? 1) !== 1) entry.w = k.w;
    if ((k.h ?? 1) !== 1) entry.h = k.h;
    if (k.label)           entry.label = k.label;
    return entry;
  });
}

function copyLayoutJson() {
  navigator.clipboard.writeText(layoutJsonToString(buildLayoutObject())).then(() => toast('Layout JSON copied', 'success'));
}

function importLayoutJson() {
  const txt = prompt('Paste layout JSON array:');
  if (!txt) return;
  try {
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) throw new Error('Expected array');
    layoutKeys = arr.map(k => ({
      matrix: k.matrix ? [...k.matrix] : [0,0],
      x:  k.x ?? 0,  y: k.y ?? 0,
      w:  k.w ?? 1,  h: k.h ?? 1,
      label: k.label || '',
    }));
    selectedKeyIdx = -1;
    revalidateLayout();
    renderLayoutCanvas();
    updateLayoutJsonPreview();
    rebuildKeyboard();
    toast(`Imported ${layoutKeys.length} keys`, 'success');
  } catch(e) { toast('Invalid JSON: ' + e.message, 'error'); }
}

// Wire up toolbar buttons
document.getElementById('layoutAddKeyBtn').addEventListener('click', addLayoutKey);
document.getElementById('layoutDeleteSelBtn').addEventListener('click', deleteSelectedKeys);
document.getElementById('layoutClearBtn').addEventListener('click', () => {
  if (!confirm('Clear all layout keys?')) return;
  layoutKeys = []; selectedKeyIdxs.clear();
  _updateDeleteSelBtn();
  document.getElementById('layoutKeyEditor').style.display = 'none';
  revalidateLayout(); renderLayoutCanvas(); updateLayoutJsonPreview(); rebuildKeyboard();
});

// Backspace / Delete key — only when layout panel is active and focus not in an input
document.addEventListener('keydown', (e) => {
  const panel = document.getElementById('panel-layout');
  if (!panel || !panel.classList.contains('active')) return;
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
  if ((e.key === 'Backspace' || e.key === 'Delete') && selectedKeyIdxs.size > 0) {
    e.preventDefault();
    deleteSelectedKeys();
  }
  // Ctrl+A = select all
  if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    layoutKeys.forEach((_, i) => selectedKeyIdxs.add(i));
    _updateDeleteSelBtn();
    renderLayoutCanvas();
    _syncKeyEditor();
  }
});

// Re-render when switching to layout panel; auto-generate silently if empty
document.querySelector('[data-panel="layout"]').addEventListener('click', () => {
  setTimeout(() => {
    if (layoutKeys.length === 0) generateLayoutFromMatrix(true);
    else { renderLayoutCanvas(); updateLayoutJsonPreview(); }
  }, 50);
});

// ─── Hook into genInfoJson merge to inject layoutKeys ───
// We patch _rawInfoJson.layouts before genInfoJson reads it
// genInfoJson is patched inline — layout injection happens inside genInfoJson directly
// (patch removed to avoid hoisting-caused infinite recursion)
