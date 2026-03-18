// ═══════════════════════════════════════════════════
// MATRIX PIN EDITOR
// ═══════════════════════════════════════════════════
const matrixState = {
  rows: 4,
  cols: 6,
  rowPins: ['GP0','GP1','GP2','GP3'],
  colPins: ['GP4','GP5','GP6','GP7','GP8','GP9'],
  highlightRow: -1,
  highlightCol: -1,
};

let pickerTarget = null; // { type: 'row'|'col', index }

const RP2040_PINS = Array.from({length: 29}, (_, i) => `GP${i}`);

function getMatrixPinConflicts() {
  // Use getAllUsedPins() — same source the pinmap uses, already normalised
  const usedMap = getAllUsedPins();
  const conflictPins = new Set();
  const details = [];

  Object.entries(usedMap).forEach(([pin, uses]) => {
    if (uses.length < 2) return;
    // Only care about conflicts that involve a matrix pin
    const matrixUses = uses.filter(u => u.source === 'Matrix');
    if (matrixUses.length === 0) return;
    conflictPins.add(pin);
    details.push({ pin, uses });
  });

  return { conflictPins, details };
}

function updateMatrixConflictBanner({ conflictPins, details }) {
  const box  = document.getElementById('matrixConflictBox');
  const list = document.getElementById('matrixConflictList');
  if (!box) return;
  if (conflictPins.size === 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  list.innerHTML = '';

  details.forEach(({ pin, uses }) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:10px;padding:3px 0;border-bottom:1px solid var(--danger)20;';

    // Pin name
    const chip = document.createElement('span');
    chip.style.cssText = 'background:var(--danger)25;border:1px solid var(--danger)60;border-radius:3px;padding:1px 7px;color:var(--danger);font-weight:700;min-width:46px;text-align:center;';
    chip.textContent = pin;
    row.appendChild(chip);

    const arrow = document.createElement('span');
    arrow.style.cssText = 'color:var(--text3);font-size:9px;';
    arrow.textContent = '→';
    row.appendChild(arrow);

    // Each use as a tag
    uses.forEach((u, i) => {
      const isRow = u.label.startsWith('Row');
      const isCol = u.label.startsWith('Col');
      const tag = document.createElement('span');
      tag.style.cssText = `border-radius:3px;padding:1px 6px;font-size:9px;font-weight:600;
        background:${isRow ? 'var(--accent)20' : isCol ? 'var(--accent2)20' : 'var(--accent3)20'};
        border:1px solid ${isRow ? 'var(--accent)50' : isCol ? 'var(--accent2)50' : 'var(--accent3)50'};
        color:${isRow ? 'var(--accent)' : isCol ? 'var(--accent2)' : 'var(--accent3)'};`;
      tag.textContent = `${u.source}: ${u.label}`;
      row.appendChild(tag);
    });

    list.appendChild(row);
  });
}

