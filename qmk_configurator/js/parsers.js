// ═══════════════════════════════════════════════════
// PARSERS (best-effort, regex-based)
// ═══════════════════════════════════════════════════
function getDefine(text, name) {
  const m = text.match(new RegExp(`#define\\s+${name}\\s+([^\\n]+)`));
  if (!m) return null;
  return m[1].replace(/\/\/.*$/, '').trim();
}

function parseConfigH(text) {
  const g = (n) => getDefine(text, n);
  // fill: only set if not already populated by info.json
  const fill = (id, val) => {
    if (!val) return;
    const el = document.getElementById(id);
    if (el && !el.value) el.value = val;
  };

  // matrix — only if info.json didn't already supply pins
  const rowStr = g('MATRIX_ROW_PINS');
  if (rowStr) {
    const el = document.getElementById('matrixRowPins');
    if (el && !el.value) el.value = rowStr.replace(/[{},]/g,' ').replace(/\s+/g,' ').trim();
  }
  const colStr = g('MATRIX_COL_PINS');
  if (colStr) {
    const el = document.getElementById('matrixColPins');
    if (el && !el.value) el.value = colStr.replace(/[{},]/g,' ').replace(/\s+/g,' ').trim();
  }
  const dd = g('DIODE_DIRECTION');
  if (dd) { const el = document.getElementById('diodeDir'); if (el && !el.value) el.value = dd; }

  // right-half matrix overrides
  const rowStrR = g('MATRIX_ROW_PINS_RIGHT');
  if (rowStrR) document.getElementById('matrixRowPinsRight').value = rowStrR.replace(/[{},]/g,' ').replace(/\s+/g,' ').trim();
  const colStrR = g('MATRIX_COL_PINS_RIGHT');
  if (colStrR) {
    document.getElementById('matrixColPinsRight').value = colStrR.replace(/[{},]/g,' ').replace(/\s+/g,' ').trim();
    // Check if right cols are the reverse of left cols → set toggle
    const leftCols  = (g('MATRIX_COL_PINS') || '').replace(/[{},]/g,' ').trim().split(/\s+/).filter(Boolean);
    const rightCols = colStrR.replace(/[{},]/g,' ').trim().split(/\s+/).filter(Boolean);
    const isReversed = leftCols.length === rightCols.length &&
      leftCols.every((p, i) => p.toUpperCase() === rightCols[rightCols.length - 1 - i].toUpperCase());
    if (isReversed) setTgl('tgl-right-col-reverse', true);
  }

  // split
  const sp = g('SOFT_SERIAL_PIN');
  if (sp) fill('serialPin', sp);
  const hp = g('SPLIT_HAND_PIN');
  if (hp) {
    fill('handPin', hp);
    const sd = document.getElementById('sideDetect');
    if (sd && !sd.value) sd.value = 'pin';
  }

  // trackball
  const spiDrv = g('SPI_DRIVER');
  if (spiDrv) {
    const el = document.getElementById('spiBus');
    if (el && !el.value) el.value = spiDrv === 'SPID1' ? 'SPI_DRIVER_1' : 'SPI_DRIVER';
  }
  fill('spiSck',  g('SPI_SCK_PIN'));
  fill('spiMosi', g('SPI_MOSI_PIN'));
  fill('spiMiso', g('SPI_MISO_PIN'));
  // CS pin + side detection
  fill('spiCs', g('PMW33XX_CS_PIN'));
  if (text.includes('POINTING_DEVICE_RIGHT')) {
    const el = document.getElementById('tbSide');
    if (el && !el.value) el.value = 'right';
  } else if (text.includes('POINTING_DEVICE_LEFT')) {
    const el = document.getElementById('tbSide');
    if (el && !el.value) el.value = 'left';
  }
  fill('tbCpi',   g('PMW33XX_CPI'));

  // ── Trackball orientation ──
  const rot = g('ROTATIONAL_TRANSFORM_ANGLE');
  if (rot) setOrientAngle(parseInt(rot) || 0);
  // INVERT defines are presence-based (#define with no value)
  const hasInvertX = text.includes('POINTING_DEVICE_INVERT_X');
  const hasInvertY = text.includes('POINTING_DEVICE_INVERT_Y');
  setTgl('tgl-invertx', hasInvertX);
  setTgl('tgl-inverty', hasInvertY);
  // SwapXY = both inverts present (that's how we encode it on save)
  setTgl('tgl-swapxy', hasInvertX && hasInvertY);

  // toggles from defines
  if (text.includes('POINTING_DEVICE_AUTO_MOUSE_ENABLE')) setTgl('tgl-automouse', true);
  if (text.includes('SPLIT_POINTING_ENABLE')) setTgl('tgl-combined', true);
  if (text.includes('SPLIT_USB_DETECT')) setTgl('tgl-usb-detect', true);
  if (text.includes('SPLIT_LAYER_STATE_ENABLE')) setTgl('tgl-layer-sync', true);
  if (text.includes('SPLIT_MODS_ENABLE')) setTgl('tgl-mods-sync', true);
  if (text.includes('SPLIT_TRANSPORT_MIRROR')) setTgl('tgl-mirror', true);

  if (text.includes('MASTER_LEFT'))  { const el = document.getElementById('masterSide'); if(el) el.value = 'left'; }
  if (text.includes('MASTER_RIGHT')) { const el = document.getElementById('masterSide'); if(el) el.value = 'right'; }

  fill('autoMouseLayer',   g('AUTO_MOUSE_DEFAULT_LAYER'));
  fill('autoMouseTimeout', g('AUTO_MOUSE_TIME'));

  // ── Matrix timing ──
  fill('cfgDebounce',      g('DEBOUNCE'));
  fill('cfgMatrixIoDelay', g('MATRIX_IO_DELAY'));
  fill('cfgUsbPolling',    g('USB_POLLING_INTERVAL_MS'));

  // ── Tap/hold behavior ──
  fill('cfgTappingTerm',   g('TAPPING_TERM'));
  fill('cfgQuickTapTerm',  g('QUICK_TAP_TERM'));
  fill('cfgOneshotTimeout',g('ONESHOT_TIMEOUT'));
  fill('cfgComboTerm',     g('COMBO_TERM'));
  fill('cfgLeaderTimeout', g('LEADER_TIMEOUT'));

  if (text.includes('PERMISSIVE_HOLD'))        setTgl('tgl-permissive-hold', true);
  if (text.includes('HOLD_ON_OTHER_KEY_PRESS')) setTgl('tgl-hold-on-other', true);
  if (text.includes('RETRO_TAPPING'))          setTgl('tgl-retro-tapping', true);
  if (text.includes('LOCKING_SUPPORT_ENABLE')) setTgl('tgl-locking', true);
  if (text.includes('LOCKING_RESYNC_ENABLE'))  setTgl('tgl-locking-resync', true);
  if (text.includes('MOUSE_EXTENDED_REPORT'))  setTgl('tgl-mouse-ext', true);

  // ── Sync matrix pins into matrixState — only if info.json didn't already set them ──
  if (!matrixState.rowPins.some(p => p)) {
    const rp = document.getElementById('matrixRowPins').value.trim().split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
    const cp = document.getElementById('matrixColPins').value.trim().split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
    if (rp.length) { matrixState.rows = rp.length; matrixState.rowPins = rp; }
    if (cp.length) { matrixState.cols = cp.length; matrixState.colPins = cp; }
    renderMatrix();
  }
}

