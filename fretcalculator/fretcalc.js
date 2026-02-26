let selectedFret = null;

function selectFret(fret) {
  const prev = document.querySelector('#tableBody tr.selected');
  if (prev) prev.classList.remove('selected');
  if (selectedFret === fret) {
    selectedFret = null;
    redrawNeck();
    return;
  }
  selectedFret = fret;
  const row = document.querySelector(`#tableBody [data-fret="${fret}"]`);
  if (row) row.classList.add('selected');
  redrawNeck();
}

function redrawNeck() {
  const { bass: bassScale, treble: trebleScale } = getScalesMm();
  const numFrets = parseInt(document.getElementById('numFrets').value) || 24;
  const perpFret = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);
  const rows = calcFrets(bassScale, trebleScale, numFrets, perpFret);
  drawNeck(rows, bassScale, trebleScale, numFrets, perpFret, selectedFret);
}

function calcFrets(bassScale, trebleScale, numFrets, perpFret) {
  // Fret positions are simply measured from each side's own nut — no offset involved.
  // offset is only a canvas geometry concept (how much the bass nut is set back).
  const rows = [];
  for (let n = 1; n <= numFrets; n++) {
    const bassPos   = Math.round((bassScale   - bassScale   / Math.pow(2, n / 12)) * 10) / 10;
    const treblePos = Math.round((trebleScale - trebleScale / Math.pow(2, n / 12)) * 10) / 10;

    let bassSpacing, trebleSpacing;
    if (n === 1) {
      bassSpacing   = bassPos;
      trebleSpacing = treblePos;
    } else {
      const prevBass   = Math.round((bassScale   - bassScale   / Math.pow(2, (n-1) / 12)) * 10) / 10;
      const prevTreble = Math.round((trebleScale - trebleScale / Math.pow(2, (n-1) / 12)) * 10) / 10;
      bassSpacing   = Math.round((bassPos - prevBass)   * 10) / 10;
      trebleSpacing = Math.round((treblePos - prevTreble) * 10) / 10;
    }

    rows.push({ fret: n, bassPos, treblePos, bassSpacing, trebleSpacing });
  }
  return rows;
}

function render() {
  updateConvertHints();
  const { bass: bassScale, treble: trebleScale } = getScalesMm();
  const numFrets    = parseInt(document.getElementById('numFrets').value)       || 24;
  const perpFret    = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);

  const rows = calcFrets(bassScale, trebleScale, numFrets, perpFret);

  // Stats
  const stats = document.getElementById('statsRow');
  const diff = Math.round((bassScale - trebleScale) * 10) / 10;
  const perpRow = perpFret === 0 ? { bassPos: 0, treblePos: 0 } : rows.find(r => r.fret === perpFret);
  const treblePerpMm = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const bassPerpMm   = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const nutOffset    = Math.round((treblePerpMm - bassPerpMm) * 10) / 10;
  const nutOffsetStr = nutOffset === 0 ? '0.0 mm' : (nutOffset > 0 ? `+${nutOffset} mm (bass back)` : `${nutOffset} mm (treble back)`);
  stats.innerHTML = `
    <div class="stat"><div class="stat-label">Scale Spread</div><div class="stat-value">${diff} mm</div></div>
    <div class="stat"><div class="stat-label">Perp Fret Bass</div><div class="stat-value">${perpRow ? perpRow.bassPos : '-'} mm</div></div>
    <div class="stat"><div class="stat-label">Perp Fret Treble</div><div class="stat-value green">${perpRow ? perpRow.treblePos : '-'} mm</div></div>
    <div class="stat" title="Distance bass nut sits behind treble nut (measured perpendicular to strings)"><div class="stat-label">Nut Offset ⊥</div><div class="stat-value" style="font-size:0.95rem">${nutOffsetStr}</div></div>
  `;

  // Table
  const tbody = document.getElementById('tableBody');
  const fret0class = perpFret === 0 ? 'perp-fret' : '';
  const fret0badge = perpFret === 0 ? '<span class="perp-badge">⊥</span>' : '';
  const tp0 = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const bp0 = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const nut0offset = Math.round((tp0 - bp0) * 10) / 10;
  const bassNormalize = nut0offset < 0 ? Math.abs(nut0offset) : 0;
  const fret0html = `<tr class="${fret0class}" data-fret="0" onclick="selectFret(0)">
      <td>0${fret0badge}</td>
      <td class="bass">0.0</td>
      <td class="treble">0.0</td>
      <td class="spacing-bass" title="Nut offset: bass nut is ${Math.abs(nut0offset)}mm ${nut0offset >= 0 ? 'behind' : 'ahead of'} treble nut">${nut0offset >= 0 ? '+' : ''}${nut0offset} ofs</td>
      <td class="spacing-treble">—</td>
    </tr>`;
  tbody.innerHTML = fret0html + rows.map(r => `
    <tr class="${r.fret === perpFret ? 'perp-fret' : ''}" data-fret="${r.fret}" onclick="selectFret(${r.fret})">
      <td>${r.fret}${r.fret === perpFret ? '<span class="perp-badge">⊥</span>' : ''}</td>
      <td class="bass">${r.bassPos.toFixed(1)}</td>
      <td class="treble">${r.treblePos.toFixed(1)}</td>
      <td class="spacing-bass">${r.bassSpacing.toFixed(1)}</td>
      <td class="spacing-treble">${r.trebleSpacing.toFixed(1)}</td>
    </tr>
  `).join('');

  if (selectedFret !== null) {
    const sel = tbody.querySelector(`[data-fret="${selectedFret}"]`);
    if (sel) sel.classList.add('selected');
  }

  drawNeck(rows, bassScale, trebleScale, numFrets, perpFret, selectedFret);
}