function renderMatrix() {
  const { rows, cols, rowPins, colPins } = matrixState;
  const grid = document.getElementById('matrixGrid');
  document.getElementById('matrixRowCount').textContent = rows;
  document.getElementById('matrixColCount').textContent = cols;

  const { conflictPins, details } = getMatrixPinConflicts();
  updateMatrixConflictBanner({ conflictPins, details });
  // conflictPins contains normalised uppercase keys e.g. 'GP5'


  const table = document.createElement('table');
  table.className = 'mx-table';

  // ── Header row: corner + col headers ──
  const thead = document.createElement('tr');

  const corner = document.createElement('td');
  corner.className = 'mx-corner';
  corner.innerHTML = `<span style="font-size:9px;line-height:1.4;">ROW<br>COL</span>`;
  thead.appendChild(corner);

  for (let c = 0; c < cols; c++) {
    const th = document.createElement('td');
    const pin = colPins[c] || '';
    const pinKey = (pin || '').replace(/,/g,'').trim().toUpperCase();
    const isConflict = pinKey && conflictPins.has(pinKey);
    th.className = 'mx-col-header' + (isConflict ? ' conflict' : '');
    th.innerHTML = `<span class="col-num">C${c}</span><span class="col-pin ${pin ? '' : 'unset'}">${pin || 'unset'}</span>`;
    th.addEventListener('click', () => openPinPicker('col', c, th));
    th.addEventListener('mouseenter', () => highlightMatrix(-1, c));
    th.addEventListener('mouseleave', () => highlightMatrix(-1, -1));
    thead.appendChild(th);
  }
  table.appendChild(thead);

  // ── Data rows ──
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');

    const rh = document.createElement('td');
    const rpin = rowPins[r] || '';
    const rpinKey = (rpin || '').replace(/,/g,'').trim().toUpperCase();
    const isConflict = rpinKey && conflictPins.has(rpinKey);
    rh.className = 'mx-row-header' + (isConflict ? ' conflict' : '');
    rh.innerHTML = `<span class="row-num">R${r}</span><span class="row-pin ${rpin ? '' : 'unset'}">${rpin || 'unset'}</span>`;
    rh.addEventListener('click', () => openPinPicker('row', r, rh));
    rh.addEventListener('mouseenter', () => highlightMatrix(r, -1));
    rh.addEventListener('mouseleave', () => highlightMatrix(-1, -1));
    tr.appendChild(rh);

    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'mx-cell';
      td.dataset.r = r;
      td.dataset.c = c;
      td.addEventListener('mouseenter', () => highlightMatrix(r, c));
      td.addEventListener('mouseleave', () => highlightMatrix(-1, -1));
      tr.appendChild(td);
    }

    table.appendChild(tr);
  }

  grid.innerHTML = '';
  grid.appendChild(table);
  syncHiddenPinInputs();
  renderPinout();
}

function highlightMatrix(hRow, hCol) {
  document.querySelectorAll('.mx-cell').forEach(td => {
    const r = parseInt(td.dataset.r);
    const c = parseInt(td.dataset.c);
    td.classList.remove('row-hi','col-hi','both-hi');
    if (hRow !== -1 && r === hRow && hCol !== -1 && c === hCol) td.classList.add('both-hi');
    else if (hRow !== -1 && r === hRow) td.classList.add('row-hi');
    else if (hCol !== -1 && c === hCol) td.classList.add('col-hi');
  });
}

// ── Add/remove rows & cols ──
document.getElementById('matrixAddRow').addEventListener('click', () => {
  matrixState.rows = Math.min(12, matrixState.rows + 1);
  renderMatrix();
});
document.getElementById('matrixRemoveRow').addEventListener('click', () => {
  if (matrixState.rows <= 1) return;
  matrixState.rows--;
  matrixState.rowPins = matrixState.rowPins.slice(0, matrixState.rows);
  renderMatrix();
});
document.getElementById('matrixAddCol').addEventListener('click', () => {
  matrixState.cols = Math.min(16, matrixState.cols + 1);
  renderMatrix();
});
document.getElementById('matrixRemoveCol').addEventListener('click', () => {
  if (matrixState.cols <= 1) return;
  matrixState.cols--;
  matrixState.colPins = matrixState.colPins.slice(0, matrixState.cols);
  renderMatrix();
});

function getAllUsedPins() {
  // Returns { 'GP2': [{ label: 'SPI SCK', source: 'Trackball' }], ... }
  const map = {};

  function reg(pin, label, source) {
    pin = (pin || '').trim().toUpperCase();
    if (!pin) return;
    if (!map[pin]) map[pin] = [];
    map[pin].push({ label, source });
  }

  // Matrix rows & cols
  matrixState.rowPins.forEach((p, i) => reg(p, `Row R${i}`, 'Matrix'));
  matrixState.colPins.forEach((p, i) => reg(p, `Col C${i}`, 'Matrix'));

  // Trackball SPI
  reg(document.getElementById('spiSck')?.value,  'SPI SCK',  'Trackball');
  reg(document.getElementById('spiMosi')?.value, 'SPI MOSI', 'Trackball');
  reg(document.getElementById('spiMiso')?.value, 'SPI MISO', 'Trackball');
  reg(document.getElementById('spiCs')?.value,   'SPI CS',   'Trackball');

  // Split serial (TRRS / direct wire)
  reg(document.getElementById('serialPin')?.value, 'Serial TX', 'Split');

  // Split hand detection
  if (document.getElementById('sideDetect')?.value === 'pin') {
    reg(document.getElementById('handPin')?.value, 'Hand Pin', 'Split');
  }

  // RGB
  const rgbType = document.getElementById('rgbType')?.value;
  if (rgbType && rgbType !== 'none') {
    reg(document.getElementById('rgbPin')?.value, 'RGB Data', 'RGB');
  }

  // Encoders
  reg(document.getElementById('encAPin')?.value,  'Enc A (L)', 'Encoder');
  reg(document.getElementById('encBPin')?.value,  'Enc B (L)', 'Encoder');
  reg(document.getElementById('encAPin2')?.value, 'Enc A (R)', 'Encoder');
  reg(document.getElementById('encBPin2')?.value, 'Enc B (R)', 'Encoder');

  return map;
}