function parseRulesMk(text) {
  const tglMap = {
    'POINTING_DEVICE_ENABLE': 'tgl-pde',
    'SPI_DRIVER_REQUIRED': 'tgl-spi',
    'NKRO_ENABLE': 'tgl-nkro',
    'BOOTMAGIC_ENABLE': 'tgl-bootmagic',
    'MOUSEKEY_ENABLE': 'tgl-mousekey',
    'EXTRAKEY_ENABLE': 'tgl-extrakey',
    'CONSOLE_ENABLE': 'tgl-console',
    'COMMAND_ENABLE': 'tgl-command',
    'TAP_DANCE_ENABLE': 'tgl-tapdance',
    'COMBO_ENABLE': 'tgl-combo',
    'KEY_OVERRIDE_ENABLE': 'tgl-keyoverride',
    'ENCODER_ENABLE': 'tgl-encoder',
    'OLED_ENABLE': 'tgl-oled',
    'WPM_ENABLE': 'tgl-wpm',
    'AUTOCORRECT_ENABLE': 'tgl-autocorrect',
    'CAPS_WORD_ENABLE': 'tgl-capsword',
    'RGBLIGHT_ENABLE': 'tgl-rgblight',
    'RGB_MATRIX_ENABLE': 'tgl-rgbmatrix',
  };
  for (const [key, tgl] of Object.entries(tglMap)) {
    const m = text.match(new RegExp(`^${key}\\s*=\\s*(yes|no)`, 'm'));
    if (m) setTgl(tgl, m[1] === 'yes');
  }
  // Parse SERIAL_DRIVER value
  const sdm = text.match(/^SERIAL_DRIVER\s*=\s*(\S+)/m);
  if (sdm) {
    const el = document.getElementById('serialDriver');
    if (el) { el.value = sdm[1]; updateSerialDriverUI(); }
  }
}

