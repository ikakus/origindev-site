let selectedFret = null;

// ── Constants ─────────────────────────────────────────────────────────────────
const NUT_WIDTH_MM    = 43;
const BRIDGE_WIDTH_MM = 56;
const DOT_FRETS       = new Set([3,5,7,9,12,15,17,19,21,24]);
const DOUBLE_DOTS     = new Set([12,24]);

// ── Shared geometry ───────────────────────────────────────────────────────────
// Single source of truth for all layout values.
// scale=pxPerMm for canvas, scale=1 for PDF (which works in mm directly).
// originX/originY are in mm (margins).
function buildGeometry(bassScale, trebleScale, perpFret, scale, originX, originY) {
  const treblePerpPos  = trebleScale - trebleScale / Math.pow(2, perpFret / 12);
  const bassPerpPos    = bassScale   - bassScale   / Math.pow(2, perpFret / 12);
  const offset         = treblePerpPos - bassPerpPos;
  const bassNutShift   = offset > 0 ? offset : 0;
  const trebleNutShift = offset < 0 ? -offset : 0;
  const bodyExtra      = (BRIDGE_WIDTH_MM - NUT_WIDTH_MM) / 2;

  const xNutBass      = (originX + bodyExtra)                * scale;
  const xNutTreble    = (originX + bodyExtra + NUT_WIDTH_MM) * scale;
  const xBridgeBass   =  originX                             * scale;
  const xBridgeTreble = (originX + BRIDGE_WIDTH_MM)          * scale;

  const yNutBass      = (originY + bassNutShift)                 * scale;
  const yNutTreble    = (originY + trebleNutShift)               * scale;
  const yBridgeBass   = (originY + bassNutShift   + bassScale)   * scale;
  const yBridgeTreble = (originY + trebleNutShift + trebleScale) * scale;

  const edgeBassX   = y => xNutBass   + (xBridgeBass   - xNutBass)   * (y - yNutBass)   / (yBridgeBass   - yNutBass);
  const edgeTrebleX = y => xNutTreble + (xBridgeTreble - xNutTreble) * (y - yNutTreble) / (yBridgeTreble - yNutTreble);

  // fretBassY/fretTrebleY: r comes from calcFrets, bassPos/treblePos measured from own nut
  const fretBassY   = r => yNutBass   + r.bassPos   * scale;
  const fretTrebleY = r => yNutTreble + r.treblePos * scale;

  return {
    bassNutShift, trebleNutShift, bodyExtra,
    xNutBass, xNutTreble, xBridgeBass, xBridgeTreble,
    yNutBass, yNutTreble, yBridgeBass, yBridgeTreble,
    edgeBassX, edgeTrebleX, fretBassY, fretTrebleY,
  };
}