// ── Pin picker ──
function openPinPickerAtPos(type, index, screenX, screenY) {
  // Fake anchor element with getBoundingClientRect returning the click position
  const fakeAnchor = {
    getBoundingClientRect: () => ({
      left: screenX, right: screenX, top: screenY, bottom: screenY + 4
    })
  };
  openPinPicker(type, index, fakeAnchor);
}

function openPinPickerAtPos(type, index, screenX, screenY) {
  const fakeAnchor = {
    getBoundingClientRect: () => ({ left: screenX, right: screenX, top: screenY, bottom: screenY + 4 })
  };
  openPinPicker(type, index, fakeAnchor);
}

// ── Pinmap click picker — shows current assignments + row/col assign options ──
function openPinmapPicker(pinName, screenX, screenY) {
  const usedMap = getAllUsedPins();
  const uses    = usedMap[pinName.toUpperCase()] || [];

  // Find existing row/col assignments for this pin
  const rowIdx = matrixState.rowPins.findIndex(p => (p||'').toUpperCase() === pinName.toUpperCase());
  const colIdx = matrixState.colPins.findIndex(p => (p||'').toUpperCase() === pinName.toUpperCase());

  // Reuse the existing pinPicker popup but with custom content
  const picker  = document.getElementById('pinPicker');
  const title   = document.getElementById('pinPickerTitle');
  const pgrid   = document.getElementById('pinPickerGrid');
  const overlay = document.getElementById('pinPickerOverlay');

  title.textContent = `${pinName} — assign to matrix`;
  pgrid.innerHTML   = '';

  // ── Current assignments info ──
  if (uses.length > 0) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:10px;color:var(--text2);margin-bottom:8px;padding:6px 8px;background:var(--surface3);border-radius:var(--radius);line-height:1.8;';
    info.innerHTML = '<span style="color:var(--text3);">Currently:</span> ' +
      uses.map(u => `<span style="color:var(--accent);font-weight:600;">${u.label}</span> <span style="color:var(--text3);font-size:9px;">(${u.source})</span>`).join('  ');
    pgrid.appendChild(info);
  }

  // ── Row assignment section ──
  const rowLabel = document.createElement('div');
  rowLabel.style.cssText = 'font-size:10px;color:var(--accent);font-weight:600;margin:8px 0 4px;text-transform:uppercase;letter-spacing:0.5px;';
  rowLabel.textContent = 'Assign as Row';
  pgrid.appendChild(rowLabel);

  const rowWrap = document.createElement('div');
  rowWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
  for (let r = 0; r < matrixState.rows; r++) {
    const btn = document.createElement('div');
    btn.className = 'pp-chip' + (rowIdx === r ? ' selected' : '');
    const cur = matrixState.rowPins[r];
    btn.textContent = `R${r}`;
    if (cur && cur.toUpperCase() !== pinName.toUpperCase()) {
      btn.title = `Currently: ${cur}`;
      btn.style.opacity = '0.6';
    }
    btn.addEventListener('click', () => {
      matrixState.rowPins[r] = pinName;
      renderMatrix(); renderPinout();
      closePinPicker();
      toast(`${pinName} → ROW ${r}`, 'success');
    });
    rowWrap.appendChild(btn);
  }
  // Clear row button
  if (rowIdx >= 0) {
    const clr = document.createElement('div');
    clr.className = 'pp-chip';
    clr.style.cssText += 'color:var(--danger);border-color:var(--danger)50;';
    clr.textContent = `Clear R${rowIdx}`;
    clr.addEventListener('click', () => {
      matrixState.rowPins[rowIdx] = '';
      renderMatrix(); renderPinout();
      closePinPicker();
      toast(`${pinName} removed from ROW ${rowIdx}`, 'success');
    });
    rowWrap.appendChild(clr);
  }
  pgrid.appendChild(rowWrap);

  // ── Col assignment section ──
  const colLabel = document.createElement('div');
  colLabel.style.cssText = 'font-size:10px;color:var(--accent2);font-weight:600;margin:4px 0 4px;text-transform:uppercase;letter-spacing:0.5px;';
  colLabel.textContent = 'Assign as Col';
  pgrid.appendChild(colLabel);

  const colWrap = document.createElement('div');
  colWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
  for (let c = 0; c < matrixState.cols; c++) {
    const btn = document.createElement('div');
    btn.className = 'pp-chip' + (colIdx === c ? ' selected' : '');
    const cur = matrixState.colPins[c];
    btn.textContent = `C${c}`;
    if (cur && cur.toUpperCase() !== pinName.toUpperCase()) {
      btn.title = `Currently: ${cur}`;
      btn.style.opacity = '0.6';
    }
    btn.addEventListener('click', () => {
      matrixState.colPins[c] = pinName;
      renderMatrix(); renderPinout();
      closePinPicker();
      toast(`${pinName} → COL ${c}`, 'success');
    });
    colWrap.appendChild(btn);
  }
  // Clear col button
  if (colIdx >= 0) {
    const clr = document.createElement('div');
    clr.className = 'pp-chip';
    clr.style.cssText += 'color:var(--danger);border-color:var(--danger)50;';
    clr.textContent = `Clear C${colIdx}`;
    clr.addEventListener('click', () => {
      matrixState.colPins[colIdx] = '';
      renderMatrix(); renderPinout();
      closePinPicker();
      toast(`${pinName} removed from COL ${colIdx}`, 'success');
    });
    colWrap.appendChild(clr);
  }
  pgrid.appendChild(colWrap);

  // Hide the custom pin input — not needed here
  const customRow = document.querySelector('#pinPickerCustom')?.closest('div');
  if (customRow) customRow.style.display = 'none';

  // Position and show
  picker.style.display  = 'block';
  overlay.style.display = 'block';

  const ph = 400, pw = 280;
  const top  = Math.min(screenY + 6, window.innerHeight - ph - 10);
  const left = Math.min(screenX,     window.innerWidth  - pw - 10);
  picker.style.top  = Math.max(10, top)  + 'px';
  picker.style.left = Math.max(10, left) + 'px';
}