function parseInfoJson(text) {
  try {
    const j = JSON.parse(text);
    _rawInfoJson = j; // preserve entire object — we'll merge on save

    // ── General Metadata ──
    if (j.keyboard_name) document.getElementById('kbName').value = j.keyboard_name;
    if (j.manufacturer)  document.getElementById('kbMfr').value = j.manufacturer;
    if (j.maintainer)    document.getElementById('kbMaintainer').value = j.maintainer;

    // ── USB ──
    if (j.usb?.vid)              document.getElementById('usbVid').value     = j.usb.vid;
    if (j.usb?.pid)              document.getElementById('usbPid').value     = j.usb.pid;
    if (j.usb?.polling_interval) document.getElementById('cfgUsbPolling').value = j.usb.polling_interval;

    // ── Hardware ──
    if (j.processor)  document.getElementById('processor').value  = j.processor;
    if (j.bootloader) document.getElementById('bootloader').value = j.bootloader;
    if (j.board)      document.getElementById('board').value      = j.board;

    // ── Matrix ──
    if (j.diode_direction) document.getElementById('diodeDir').value = j.diode_direction;
    if (j.debounce != null) document.getElementById('cfgDebounce').value = j.debounce;

    const mp = j.matrix_pins;
    if (mp) {
      const rows = Array.isArray(mp.rows) ? mp.rows : [];
      const cols = Array.isArray(mp.cols) ? mp.cols : [];
      if (rows.length) { matrixState.rows = rows.length; matrixState.rowPins = rows.slice(); }
      if (cols.length) { matrixState.cols = cols.length; matrixState.colPins = cols.slice(); }
      if (mp.io_delay != null) document.getElementById('cfgMatrixIoDelay').value = mp.io_delay;
      document.getElementById('kbRows').value = matrixState.rows;
      document.getElementById('kbCols').value = matrixState.cols;
      syncHiddenPinInputs();
      renderMatrix();
    }

    // ── Tapping ──
    if (j.tapping) {
      if (j.tapping.term != null)                    document.getElementById('cfgTappingTerm').value = j.tapping.term;
      if (j.tapping.permissive_hold != null)         setTgl('tgl-permissive-hold',  j.tapping.permissive_hold);
      if (j.tapping.hold_on_other_key_press != null) setTgl('tgl-hold-on-other',    j.tapping.hold_on_other_key_press);
      if (j.tapping.retro != null)                   setTgl('tgl-retro-tapping',    j.tapping.retro);
    }

    // ── One Shot ──
    if (j.oneshot?.timeout != null) document.getElementById('cfgOneshotTimeout').value = j.oneshot.timeout;

    // ── Combo ──
    if (j.combo?.term != null) document.getElementById('cfgComboTerm').value = j.combo.term;

    // ── Leader Key ──
    if (j.leader_key?.timeout != null) document.getElementById('cfgLeaderTimeout').value = j.leader_key.timeout;

    // ── Locking ──
    if (j.qmk?.locking?.enabled != null) setTgl('tgl-locking',        j.qmk.locking.enabled);
    if (j.qmk?.locking?.resync  != null) setTgl('tgl-locking-resync', j.qmk.locking.resync);

    // ── Features ──
    const f = j.features || {};
    const featureMap = {
      'bootmagic':    'tgl-bootmagic',
      'mousekey':     'tgl-mousekey',
      'extrakey':     'tgl-extrakey',
      'nkro':         'tgl-nkro',
      'tap_dance':    'tgl-tapdance',
      'combo':        'tgl-combo',
      'key_override': 'tgl-keyoverride',
      'encoder':      'tgl-encoder',
      'oled':         'tgl-oled',
      'wpm':          'tgl-wpm',
      'autocorrect':  'tgl-autocorrect',
      'caps_word':    'tgl-capsword',
      'rgblight':     'tgl-rgblight',
      'rgb_matrix':   'tgl-rgbmatrix',
      'console':      'tgl-console',
    };
    for (const [key, tglId] of Object.entries(featureMap)) {
      if (f[key] != null) setTgl(tglId, !!f[key]);
    }

    // ── Encoder ──
    const encs = j.encoder?.rotary;
    if (Array.isArray(encs)) {
      if (encs[0]?.pin_a) document.getElementById('encAPin').value  = encs[0].pin_a;
      if (encs[0]?.pin_b) document.getElementById('encBPin').value  = encs[0].pin_b;
      if (encs[1]?.pin_a) document.getElementById('encAPin2').value = encs[1].pin_a;
      if (encs[1]?.pin_b) document.getElementById('encBPin2').value = encs[1].pin_b;
    }

    // ── RGB ──
    if (j.rgblight?.led_count != null) document.getElementById('rgbCount').value = j.rgblight.led_count;
    if (j.rgblight?.driver)            document.getElementById('rgbType').value  = j.rgblight.driver.toUpperCase() || 'WS2812';
    if (j.ws2812?.pin)                 document.getElementById('rgbPin').value   = j.ws2812.pin;

    // ── Split — support both new schema keys and legacy keys ──
    const sp = j.split;
    if (sp) {
      // serial pin: new = split.serial.pin, legacy = split.soft_serial_pin
      const sPin = sp.serial?.pin || sp.soft_serial_pin;
      if (sPin) document.getElementById('serialPin').value = sPin;
      if (sp.serial?.driver) {
        document.getElementById('serialDriver').value = sp.serial.driver;
        updateSerialDriverUI();
      }
      // handedness
      if (sp.handedness?.pin) {
        document.getElementById('handPin').value    = sp.handedness.pin;
        document.getElementById('sideDetect').value = 'pin';
      }
      // usb_detect
      if (sp.usb_detect?.enabled != null) setTgl('tgl-usb-detect', sp.usb_detect.enabled);
      // transport sync — new: transport.sync.*, legacy: transport.sync_*
      if (sp.transport) {
        const t = sp.transport;
        const s = t.sync || {};
        const ls = s.layer_state  ?? t.sync_matrix_state;
        const ms = s.modifiers    ?? t.sync_modifiers;
        const is = s.indicators   ?? t.sync_led;
        if (ls != null) setTgl('tgl-layer-sync', ls);
        if (ms != null) setTgl('tgl-mods-sync',  ms);
        if (is != null) setTgl('tgl-led-sync',   is);
        if (t.watchdog != null) setTgl('tgl-watchdog', t.watchdog);
        if (t.mirror   != null) setTgl('tgl-mirror',   t.mirror);
      }
      // master_side (legacy top-level key)
      if (sp.master_side) {
        const el = document.getElementById('masterSide');
        if (el) el.value = sp.master_side;
      }
    }

    // ── Pointing device ──
    const pd = j.pointing_device;
    if (pd) {
      if (pd.driver === 'pmw3360' || pd.driver === 'pmw3389') {
        setTgl('tgl-pde', true);
        setTgl('tgl-spi', true);
      }
      if (pd.cpi != null) document.getElementById('tbCpi').value = pd.cpi;
      if (pd.motion?.pin)  document.getElementById('spiCs').value  = pd.motion.pin;
      if (pd.side === 'right' || pd.side === 'left') document.getElementById('tbSide').value = pd.side;
      if (pd.auto_mouse_layer?.enabled) setTgl('tgl-automouse', true);
      if (pd.auto_mouse_layer?.layer   != null) document.getElementById('autoMouseLayer').value   = pd.auto_mouse_layer.layer;
      if (pd.auto_mouse_layer?.timeout != null) document.getElementById('autoMouseTimeout').value = pd.auto_mouse_layer.timeout;
      if (pd.combined_pointing) setTgl('tgl-combined', true);
      if (pd.rotational_transform_angle != null) setOrientAngle(pd.rotational_transform_angle);
    }

  } catch(e) { console.warn('info.json parse error', e); }
}

