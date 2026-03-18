// ═══════════════════════════════════════════════════
// TRACKBALL ORIENTATION DIAL
// ═══════════════════════════════════════════════════
(function initOrientDial() {
  const dial = document.getElementById('orientDial');
  const arrow = document.getElementById('orientArrow');
  const input = document.getElementById('tbRotation');
  const svgEl = document.getElementById('orientSvg');
  const ticksEl = document.getElementById('ticks');

  // Draw tick marks
  for (let i = 0; i < 36; i++) {
    const angle = i * 10;
    const rad = (angle - 90) * Math.PI / 180;
    const isMajor = i % 9 === 0;
    const r1 = isMajor ? 54 : 56;
    const r2 = 60;
    const x1 = 70 + r1 * Math.cos(rad);
    const y1 = 70 + r1 * Math.sin(rad);
    const x2 = 70 + r2 * Math.cos(rad);
    const y2 = 70 + r2 * Math.sin(rad);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', isMajor ? 'var(--border2)' : 'var(--border)');
    line.setAttribute('stroke-width', isMajor ? '1.5' : '0.8');
    ticksEl.appendChild(line);
  }

  let dragging = false;

  function angleFromEvent(e) {
    const rect = svgEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let angle = Math.atan2(clientX - cx, -(clientY - cy)) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return Math.round(angle);
  }

  dial.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
  dial.addEventListener('touchstart', (e) => { dragging = true; }, { passive: true });
  window.addEventListener('mousemove', (e) => { if (dragging) setOrientAngle(angleFromEvent(e)); });
  window.addEventListener('touchmove', (e) => { if (dragging) setOrientAngle(angleFromEvent(e)); }, { passive: true });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('touchend', () => { dragging = false; });

  // Preset buttons
  document.querySelectorAll('.orient-preset').forEach(btn => {
    btn.addEventListener('click', () => setOrientAngle(parseInt(btn.dataset.angle)));
  });
})();

function setOrientAngle(angle) {
  angle = ((angle % 360) + 360) % 360;
  const arrow = document.getElementById('orientArrow');
  const input = document.getElementById('tbRotation');
  if (arrow) arrow.setAttribute('transform', `rotate(${angle},70,70)`);
  if (input) input.value = angle;
}