// Restore custom pin row visibility when regular picker opens
const _origOpenPinPicker = openPinPicker;

function openPinPicker(type, index, anchorEl) {
  pickerTarget = { type, index };
  const picker = document.getElementById('pinPicker');
  const title = document.getElementById('pinPickerTitle');
  title.textContent = type === 'row' ? `Row ${index} (R${index}) — assign GPIO` : `Col ${index} (C${index}) — assign GPIO`;

  // Build global used-pins map: pin → [{ label, source }]
  const usedPinsMap = getAllUsedPins();
  const current = type === 'row'   ? matrixState.rowPins[index]
                : type === 'col'   ? matrixState.colPins[index]
                : type === 'row-r' ? matrixStateRight.rowPins[index]
                :                    matrixStateRight.colPins[index];

  const pgrid = document.getElementById('pinPickerGrid');
  pgrid.innerHTML = '';
  RP2040_PINS.forEach(pin => {
    const chip = document.createElement('div');
    chip.className = 'pp-chip';
    const conflicts = usedPinsMap[pin] || [];
    const isCurrent = pin === current;
    const isUsed = conflicts.length > 0 && !isCurrent;

    if (isCurrent) chip.classList.add('selected');
    else if (isUsed) chip.classList.add('used');

    chip.textContent = pin;

    if (isUsed) {
      const labels = conflicts.map(c => c.label).join(', ');
      chip.title = `Used by: ${labels}`;
      // Show inline label
      const tag = document.createElement('span');
      tag.style.cssText = 'font-size:8px;color:var(--text3);display:block;line-height:1;margin-top:2px;';
      tag.textContent = conflicts[0].source;
      chip.appendChild(tag);
    }

    chip.addEventListener('click', () => {
      if (isUsed) return;
      applyPin(pin);
    });
    pgrid.appendChild(chip);
  });

  // Restore custom pin input row (may have been hidden by pinmap picker)
  const customRow = document.querySelector('#pinPickerCustom')?.closest('div');
  if (customRow) customRow.style.display = '';

  document.getElementById('pinPickerCustom').value = current || '';

  // Show conflict summary
  const conflictCount = Object.values(usedPinsMap).filter(arr => arr.length > 0).length;
  const totalPins = RP2040_PINS.length;
  const freeCount = totalPins - Object.keys(usedPinsMap).length;
  let summaryEl = document.getElementById('pinPickerSummary');
  if (!summaryEl) {
    summaryEl = document.createElement('div');
    summaryEl.id = 'pinPickerSummary';
    summaryEl.style.cssText = 'font-size:10px;margin-bottom:8px;padding:6px 8px;border-radius:4px;border:1px solid;';
    document.getElementById('pinPickerGrid').before(summaryEl);
  }
  const conflicts = Object.entries(usedPinsMap).filter(([, arr]) => arr.length > 1);
  if (conflicts.length) {
    summaryEl.style.background = 'var(--danger)10';
    summaryEl.style.borderColor = 'var(--danger)40';
    summaryEl.style.color = 'var(--danger)';
    summaryEl.textContent = `${conflicts.length} pin conflict${conflicts.length > 1 ? 's' : ''} detected — ${freeCount} GPIO free`;
  } else {
    summaryEl.style.background = 'var(--accent)08';
    summaryEl.style.borderColor = 'var(--accent)30';
    summaryEl.style.color = 'var(--text3)';
    summaryEl.textContent = `${freeCount} of ${totalPins} GPIO pins free`;
  }

  // Position near anchor
  const rect = anchorEl.getBoundingClientRect();
  picker.style.display = 'block';
  document.getElementById('pinPickerOverlay').style.display = 'block';

  // Smart positioning
  const ph = 320;
  const top = Math.min(rect.bottom + 6, window.innerHeight - ph - 10);
  const left = Math.min(rect.left, window.innerWidth - 280);
  picker.style.top = Math.max(10, top) + 'px';
  picker.style.left = Math.max(10, left) + 'px';
}

function applyPin(pin) {
  if (!pickerTarget) return;
  const { type, index } = pickerTarget;
  if (type === 'row') matrixState.rowPins[index] = pin;
  else matrixState.colPins[index] = pin;
  closePinPicker();
  renderMatrix();
}

function clearPickerPin() {
  if (!pickerTarget) return;
  const { type, index } = pickerTarget;
  if (type === 'row') matrixState.rowPins[index] = '';
  else matrixState.colPins[index] = '';
  closePinPicker();
  renderMatrix();
}

function applyCustomPin() {
  const val = document.getElementById('pinPickerCustom').value.trim().toUpperCase();
  if (val) applyPin(val);
}

function closePinPicker() {
  document.getElementById('pinPicker').style.display = 'none';
  document.getElementById('pinPickerOverlay').style.display = 'none';
  pickerTarget = null;
}

function syncHiddenPinInputs() {
  document.getElementById('matrixRowPins').value = matrixState.rowPins.map(p => (p||'').replace(/,/g,'').trim()).filter(Boolean).join(' ');
  document.getElementById('matrixColPins').value = matrixState.colPins.map(p => (p||'').replace(/,/g,'').trim()).filter(Boolean).join(' ');
}

// parseConfigH patch removed — matrix sync merged into original