function parseKeymapC(text) {
  // Match [LAYER] = LAYOUT_xxx( ... ) — capture the macro name too
  const layerMatches = [...text.matchAll(/\[(\w+)\]\s*=\s*(LAYOUT[_\w]*)\s*\(([^)]+)\)/g)];
  keymapData = [];

  // Restore LAYER_NAMES from enum or layer keys
  const enumMatch = text.match(/enum\s+layers\s*\{([^}]+)\}/);
  if (enumMatch) {
    const names = enumMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    if (names.length) { LAYER_NAMES = names; currentLayer = 0; }
  } else if (layerMatches.length) {
    LAYER_NAMES = layerMatches.map(m => m[1]);
    currentLayer = 0;
  }

  // Extract and set the LAYOUT macro name from the first match
  if (layerMatches.length > 0) {
    const macroName = layerMatches[0][2];
    const layoutNameEl = document.getElementById('layoutName');
    if (layoutNameEl && macroName) layoutNameEl.value = macroName;
  }

  const cols = parseInt(document.getElementById('kbCols').value) || 6;
  const rows = parseInt(document.getElementById('kbRows').value) || 4;

  layerMatches.forEach((m, li) => {
    const keys = m[3].split(',')
      .map(k => k.trim().replace(/\/\*.*?\*\//g, '').replace(/\n/g, '').trim())
      .filter(Boolean);

    // keymapData uses visual grid: keymapData[layer][r][c]
    // where r=0..rows-1, c=0..cols*2-1 (left: 0..cols-1, right: cols..cols*2-1)
    // layoutKeys defines the mapping: layoutKeys[i].matrix=[matRow,matCol]
    // We need: visual position -> keycode from keys[i]
    //
    // Strategy: build a matrix-coord -> keycode map from layoutKeys+keys,
    // then build visual grid using layoutKeys' x,y positions to determine
    // visual row/col slot. Fallback: flat positional order.

    const layerArr = [];
    for (let r = 0; r < rows; r++) {
      layerArr.push(new Array(cols * 2).fill('KC_TRNS'));
    }

    if (typeof layoutKeys !== 'undefined' && layoutKeys.length > 0) {
      // Sort layoutKeys by y then x to get visual row order
      // Build a visual-slot -> keycode mapping
      // Each layoutKey has {x, y, matrix:[matRow,matCol]}
      // Visual row = round(y), visual col = round(x) (capped to grid)
      // But simpler: just use order of layoutKeys as positional sequence,
      // map back to visual grid by finding which visual slot has that matrix coord.

      // Build matrix-coord -> visual-slot lookup
      // Visual grid: left half rows 0..rows-1 have matRow 0..rows-1
      //              right half rows 0..rows-1 have matRow rows..rows*2-1
      // visual col: left = matCol, right = matCol + cols
      layoutKeys.forEach((lk, i) => {
        const [matRow, matCol] = lk.matrix;
        // Determine visual row and col from matrix coords
        let vRow, vCol;
        if (matRow < rows) {
          // Left half
          vRow = matRow;
          vCol = matCol;
        } else {
          // Right half: matrix row offset by rows
          vRow = matRow - rows;
          vCol = matCol + cols;
        }
        if (vRow >= 0 && vRow < rows && vCol >= 0 && vCol < cols * 2) {
          layerArr[vRow][vCol] = keys[i] || 'KC_TRNS';
        }
      });
    } else {
      // Fallback: flat positional — left half first, then right
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols * 2; c++) {
          layerArr[r][c] = keys[r * cols * 2 + c] || 'KC_TRNS';
        }
      }
    }

    keymapData.push(layerArr);
  });

  if (keymapData.length === 0) initKeymapData();
}