function drawNeck(rows, bassScale, trebleScale, numFrets, perpFret, selectedFret = null) {
  const canvas = document.getElementById('neckCanvas');
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  // Read CSS variables so canvas respects light/dark theme
  const style = getComputedStyle(document.body);
  const cssAccent  = style.getPropertyValue('--accent').trim();
  const cssAccent2 = style.getPropertyValue('--accent2').trim();
  const cssMuted   = style.getPropertyValue('--muted').trim();
  const cssBg      = style.getPropertyValue('--bg').trim();
  const isLight    = document.body.classList.contains('light');

  const padTop    = 30;
  const padBottom = 36;
  const padLeft   = 42;
  const padRight  = 42;

  const W = parent.clientWidth - 24;
  const drawW = W - padLeft - padRight;

  const realNutMm = 43;
  const pxPerMm   = drawW / realNutMm;

  const _tp = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const _bp = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const _off = _tp - _bp;
  const extraTop = 0; // nut shifts handled by bassNutShift/trebleNutShift
  const drawH    = Math.max(bassScale, trebleScale) * pxPerMm + Math.abs(_off) * pxPerMm;
  const H        = drawH + padTop + padBottom + extraTop;

  canvas.width       = W * dpr;
  canvas.height      = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!rows || rows.length === 0) return;

  const xBass   = padLeft;
  const xTreble = padLeft + drawW;

  const yShift  = extraTop;
  const bassY   = mm => padTop + yShift + mm * pxPerMm;
  const trebleY = mm => padTop + yShift + mm * pxPerMm;

  const treblePerpPos = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const bassPerpPos   = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const offset        = treblePerpPos - bassPerpPos;
  // offset > 0: bass nut is set back (below treble nut on canvas)
  // offset < 0: treble nut is set back (below bass nut on canvas)
  const bassNutShift   = offset > 0 ? offset : 0;  // bass nut pushed down
  const trebleNutShift = offset < 0 ? -offset : 0; // treble nut pushed down

  const nutBassY   = bassY(bassNutShift);
  const nutTrebleY = trebleY(trebleNutShift);

  const bridgeBassY   = bassY(bassScale   + bassNutShift);
  const bridgeTrebleY = trebleY(trebleScale + trebleNutShift);

  const bodyExtra = drawW * (56/43 - 1) / 2;

  const nutLeft  = xBass;
  const nutRight = xTreble;

  const bridgeBassX   = xBass   - bodyExtra;
  const bridgeTrebleX = xTreble + bodyExtra;

  const neckGrad = ctx.createLinearGradient(0, Math.min(nutBassY, nutTrebleY), 0, Math.max(bridgeBassY, bridgeTrebleY));
  neckGrad.addColorStop(0,   isLight ? '#c8bfa8' : '#1e1a12');
  neckGrad.addColorStop(0.5, isLight ? '#bdb49c' : '#29221a');
  neckGrad.addColorStop(1,   isLight ? '#c2b9a2' : '#1a1510');
  ctx.beginPath();
  ctx.moveTo(nutLeft,        nutBassY);
  ctx.lineTo(nutRight,       nutTrebleY);
  ctx.lineTo(bridgeTrebleX,  bridgeTrebleY);
  ctx.lineTo(bridgeBassX,    bridgeBassY);
  ctx.closePath();
  ctx.fillStyle = neckGrad;
  ctx.fill();

  ctx.strokeStyle = isLight ? 'rgba(80,60,30,0.35)' : 'rgba(100,80,50,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(nutLeft, nutBassY); ctx.lineTo(bridgeBassX, bridgeBassY); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nutRight, nutTrebleY); ctx.lineTo(bridgeTrebleX, bridgeTrebleY); ctx.stroke();

  const edgeBassX = y => {
    const t = (y - nutBassY) / (bridgeBassY - nutBassY);
    return nutLeft + (bridgeBassX - nutLeft) * Math.max(0, Math.min(1, t));
  };
  const edgeTrebleX = y => {
    const t = (y - nutTrebleY) / (bridgeTrebleY - nutTrebleY);
    return nutRight + (bridgeTrebleX - nutRight) * Math.max(0, Math.min(1, t));
  };

  const numStrings = 6;
  ctx.save();
  for (let s = 0; s < numStrings; s++) {
    const t = s / (numStrings - 1);
    const stringScale = bassScale + (trebleScale - bassScale) * t;
    const sNutX = nutLeft  + (nutRight  - nutLeft)  * t;
    const sNutY = nutBassY + (nutTrebleY - nutBassY) * t;
    const sBridgeY = bassY(stringScale + bassNutShift + (trebleNutShift - bassNutShift) * t);
    const sBridgeX = bridgeBassX + (bridgeTrebleX - bridgeBassX) * t;
    ctx.beginPath();
    ctx.moveTo(sNutX, sNutY);
    ctx.lineTo(sBridgeX, sBridgeY);
    ctx.strokeStyle = isLight ? `rgba(80,60,20,${0.15 + t * 0.1})` : `rgba(220,205,170,${0.1 + t * 0.07})`;
    ctx.lineWidth = 0.35 + t * 0.2;
    ctx.stroke();
  }
  ctx.restore();

  const dotFrets    = new Set([3,5,7,9,12,15,17,19,21,24]);
  const doubleDots  = new Set([12,24]);

  const allRowsWithNut = [{ fret: 0, bassPos: bassNutShift, treblePos: trebleNutShift }, ...rows];
  if (selectedFret !== null) {
    const selIdx = allRowsWithNut.findIndex(r => r.fret === selectedFret);
    if (selIdx >= 0) {
      const selRow  = allRowsWithNut[selIdx];
      const prevRow = selIdx > 0 ? allRowsWithNut[selIdx - 1] : null;

      const sby = selRow.fret === 0 ? nutBassY   : bassY(selRow.bassPos + bassNutShift);
      const sty = selRow.fret === 0 ? nutTrebleY : trebleY(selRow.treblePos + trebleNutShift);
      const sbx = selRow.fret === 0 ? nutLeft    : edgeBassX(sby);
      const stx = selRow.fret === 0 ? nutRight   : edgeTrebleX(sty);

      if (prevRow) {
        const pby = prevRow.fret === 0 ? nutBassY   : bassY(prevRow.bassPos + bassNutShift);
        const pty = prevRow.fret === 0 ? nutTrebleY : trebleY(prevRow.treblePos + trebleNutShift);
        const pbx = prevRow.fret === 0 ? nutLeft    : edgeBassX(pby);
        const ptx = prevRow.fret === 0 ? nutRight   : edgeTrebleX(pty);

        ctx.beginPath();
        ctx.moveTo(pbx, pby);
        ctx.lineTo(ptx, pty);
        ctx.lineTo(stx, sty);
        ctx.lineTo(sbx, sby);
        ctx.closePath();
        ctx.fillStyle = isLight ? 'rgba(110,200,169,0.18)' : 'rgba(110,200,169,0.12)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(sbx, sby);
      ctx.lineTo(stx, sty);
      ctx.strokeStyle = cssAccent2;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  rows.forEach(r => {
    const isPerp = r.fret === perpFret;
    const isSel  = r.fret === selectedFret;
    const by = bassY(r.bassPos + bassNutShift);
    const ty = trebleY(r.treblePos + trebleNutShift);
    const bx = edgeBassX(by);
    const tx = edgeTrebleX(ty);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = isSel
      ? cssAccent2
      : isPerp
        ? cssAccent
        : isLight ? 'rgba(80,70,50,0.3)' : 'rgba(185,175,155,0.28)';
    ctx.lineWidth = isSel ? 2 : isPerp ? 2 : 0.85;
    ctx.stroke();
  });

  const allRows = [{ fret: 0, bassPos: bassNutShift, treblePos: trebleNutShift }, ...rows];

  rows.forEach((r, i) => {
    if (!dotFrets.has(r.fret)) return;

    const prev = allRows[i];

    const prevBassY   = bassY(prev.bassPos + bassNutShift);
    const prevTrebleY = trebleY(prev.treblePos + trebleNutShift);
    const currBassY   = bassY(r.bassPos + bassNutShift);
    const currTrebleY = trebleY(r.treblePos + trebleNutShift);

    const midBassY   = (prevBassY   + currBassY)   / 2;
    const midTrebleY = (prevTrebleY + currTrebleY) / 2;

    const midBassX   = edgeBassX(midBassY);
    const midTrebleX = edgeTrebleX(midTrebleY);

    const dotX = (midBassX + midTrebleX) / 2;
    const dotY = (midBassY + midTrebleY) / 2;

    const isPerp  = r.fret === perpFret;
    const dotColor = isPerp ? cssAccent : isLight ? 'rgba(80,70,50,0.3)' : 'rgba(210,190,150,0.35)';
    const dotR = 3;

    if (doubleDots.has(r.fret)) {
      const spacing = dotR * 3;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.arc(dotX + side * spacing, dotY, dotR, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      });
    } else {
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }
  });

  ctx.beginPath();
  ctx.moveTo(nutLeft,  nutBassY);
  ctx.lineTo(nutRight, nutTrebleY);
  ctx.strokeStyle = cssAccent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.beginPath();
  ctx.moveTo(bridgeBassX,   bridgeBassY);
  ctx.lineTo(bridgeTrebleX, bridgeTrebleY);
  ctx.strokeStyle = cssAccent2;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = cssAccent2;
  [[bridgeBassX, bridgeBassY], [bridgeTrebleX, bridgeTrebleY]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  });

  const labelX = xBass - 6;

  ctx.font = 'bold 8px JetBrains Mono, monospace';
  ctx.textAlign = 'right';
  const isNutPerp = perpFret === 0;
  ctx.fillStyle = isNutPerp ? cssAccent : isLight ? 'rgba(80,70,50,0.6)' : 'rgba(210,185,120,0.7)';
  ctx.fillText(isNutPerp ? '0 ⊥' : '0', labelX, nutBassY + 3);

  rows.forEach(r => {
    const isPerp = r.fret === perpFret;
    const isSel  = r.fret === selectedFret;
    const by = bassY(r.bassPos + bassNutShift);
    const bx = edgeBassX(by);

    const label = isPerp ? `${r.fret} ⊥` : `${r.fret}`;

    ctx.font = (isPerp || isSel)
      ? 'bold 8px JetBrains Mono, monospace'
      : '8px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = isSel ? cssAccent2 : isPerp ? cssAccent : isLight ? 'rgba(60,50,30,0.5)' : 'rgba(180,170,150,0.55)';

    ctx.fillText(label, bx - 6, by + 3);
  });

  ctx.font = 'bold 9px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  const nutMidX = (nutLeft + nutRight) / 2;
  const nutMidY = (nutBassY + nutTrebleY) / 2;
  ctx.fillStyle = isLight ? 'rgba(80,60,20,0.6)' : 'rgba(210,185,120,0.6)';
  ctx.fillText('NUT', nutMidX, nutMidY - 10);

  const bMidX = (bridgeBassX + bridgeTrebleX) / 2;
  const bMidY = (bridgeBassY + bridgeTrebleY) / 2;
  ctx.fillStyle = cssAccent2;
  ctx.fillText('BRIDGE', bMidX, bMidY + 16);

  ctx.font = '8px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = isLight ? 'rgba(60,100,160,0.7)' : 'rgba(184,212,240,0.6)';
  ctx.fillText(`${bassScale}mm`, bridgeBassX, bridgeBassY + 18);
  ctx.fillStyle = isLight ? 'rgba(30,120,90,0.7)' : 'rgba(110,200,169,0.6)';
  ctx.fillText(`${trebleScale}mm`, bridgeTrebleX, bridgeTrebleY + 18);

  ctx.font = '8px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? 'rgba(60,100,160,0.35)' : 'rgba(184,212,240,0.35)';
  ctx.save();
  ctx.translate(8, padTop + yShift + drawH * 0.25);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('BASS', 0, 0);
  ctx.restore();

  ctx.fillStyle = isLight ? 'rgba(30,120,90,0.35)' : 'rgba(110,200,169,0.35)';
  ctx.save();
  ctx.translate(W - 8, padTop + yShift + drawH * 0.25);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('TREBLE', 0, 0);
  ctx.restore();
}


