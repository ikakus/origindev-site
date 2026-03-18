// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const panel = item.dataset.panel;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + panel).classList.add('active');
    currentPanel = panel;
    if (panel === 'preview') showPreview(currentPreview);
  });
});

// ═══════════════════════════════════════════════════
// TOGGLES
// ═══════════════════════════════════════════════════
function toggleTgl(el) {
  el.classList.toggle('on');
}
function setTgl(id, val) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', val);
}
function isTgl(id) {
  return document.getElementById(id)?.classList.contains('on') || false;
}

// ═══════════════════════════════════════════════════
// SECTIONS COLLAPSE
// ═══════════════════════════════════════════════════
function toggleSection(header) {
  header.closest('.section').classList.toggle('section-collapsed');
}

// ═══════════════════════════════════════════════════
// SIDE DETECT TOGGLE
// ═══════════════════════════════════════════════════
document.getElementById('sideDetect').addEventListener('change', (e) => {
  document.getElementById('sideDetectPinField').style.display =
    e.target.value === 'pin' ? 'flex' : 'none';
});

// Update serial UI based on selected driver
function updateSerialDriverUI() {
  const drv = document.getElementById('serialDriver')?.value;
  const hint = document.getElementById('serialPinHint');
  const speedField = document.getElementById('serialSpeedField');
  const pinField = document.getElementById('serialPinField');
  // vendor = no pin needed; serial (PIO) = SOFT_SERIAL_PIN; bitbang = SOFT_SERIAL_PIN + speed
  if (pinField)   pinField.style.display   = drv === 'vendor' ? 'none' : 'flex';
  if (speedField) speedField.style.display = drv === 'bitbang' ? 'flex' : 'none';
  if (hint) hint.textContent = 'SOFT_SERIAL_PIN';
}

// Re-query getAllUsedPins on next picker open — inputs are read live so no action needed here
// But trigger a re-render if sideDetect or rgbType changes (affects which pins are "used")
document.getElementById('sideDetect').addEventListener('change', () => {});
document.getElementById('rgbType').addEventListener('change', () => {});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
// Mark UI inactive until a folder is loaded
document.body.classList.add('app--unloaded');

// Reset matrix to no pins before first render
matrixState.rowPins = Array(matrixState.rows).fill('');
matrixState.colPins = Array(matrixState.cols).fill('');

initKeymap();
renderMatrix();
renderPinout();
initFolderRestore();
updateSerialDriverUI();
_hookPinoutRefresh();

// Clear all default values in non-home panels
document.querySelectorAll('.panel:not(#panel-home) input[type=text], .panel:not(#panel-home) input[type=number]')
  .forEach(el => { el.value = ''; });
document.querySelectorAll('.panel:not(#panel-home) .toggle.on')
  .forEach(el => el.classList.remove('on'));

// Add blank placeholder to config selects
['diodeDir','bootloader','board','rgbType','spiBus','tbSide',
 'serialDriver','serialSpeed','sideDetect','masterSide'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '—';
  blank.dataset.placeholder = '1';
  el.insertBefore(blank, el.firstChild);
  el.value = '';
});