// ── Fret calculation ──────────────────────────────────────────────────────────
function calcFrets(bassScale, trebleScale, numFrets) {
  const rows = [];
  for (let n = 1; n <= numFrets; n++) {
    const bassPos   = Math.round((bassScale   - bassScale   / Math.pow(2, n / 12)) * 10) / 10;
    const treblePos = Math.round((trebleScale - trebleScale / Math.pow(2, n / 12)) * 10) / 10;
    let bassSpacing, trebleSpacing;
    if (n === 1) {
      bassSpacing = bassPos; trebleSpacing = treblePos;
    } else {
      const pb = Math.round((bassScale   - bassScale   / Math.pow(2, (n-1) / 12)) * 10) / 10;
      const pt = Math.round((trebleScale - trebleScale / Math.pow(2, (n-1) / 12)) * 10) / 10;
      bassSpacing   = Math.round((bassPos   - pb) * 10) / 10;
      trebleSpacing = Math.round((treblePos - pt) * 10) / 10;
    }
    rows.push({ fret: n, bassPos, treblePos, bassSpacing, trebleSpacing });
  }
  return rows;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function getParams() {
  const { bass, treble } = getScalesMm();
  const numFrets = parseInt(document.getElementById('numFrets').value) || 24;
  const perpFret = Math.max(0, parseInt(document.getElementById('perpFret').value) || 0);
  return { bassScale: bass, trebleScale: treble, numFrets, perpFret };
}

function selectFret(fret) {
  const prev = document.querySelector('#tableBody tr.selected');
  if (prev) prev.classList.remove('selected');
  if (selectedFret === fret) { selectedFret = null; redrawNeck(); return; }
  selectedFret = fret;
  const row = document.querySelector(`#tableBody [data-fret="${fret}"]`);
  if (row) row.classList.add('selected');
  redrawNeck();
}

function redrawNeck() {
  const { bassScale, trebleScale, numFrets, perpFret } = getParams();
  drawNeck(calcFrets(bassScale, trebleScale, numFrets), bassScale, trebleScale, numFrets, perpFret, selectedFret);
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  updateConvertHints();
  const { bassScale, trebleScale, numFrets, perpFret } = getParams();
  const rows = calcFrets(bassScale, trebleScale, numFrets);

  const nutOffset    = Math.round(((trebleScale - trebleScale / Math.pow(2, perpFret / 12)) -
                                   (bassScale   - bassScale   / Math.pow(2, perpFret / 12))) * 10) / 10;
  const nutOffsetStr = nutOffset === 0 ? '0.0 mm'
    : nutOffset > 0 ? `+${nutOffset} mm (bass back)` : `${nutOffset} mm (treble back)`;
  const perpRow = perpFret === 0 ? { bassPos: 0, treblePos: 0 } : rows.find(r => r.fret === perpFret);
  const diff = Math.round((bassScale - trebleScale) * 10) / 10;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat"><div class="stat-label">Scale Spread</div><div class="stat-value">${diff} mm</div></div>
    <div class="stat"><div class="stat-label">Perp Fret Bass</div><div class="stat-value">${perpRow ? perpRow.bassPos : '-'} mm</div></div>
    <div class="stat"><div class="stat-label">Perp Fret Treble</div><div class="stat-value green">${perpRow ? perpRow.treblePos : '-'} mm</div></div>
    <div class="stat" title="Distance bass nut sits behind treble nut"><div class="stat-label">Nut Offset ⊥</div><div class="stat-value" style="font-size:0.95rem">${nutOffsetStr}</div></div>
  `;

  document.getElementById('tableBody').innerHTML =
    `<tr class="${perpFret===0?'perp-fret':''}" data-fret="0" onclick="selectFret(0)">
      <td>0${perpFret===0?'<span class="perp-badge">⊥</span>':''}</td>
      <td class="bass">0.0</td><td class="treble">0.0</td>
      <td class="spacing-bass">${nutOffset>=0?'+':''}${nutOffset} ofs</td>
      <td class="spacing-treble">—</td>
    </tr>` +
    rows.map(r => `
    <tr class="${r.fret===perpFret?'perp-fret':''}" data-fret="${r.fret}" onclick="selectFret(${r.fret})">
      <td>${r.fret}${r.fret===perpFret?'<span class="perp-badge">⊥</span>':''}</td>
      <td class="bass">${r.bassPos.toFixed(1)}</td>
      <td class="treble">${r.treblePos.toFixed(1)}</td>
      <td class="spacing-bass">${r.bassSpacing.toFixed(1)}</td>
      <td class="spacing-treble">${r.trebleSpacing.toFixed(1)}</td>
    </tr>`).join('');

  if (selectedFret !== null) {
    const sel = document.querySelector(`#tableBody [data-fret="${selectedFret}"]`);
    if (sel) sel.classList.add('selected');
  }

  drawNeck(rows, bassScale, trebleScale, numFrets, perpFret, selectedFret);
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function drawNeck(rows, bassScale, trebleScale, numFrets, perpFret, selectedFret = null) {
  const canvas = document.getElementById('neckCanvas');
  const parent = canvas.parentElement;
  const dpr    = window.devicePixelRatio || 1;

  const cs       = getComputedStyle(document.body);
  const accent   = cs.getPropertyValue('--accent').trim();
  const accent2  = cs.getPropertyValue('--accent2').trim();
  const isLight  = document.body.classList.contains('light');

  const padTop = 30, padBottom = 36, padLeft = 42, padRight = 42;
  const W      = parent.clientWidth - 24;
  const drawW  = W - padLeft - padRight;
  // Scale based on BRIDGE width (widest part) so the full neck fits within drawW
  const pxPerMm = drawW / BRIDGE_WIDTH_MM;
  // originX in mm: padLeft converted to mm (bridge starts at originX, nut is centered above it)
  const originXmm = padLeft / pxPerMm;
  const originYmm = padTop  / pxPerMm;

  const geo = buildGeometry(bassScale, trebleScale, perpFret, pxPerMm, originXmm, originYmm);
  const { xNutBass, xNutTreble, xBridgeBass, xBridgeTreble,
          yNutBass, yNutTreble, yBridgeBass, yBridgeTreble,
          edgeBassX, edgeTrebleX, fretBassY, fretTrebleY,
          bassNutShift, trebleNutShift } = geo;

  const drawH = Math.max(yBridgeBass, yBridgeTreble) - Math.min(yNutBass, yNutTreble) + padBottom;
  const H = Math.max(yBridgeBass, yBridgeTreble) + padBottom;

  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);
  if (!rows || rows.length === 0) return;

  // Neck fill
  const grad = ctx.createLinearGradient(0, Math.min(yNutBass,yNutTreble), 0, Math.max(yBridgeBass,yBridgeTreble));
  grad.addColorStop(0,   isLight ? '#c8bfa8' : '#1e1a12');
  grad.addColorStop(0.5, isLight ? '#bdb49c' : '#29221a');
  grad.addColorStop(1,   isLight ? '#c2b9a2' : '#1a1510');
  ctx.beginPath();
  ctx.moveTo(xNutBass,xNutBass); // wrong — fix:
  ctx.beginPath();
  ctx.moveTo(xNutBass, yNutBass); ctx.lineTo(xNutTreble, yNutTreble);
  ctx.lineTo(xBridgeTreble, yBridgeTreble); ctx.lineTo(xBridgeBass, yBridgeBass);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

  ctx.strokeStyle = isLight ? 'rgba(80,60,30,0.35)' : 'rgba(100,80,50,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(xNutBass,   yNutBass);   ctx.lineTo(xBridgeBass,   yBridgeBass);   ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xNutTreble, yNutTreble); ctx.lineTo(xBridgeTreble, yBridgeTreble); ctx.stroke();

  // Strings
  for (let s = 0; s < 6; s++) {
    const t = s / 5;
    const ss = bassScale + (trebleScale - bassScale) * t;
    const sNX = xNutBass + (xNutTreble - xNutBass) * t;
    const sNY = yNutBass + (yNutTreble - yNutBass) * t;
    const sBY = (originYmm + bassNutShift + ss + (trebleNutShift - bassNutShift) * t) * pxPerMm;
    const sBX = xBridgeBass + (xBridgeTreble - xBridgeBass) * t;
    ctx.beginPath(); ctx.moveTo(sNX, sNY); ctx.lineTo(sBX, sBY);
    ctx.strokeStyle = isLight ? `rgba(80,60,20,${0.15+t*0.1})` : `rgba(220,205,170,${0.1+t*0.07})`;
    ctx.lineWidth = 0.35 + t * 0.2; ctx.stroke();
  }

  // Selected fret highlight
  const allRowsWithNut = [{ fret: 0, bassPos: 0, treblePos: 0 }, ...rows];
  if (selectedFret !== null) {
    const si = allRowsWithNut.findIndex(r => r.fret === selectedFret);
    if (si >= 0) {
      const sr = allRowsWithNut[si], pr = si > 0 ? allRowsWithNut[si-1] : null;
      const sby = sr.fret===0 ? yNutBass   : fretBassY(sr);
      const sty = sr.fret===0 ? yNutTreble : fretTrebleY(sr);
      const sbx = sr.fret===0 ? xNutBass   : edgeBassX(sby);
      const stx = sr.fret===0 ? xNutTreble : edgeTrebleX(sty);
      if (pr) {
        const pby = pr.fret===0 ? yNutBass   : fretBassY(pr);
        const pty = pr.fret===0 ? yNutTreble : fretTrebleY(pr);
        ctx.beginPath();
        ctx.moveTo(pr.fret===0?xNutBass:edgeBassX(pby), pby);
        ctx.lineTo(pr.fret===0?xNutTreble:edgeTrebleX(pty), pty);
        ctx.lineTo(stx, sty); ctx.lineTo(sbx, sby); ctx.closePath();
        ctx.fillStyle = isLight ? 'rgba(110,200,169,0.18)' : 'rgba(110,200,169,0.12)'; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(sbx, sby); ctx.lineTo(stx, sty);
      ctx.strokeStyle = accent2; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // Frets
  rows.forEach(r => {
    const by=fretBassY(r), ty=fretTrebleY(r), bx=edgeBassX(by), tx=edgeTrebleX(ty);
    const isPerp=r.fret===perpFret, isSel=r.fret===selectedFret;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty);
    ctx.strokeStyle = isSel?accent2:isPerp?accent:isLight?'rgba(80,70,50,0.3)':'rgba(185,175,155,0.28)';
    ctx.lineWidth = isSel||isPerp ? 2 : 0.85; ctx.stroke();
  });

  // Dots
  const allRows = [{ fret:0, bassPos:0, treblePos:0 }, ...rows];
  rows.forEach((r,i) => {
    if (!DOT_FRETS.has(r.fret)) return;
    const prev=allRows[i];
    const mBy=(fretBassY(prev)+fretBassY(r))/2, mTy=(fretTrebleY(prev)+fretTrebleY(r))/2;
    const dX=(edgeBassX(mBy)+edgeTrebleX(mTy))/2, dY=(mBy+mTy)/2;
    const isPerp=r.fret===perpFret;
    ctx.fillStyle = isPerp?accent:isLight?'rgba(80,70,50,0.3)':'rgba(210,190,150,0.35)';
    if (DOUBLE_DOTS.has(r.fret)) {
      [-1,1].forEach(s=>{ctx.beginPath();ctx.arc(dX+s*9,dY,3,0,Math.PI*2);ctx.fill();});
    } else { ctx.beginPath();ctx.arc(dX,dY,3,0,Math.PI*2);ctx.fill(); }
  });

  // Nut
  ctx.beginPath(); ctx.moveTo(xNutBass,yNutBass); ctx.lineTo(xNutTreble,yNutTreble);
  ctx.strokeStyle=accent; ctx.lineWidth=4; ctx.lineCap='round'; ctx.stroke(); ctx.lineCap='butt';

  // Bridge
  ctx.beginPath(); ctx.moveTo(xBridgeBass,yBridgeBass); ctx.lineTo(xBridgeTreble,yBridgeTreble);
  ctx.strokeStyle=accent2; ctx.lineWidth=2.5; ctx.stroke();
  ctx.fillStyle=accent2;
  [[xBridgeBass,yBridgeBass],[xBridgeTreble,yBridgeTreble]].forEach(([x,y])=>{
    ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();
  });

  // Text labels
  ctx.font='bold 8px JetBrains Mono,monospace'; ctx.textAlign='right';
  ctx.fillStyle=perpFret===0?accent:isLight?'rgba(80,70,50,0.6)':'rgba(210,185,120,0.7)';
  ctx.fillText(perpFret===0?'0 ⊥':'0', xNutBass-6, yNutBass+3);

  rows.forEach(r => {
    const isPerp=r.fret===perpFret, isSel=r.fret===selectedFret;
    const by=fretBassY(r), bx=edgeBassX(by);
    ctx.font=(isPerp||isSel)?'bold 8px JetBrains Mono,monospace':'8px JetBrains Mono,monospace';
    ctx.textAlign='right';
    ctx.fillStyle=isSel?accent2:isPerp?accent:isLight?'rgba(60,50,30,0.5)':'rgba(180,170,150,0.55)';
    ctx.fillText(isPerp?`${r.fret} ⊥`:`${r.fret}`, bx-6, by+3);
  });

  ctx.font='bold 9px JetBrains Mono,monospace'; ctx.textAlign='center';
  ctx.fillStyle=isLight?'rgba(80,60,20,0.6)':'rgba(210,185,120,0.6)';
  ctx.fillText('NUT',(xNutBass+xNutTreble)/2,(yNutBass+yNutTreble)/2-10);
  ctx.fillStyle=accent2;
  ctx.fillText('BRIDGE',(xBridgeBass+xBridgeTreble)/2,(yBridgeBass+yBridgeTreble)/2+16);

  ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='center';
  ctx.fillStyle=isLight?'rgba(60,100,160,0.7)':'rgba(184,212,240,0.6)';
  ctx.fillText(`${bassScale}mm`,xBridgeBass,yBridgeBass+18);
  ctx.fillStyle=isLight?'rgba(30,120,90,0.7)':'rgba(110,200,169,0.6)';
  ctx.fillText(`${trebleScale}mm`,xBridgeTreble,yBridgeTreble+18);

  const midH = (Math.min(yNutBass,yNutTreble) + Math.max(yBridgeBass,yBridgeTreble)) / 2;
  ctx.font='8px JetBrains Mono,monospace';
  ctx.fillStyle=isLight?'rgba(60,100,160,0.35)':'rgba(184,212,240,0.35)';
  ctx.save(); ctx.translate(8,midH); ctx.rotate(-Math.PI/2); ctx.textAlign='center'; ctx.fillText('BASS',0,0); ctx.restore();
  ctx.fillStyle=isLight?'rgba(30,120,90,0.35)':'rgba(110,200,169,0.35)';
  ctx.save(); ctx.translate(W-8,midH); ctx.rotate(Math.PI/2); ctx.textAlign='center'; ctx.fillText('TREBLE',0,0); ctx.restore();
}

// ── PDF export ────────────────────────────────────────────────────────────────
function exportPDF() {
  const { bassScale, trebleScale, numFrets, perpFret } = getParams();
  const rows = calcFrets(bassScale, trebleScale, numFrets);
  const { jsPDF } = window.jspdf;

  const marginL=20, marginR=20, marginT=18, marginB=15;
  const pageW = marginL + BRIDGE_WIDTH_MM + marginR;

  // scale=1: buildGeometry returns mm coordinates directly for PDF
  const geo = buildGeometry(bassScale, trebleScale, perpFret, 1, marginL, marginT);
  const { xNutBass, xNutTreble, xBridgeBass, xBridgeTreble,
          yNutBass, yNutTreble, yBridgeBass, yBridgeTreble,
          edgeBassX, edgeTrebleX, fretBassY, fretTrebleY } = geo;

  const pageH = Math.max(yBridgeBass, yBridgeTreble) + marginB + 12;
  const doc = new jsPDF({ unit:'mm', format:[pageW,pageH], orientation:'portrait' });

  doc.setFillColor(245,241,232); doc.rect(0,0,pageW,pageH,'F');

  // Neck
  doc.setFillColor(205,190,160); doc.setDrawColor(140,115,70); doc.setLineWidth(0.25);
  doc.lines([
    [xNutTreble-xNutBass,       yNutTreble-yNutBass],
    [xBridgeTreble-xNutTreble,  yBridgeTreble-yNutTreble],
    [xBridgeBass-xBridgeTreble, yBridgeBass-yBridgeTreble],
    [xNutBass-xBridgeBass,      yNutBass-yBridgeBass],
  ], xNutBass, yNutBass, [1,1], 'FD', true);

  // Nut
  doc.setDrawColor(160,120,50); doc.setLineWidth(0.8);
  doc.line(xNutBass,yNutBass,xNutTreble,yNutTreble);

  // Frets + dots
  const allRows = [{fret:0,bassPos:0,treblePos:0},...rows];
  rows.forEach(r => {
    const by=fretBassY(r), ty=fretTrebleY(r), bx=edgeBassX(by), tx=edgeTrebleX(ty);
    const isPerp=r.fret===perpFret;
    doc.setDrawColor(isPerp?160:110, isPerp?120:100, isPerp?50:80);
    doc.setLineWidth(isPerp?0.45:0.18);
    doc.line(bx,by,tx,ty);
    doc.setFontSize(4.5); doc.setTextColor(90,80,60);
    doc.text(isPerp?`${r.fret}\u22a5`:`${r.fret}`, bx-1.5, by+0.4, {align:'right'});
  });

  rows.forEach((r,i) => {
    if (!DOT_FRETS.has(r.fret)) return;
    const prev=allRows[i];
    const mBy=(fretBassY(prev)+fretBassY(r))/2, mTy=(fretTrebleY(prev)+fretTrebleY(r))/2;
    const dX=(edgeBassX(mBy)+edgeTrebleX(mTy))/2, dY=(mBy+mTy)/2;
    const isPerp=r.fret===perpFret;
    doc.setFillColor(isPerp?160:130, isPerp?120:115, isPerp?50:85);
    if (DOUBLE_DOTS.has(r.fret)) {
      doc.circle(dX-2.2,dY,0.9,'F'); doc.circle(dX+2.2,dY,0.9,'F');
    } else { doc.circle(dX,dY,0.9,'F'); }
  });

  // Bridge
  doc.setDrawColor(46,148,112); doc.setLineWidth(0.6);
  doc.line(xBridgeBass,yBridgeBass,xBridgeTreble,yBridgeTreble);
  doc.setFillColor(46,148,112);
  doc.circle(xBridgeBass,yBridgeBass,0.9,'F');
  doc.circle(xBridgeTreble,yBridgeTreble,0.9,'F');

  // Labels
  const xC=(xNutBass+xNutTreble)/2;
  doc.setFontSize(5.5); doc.setTextColor(60,50,30);
  doc.text('NUT',xC,Math.min(yNutBass,yNutTreble)-2,{align:'center'});
  doc.setTextColor(46,148,112);
  doc.text('BRIDGE',xC,Math.max(yBridgeBass,yBridgeTreble)+5,{align:'center'});
  doc.setFontSize(5);
  doc.setTextColor(58,111,160);
  doc.text(`${bassScale}mm`,xBridgeBass,yBridgeBass+9,{align:'center'});
  doc.setTextColor(46,148,112);
  doc.text(`${trebleScale}mm`,xBridgeTreble,yBridgeTreble+9,{align:'center'});

  if (perpFret>0) {
    const pr=rows.find(r=>r.fret===perpFret);
    if (pr) { doc.setFontSize(4.5); doc.setTextColor(160,120,50);
      doc.text(`\u22a5 fret ${perpFret}`,xBridgeTreble+2,fretBassY(pr)+0.4); }
  }

  doc.setFontSize(7.5); doc.setTextColor(160,120,50);
  doc.text(`Fan Fret \u2014 Bass ${bassScale}mm / Treble ${trebleScale}mm / Perp fret ${perpFret}`,pageW/2,8,{align:'center'});

  doc.save(`fretboard-bass${bassScale}-treble${trebleScale}.pdf`);
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV() {
  const { bassScale, trebleScale, numFrets } = getParams();
  const rows = calcFrets(bassScale, trebleScale, numFrets);
  let csv = 'Fret,Bass Side (mm),Treble Side (mm),Bass Spacing (mm),Treble Spacing (mm)\r\n';
  rows.forEach(r => { csv += [r.fret,r.bassPos,r.treblePos,r.bassSpacing,r.trebleSpacing].join(',')+'\r\n'; });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `fret-positions-bass${bassScale}-treble${trebleScale}.csv`;
  a.click();
}

// ── Unit / theme ──────────────────────────────────────────────────────────────
let currentUnit = 'mm';

function toggleTheme() { document.body.classList.toggle('light'); redrawNeck(); }

function setUnit(unit) {
  if (unit===currentUnit) return;
  const bi=document.getElementById('bassScale'), ti=document.getElementById('trebleScale');
  const bv=parseFloat(bi.value)||0, tv=parseFloat(ti.value)||0;
  if (unit==='in') {
    bi.value=(bv/25.4).toFixed(4); ti.value=(tv/25.4).toFixed(4);
    bi.step=ti.step='0.001'; bi.min=ti.min='10'; bi.max=ti.max='50';
  } else {
    bi.value=(bv*25.4).toFixed(1); ti.value=(tv*25.4).toFixed(1);
    bi.step=ti.step='0.5'; bi.min=ti.min='100'; bi.max=ti.max='1200';
  }
  currentUnit=unit;
  document.getElementById('btnMm').classList.toggle('active',unit==='mm');
  document.getElementById('btnIn').classList.toggle('active',unit==='in');
  render();
}

function getScalesMm() {
  const br=parseFloat(document.getElementById('bassScale').value)||(currentUnit==='mm'?648:25.512);
  const tr=parseFloat(document.getElementById('trebleScale').value)||(currentUnit==='mm'?628:24.724);
  return currentUnit==='in'?{bass:br*25.4,treble:tr*25.4}:{bass:br,treble:tr};
}

function updateConvertHints() {
  const br=parseFloat(document.getElementById('bassScale').value)||0;
  const tr=parseFloat(document.getElementById('trebleScale').value)||0;
  if (currentUnit==='mm') {
    document.getElementById('bassConvert').textContent=`\u2248 ${(br/25.4).toFixed(3)}\u2033`;
    document.getElementById('trebleConvert').textContent=`\u2248 ${(tr/25.4).toFixed(3)}\u2033`;
  } else {
    document.getElementById('bassConvert').textContent=`\u2248 ${(br*25.4).toFixed(1)} mm`;
    document.getElementById('trebleConvert').textContent=`\u2248 ${(tr*25.4).toFixed(1)} mm`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
['bassScale','trebleScale','numFrets','perpFret'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
});
window.addEventListener('resize', redrawNeck);
render();