function exportPDF() {
  const { bass: bassScale, treble: trebleScale } = getScalesMm();
  const numFrets  = parseInt(document.getElementById('numFrets').value) || 24;
  const perpFret  = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);
  const rows      = calcFrets(bassScale, trebleScale, numFrets, perpFret);

  const { jsPDF } = window.jspdf;

  // --- Real-world dimensions in mm ---
  const marginLeft   = 25;   // mm left margin
  const marginTop    = 20;   // mm top margin
  const marginBottom = 20;
  const marginRight  = 20;
  const nutWidthMm   = 43;   // real nut width mm
  const bridgeWidthMm = 56;  // real bridge width mm

  // Page height = max scale + offset allowance + margins
  const treblePerpPos = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const bassPerpPos   = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const offset        = treblePerpPos - bassPerpPos;
  const extraTop      = offset < 0 ? Math.abs(offset) : 0;
  const pageH         = marginTop + extraTop + Math.max(bassScale, trebleScale) + Math.abs(offset) + marginBottom;
  const pageW         = marginLeft + bridgeWidthMm + marginRight;

  const doc = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait' });

  // Helpers: mm coordinates on page
  const xCenter    = marginLeft + bridgeWidthMm / 2;
  const xBass      = marginLeft + (bridgeWidthMm - nutWidthMm) / 2;          // bass (left) nut corner
  const xTreble    = xBass + nutWidthMm;                                      // treble (right) nut corner
  const xBridgeBass   = marginLeft;
  const xBridgeTreble = marginLeft + bridgeWidthMm;

  const nutBassY    = marginTop + extraTop + offset;
  const nutTrebleY  = marginTop + extraTop;
  const bridgeBassY    = marginTop + extraTop + bassScale + offset;
  const bridgeTrebleY  = marginTop + extraTop + trebleScale;

  // Interpolate X along neck edges at a given Y
  const edgeBassX    = y => xBass    + (xBridgeBass    - xBass)    * (y - nutBassY)   / (bridgeBassY   - nutBassY);
  const edgeTrebleX  = y => xTreble  + (xBridgeTreble  - xTreble)  * (y - nutTrebleY) / (bridgeTrebleY - nutTrebleY);

  // --- Background ---
  doc.setFillColor(248, 244, 236);
  doc.rect(0, 0, pageW, pageH, 'F');

  // --- Neck fill ---
  doc.setFillColor(210, 195, 165);
  doc.setDrawColor(160, 130, 80);
  doc.setLineWidth(0.3);
  const neckPoly = [
    { x: xBass,         y: nutBassY      },
    { x: xTreble,       y: nutTrebleY    },
    { x: xBridgeTreble, y: bridgeTrebleY },
    { x: xBridgeBass,   y: bridgeBassY   },
  ];
  doc.setFillColor(210, 195, 165);
  // Draw as lines since jsPDF polygon support is limited
  doc.lines(
    [
      [xTreble - xBass,         nutTrebleY - nutBassY],
      [xBridgeTreble - xTreble, bridgeTrebleY - nutTrebleY],
      [xBridgeBass - xBridgeTreble, bridgeBassY - bridgeTrebleY],
      [xBass - xBridgeBass,     nutBassY - bridgeBassY],
    ],
    xBass, nutBassY, [1, 1], 'FD', true
  );

  // --- NUT ---
  doc.setDrawColor(160, 120, 50);
  doc.setLineWidth(1.2);
  doc.line(xBass, nutBassY, xTreble, nutTrebleY);

  // --- BRIDGE ---
  doc.setDrawColor(46, 148, 112);
  doc.setLineWidth(0.8);
  doc.line(xBridgeBass, bridgeBassY, xBridgeTreble, bridgeTrebleY);

  // Bridge dots
  doc.setFillColor(46, 148, 112);
  doc.circle(xBridgeBass,   bridgeBassY,   1.2, 'F');
  doc.circle(xBridgeTreble, bridgeTrebleY, 1.2, 'F');

  // --- FRETS ---
  const dotFrets   = new Set([3,5,7,9,12,15,17,19,21,24]);
  const doubleDots = new Set([12,24]);
  const allRows    = [{ fret: 0, bassPos: offset, treblePos: 0 }, ...rows];

  rows.forEach(r => {
    const isPerp = r.fret === perpFret;
    const by = marginTop + extraTop + r.bassPos;
    const ty = marginTop + extraTop + r.treblePos;
    const bx = edgeBassX(by);
    const tx = edgeTrebleX(ty);

    if (isPerp) {
      doc.setDrawColor(160, 120, 50);
      doc.setLineWidth(0.5);
    } else {
      doc.setDrawColor(120, 110, 90);
      doc.setLineWidth(0.2);
    }
    doc.line(bx, by, tx, ty);

    // Fret number label
    doc.setFontSize(5);
    doc.setTextColor(100, 90, 70);
    doc.text(isPerp ? `${r.fret} ⊥` : `${r.fret}`, bx - 3, by + 0.5, { align: 'right' });
  });

  // --- DOTS ---
  rows.forEach((r, i) => {
    if (!dotFrets.has(r.fret)) return;
    const prev = allRows[i];
    const midBassY   = (marginTop + extraTop + prev.bassPos   + marginTop + extraTop + r.bassPos)   / 2;
    const midTrebleY = (marginTop + extraTop + prev.treblePos + marginTop + extraTop + r.treblePos) / 2;
    const dotX = (edgeBassX(midBassY) + edgeTrebleX(midTrebleY)) / 2;
    const dotY = (midBassY + midTrebleY) / 2;
    const isPerp = r.fret === perpFret;
    doc.setFillColor(isPerp ? 160 : 140, isPerp ? 120 : 120, isPerp ? 50 : 90);
    if (doubleDots.has(r.fret)) {
      doc.circle(dotX - 2.5, dotY, 1.0, 'F');
      doc.circle(dotX + 2.5, dotY, 1.0, 'F');
    } else {
      doc.circle(dotX, dotY, 1.0, 'F');
    }
  });

  // --- Labels ---
  doc.setFontSize(6);
  doc.setTextColor(60, 50, 30);
  doc.text('NUT', xCenter, Math.min(nutBassY, nutTrebleY) - 3, { align: 'center' });
  doc.setTextColor(46, 148, 112);
  doc.text('BRIDGE', xCenter, Math.max(bridgeBassY, bridgeTrebleY) + 6, { align: 'center' });

  // Scale length annotations
  doc.setFontSize(5.5);
  doc.setTextColor(58, 111, 160);
  doc.text(`${bassScale} mm`, xBridgeBass - 1, bridgeBassY + 10, { align: 'center' });
  doc.setTextColor(46, 148, 112);
  doc.text(`${trebleScale} mm`, xBridgeTreble + 1, bridgeTrebleY + 10, { align: 'center' });

  // Title
  doc.setFontSize(9);
  doc.setTextColor(160, 120, 50);
  doc.text(`Fret Calculator — Bass ${bassScale}mm / Treble ${trebleScale}mm`, xCenter, 10, { align: 'center' });

  doc.save(`fretboard-bass${bassScale}-treble${trebleScale}.pdf`);
}

function exportCSV() {
  const { bass: bassScale, treble: trebleScale } = getScalesMm();
  const numFrets    = parseInt(document.getElementById('numFrets').value)       || 24;
  const perpFret    = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);

  const rows = calcFrets(bassScale, trebleScale, numFrets, perpFret);
  let csv = 'Fret,Bass Side (mm),Treble Side (mm),Bass Spacing (mm),Treble Spacing (mm)\r\n';
  rows.forEach(r => {
    csv += [r.fret, r.bassPos, r.treblePos, r.bassSpacing, r.trebleSpacing].join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fret-positions-bass${bassScale}-treble${trebleScale}.csv`;
  a.click();
}

// Unit handling
let currentUnit = 'mm';

function toggleTheme() {
  document.body.classList.toggle('light');
  redrawNeck();
}


function setUnit(unit) {
  if (unit === currentUnit) return;

  const bassInput    = document.getElementById('bassScale');
  const trebleInput  = document.getElementById('trebleScale');
  const bassVal      = parseFloat(bassInput.value)   || 0;
  const trebleVal    = parseFloat(trebleInput.value) || 0;

  if (unit === 'in') {
    bassInput.value   = (bassVal   / 25.4).toFixed(4);
    trebleInput.value = (trebleVal / 25.4).toFixed(4);
    bassInput.step    = '0.001';
    trebleInput.step  = '0.001';
    bassInput.min     = '10'; bassInput.max = '50';
    trebleInput.min   = '10'; trebleInput.max = '50';
  } else {
    bassInput.value   = (bassVal   * 25.4).toFixed(1);
    trebleInput.value = (trebleVal * 25.4).toFixed(1);
    bassInput.step    = '0.5';
    trebleInput.step  = '0.5';
    bassInput.min     = '100'; bassInput.max = '1200';
    trebleInput.min   = '100'; trebleInput.max = '1200';
  }

  currentUnit = unit;
  document.getElementById('btnMm').classList.toggle('active', unit === 'mm');
  document.getElementById('btnIn').classList.toggle('active', unit === 'in');
  render();
}

function getScalesMm() {
  const bassRaw   = parseFloat(document.getElementById('bassScale').value)   || (currentUnit === 'mm' ? 648 : 25.512);
  const trebleRaw = parseFloat(document.getElementById('trebleScale').value) || (currentUnit === 'mm' ? 628 : 24.724);
  if (currentUnit === 'in') {
    return { bass: bassRaw * 25.4, treble: trebleRaw * 25.4 };
  }
  return { bass: bassRaw, treble: trebleRaw };
}

function updateConvertHints() {
  const bassRaw   = parseFloat(document.getElementById('bassScale').value)   || 0;
  const trebleRaw = parseFloat(document.getElementById('trebleScale').value) || 0;

  if (currentUnit === 'mm') {
    document.getElementById('bassConvert').textContent   = `≈ ${(bassRaw   / 25.4).toFixed(3)}″`;
    document.getElementById('trebleConvert').textContent = `≈ ${(trebleRaw / 25.4).toFixed(3)}″`;
  } else {
    document.getElementById('bassConvert').textContent   = `≈ ${(bassRaw   * 25.4).toFixed(1)} mm`;
    document.getElementById('trebleConvert').textContent = `≈ ${(trebleRaw * 25.4).toFixed(1)} mm`;
  }
}

// Init & listeners
['bassScale','trebleScale','numFrets','perpFret'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
});

window.addEventListener('resize', () => {
  const { bass, treble } = getScalesMm();
  const numFrets = parseInt(document.getElementById('numFrets').value) || 24;
  const perpFret = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);
  drawNeck(calcFrets(bass, treble, numFrets, perpFret), bass, treble, numFrets, perpFret);
});

render();
