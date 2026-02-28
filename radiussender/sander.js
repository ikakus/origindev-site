// ===== SCENE =====
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070e);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 8000);
camera.position.set(200, 100, 260);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x334466, 0.9));
const dl1 = new THREE.DirectionalLight(0xffffff, 1.0); dl1.position.set(1, 2, 1.5); scene.add(dl1);
const dl2 = new THREE.DirectionalLight(0x4466ff, 0.3); dl2.position.set(-2, -1, -1); scene.add(dl2);
const dl3 = new THREE.DirectionalLight(0xf0a500, 0.15); dl3.position.set(0, -1, 0.5); scene.add(dl3);

const grid = new THREE.GridHelper(600, 30, 0x181828, 0x111120);
scene.add(grid);

const mat = new THREE.MeshPhongMaterial({ color: 0xc07828, specular: 0x331100, shininess: 30, side: THREE.DoubleSide });
const wireMat = new THREE.MeshBasicMaterial({ color: 0xf0a500, wireframe: true, opacity: 0.18, transparent: true });

let solidMesh = null, wireMesh = null;

// ===== GEOMETRY =====
// THREE.Shape profile → THREE.ExtrudeGeometry (CAD-style solid extrude).
// Shape drawn in X-Y plane: x = Z_world, y = Y_world.
// ExtrudeGeometry extrudes along +Z_shape → rotated to align with X_world.

function buildSanderGeo(R, L, W, H, arcSegs, filletR, filletSegs) {
  const halfW = W / 2;
  const Rc         = Math.max(R, halfW + 0.1);
  const halfAngle  = Math.asin(halfW / Rc);
  const sagitta    = Rc - Rc * Math.cos(halfAngle);
  const arcCenterY = -Rc * Math.cos(halfAngle);
  const arcEdgeY   = arcCenterY + Rc * Math.cos(halfAngle); // = sagitta
  const fr = Math.max(0, Math.min(filletR, halfW - 0.1, (H - sagitta) * 0.49));

  const shape = new THREE.Shape();

  // Start: bottom-left where arc meets left wall
  shape.moveTo(-halfW, arcEdgeY);

  // Left wall up → left fillet → top face → right fillet → right wall down
  if (fr > 0) {
    shape.lineTo(-halfW, H - fr);
    shape.absarc(-halfW + fr, H - fr, fr, Math.PI, Math.PI / 2, true);
  } else {
    shape.lineTo(-halfW, H);
  }

  shape.lineTo(fr > 0 ? halfW - fr : halfW, H);

  if (fr > 0) {
    shape.absarc(halfW - fr, H - fr, fr, Math.PI / 2, 0, true);
  }

  shape.lineTo(halfW, arcEdgeY);

  // Bottom concave arc: right → through bottom → left (clockwise in shape = through bottom)
  const arcStartAngle = Math.PI / 2 - halfAngle;
  const arcEndAngle   = Math.PI / 2 + halfAngle;
  shape.absarc(0, arcCenterY, Rc, arcStartAngle, arcEndAngle, false);

  // Extrude along Z_shape
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: L,
    bevelEnabled: false,
    curveSegments: arcSegs,
  });

  // Rotate to align extrude axis with world X
  geo.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  geo.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1));

  // Center on all axes
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-cx, -cy, -cz));

  geo.computeVertexNormals();
  return { geo, sagitta, Rc };
}

// ===== ARC DIAGRAM =====
function drawDiagram(R, W, sagitta) {
  const cvs = document.getElementById('arcDiagram');
  const ctx = cvs.getContext('2d');
  const cw = cvs.width, ch = cvs.height;
  ctx.clearRect(0, 0, cw, ch);

  const pad = 12;
  const scaleX = (cw - pad * 2) / W;
  const scaleY = Math.min(scaleX, (ch - pad * 2) / Math.max(sagitta * 2, 10));
  const cx = cw / 2;
  const arcY = ch - pad - sagitta * scaleY;
  const halfW = W / 2;
  const halfAngle = Math.asin(Math.min(halfW / R, 0.9999));
  const arcCenterY_canvas = arcY + R * Math.cos(halfAngle) * scaleY;

  ctx.strokeStyle = '#f0a500'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const angle = halfAngle - (2 * halfAngle * i / 60);
    const px = cx + R * Math.sin(angle) * scaleX;
    const py = arcCenterY_canvas - R * Math.cos(angle) * scaleY;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();

  ctx.strokeStyle = '#30d080'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, arcY); ctx.lineTo(cx, arcY + sagitta * scaleY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#30d080'; ctx.font = '9px Courier New';
  ctx.fillText(`↕ ${sagitta.toFixed(2)}mm`, cx + 3, arcY + sagitta * scaleY / 2 + 3);

  ctx.strokeStyle = '#454870'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - halfW * scaleX, arcY - 8);
  ctx.lineTo(cx + halfW * scaleX, arcY - 8);
  ctx.stroke();
  ctx.fillStyle = '#454870';
  ctx.fillText(`${Math.round(W)}mm`, cx - 12, arcY - 10);
}

// ===== REBUILD =====
let lastParams = {};

function inchStr(mm) {
  const map = { 184: '7.25"', 241: '9.5"', 254: '10"', 305: '12"', 356: '14"', 406: '16"', 457: '18"', 508: '20"' };
  return map[Math.round(mm)] || (mm / 25.4).toFixed(2) + '"';
}

function rebuildMesh() {
  const R       = +document.getElementById('sRadius').value;
  const L       = +document.getElementById('sLen').value;
  const W       = +document.getElementById('sWid').value;
  const H       = +document.getElementById('sHt').value;
  const arcSegs = +document.getElementById('sArcSegs').value;
  const doWire    = document.getElementById('cbWire').checked;
  const doSection = document.getElementById('cbSection').checked;

  document.getElementById('arcSegsVal').textContent = arcSegs;

  if (solidMesh) { scene.remove(solidMesh); solidMesh.geometry.dispose(); solidMesh = null; }
  if (wireMesh)  { scene.remove(wireMesh);  wireMesh.geometry.dispose();  wireMesh = null; }

  const { geo, sagitta, Rc } = buildSanderGeo(R, L, W, H, arcSegs, 4, 8);

  renderer.clippingPlanes = doSection
    ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5)] : [];

  solidMesh = new THREE.Mesh(geo, mat);
  scene.add(solidMesh);

  if (doWire) {
    wireMesh = new THREE.Mesh(geo, wireMat);
    scene.add(wireMesh);
  }

  grid.position.y = -H / 2 - 1;

  const rStr = inchStr(R);
  document.getElementById('radVal').textContent = rStr;
  document.getElementById('rBig').textContent   = rStr;
  document.getElementById('rMm').textContent    = Rc.toFixed(1) + ' mm';
  document.getElementById('rSag').textContent   = 'arc depth: ' + sagitta.toFixed(3) + ' mm';
  document.getElementById('sR').textContent     = `${rStr} / ${Rc.toFixed(1)} mm`;
  document.getElementById('sD').textContent     = sagitta.toFixed(3) + ' mm';
  document.getElementById('sDims').textContent  = `${L} × ${W} × ${H} mm`;
  document.getElementById('sTri').textContent   = (geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3).toLocaleString();
  document.getElementById('lenVal').textContent = L + ' mm';
  document.getElementById('widVal').textContent = W + ' mm';
  document.getElementById('htVal').textContent  = H + ' mm';

  document.querySelectorAll('.preset-btn').forEach(b =>
    b.classList.toggle('active', Math.abs(+b.dataset.r - R) < 2));

  drawDiagram(Rc, W, sagitta);
  lastParams = { R, L, W, H, sagitta };
}

// ===== ORBIT CONTROLS =====
let dragging = false, rightDrag = false, lastMX = 0, lastMY = 0;
let theta = 0.6, phi = 0.78, orbitR = 340;
const panTarget = new THREE.Vector3(0, 0, 0);

function syncCamera() {
  camera.position.set(
    panTarget.x + orbitR * Math.sin(phi) * Math.sin(theta),
    panTarget.y + orbitR * Math.cos(phi),
    panTarget.z + orbitR * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(panTarget);
}
syncCamera();

const cvs = renderer.domElement;
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('mousedown', e => {
  dragging = true; rightDrag = e.button === 2;
  lastMX = e.clientX; lastMY = e.clientY;
});
window.addEventListener('mouseup', () => dragging = false);
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
  lastMX = e.clientX; lastMY = e.clientY;
  if (rightDrag) {
    const s = orbitR * 0.001;
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(camera.position, panTarget).normalize())
      .normalize();
    panTarget.addScaledVector(right, dx * s);
    panTarget.y -= dy * s;
  } else {
    theta -= dx * 0.006;
    phi = Math.max(0.05, Math.min(Math.PI - 0.05, phi + dy * 0.006));
  }
  syncCamera();
});
cvs.addEventListener('wheel', e => {
  orbitR = Math.max(40, Math.min(1200, orbitR + e.deltaY * 0.4));
  syncCamera(); e.preventDefault();
}, { passive: false });

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

(function loop() { requestAnimationFrame(loop); renderer.render(scene, camera); })();

// ===== UI BINDINGS =====
document.getElementById('sRadius').addEventListener('input', rebuildMesh);
document.getElementById('sLen').addEventListener('input', rebuildMesh);
document.getElementById('sWid').addEventListener('input', rebuildMesh);
document.getElementById('sHt').addEventListener('input', rebuildMesh);
document.getElementById('sArcSegs').addEventListener('input', rebuildMesh);
document.getElementById('cbWire').addEventListener('change', rebuildMesh);
document.getElementById('cbSection').addEventListener('change', rebuildMesh);
document.getElementById('cbGrid').addEventListener('change', e => grid.visible = e.target.checked);

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('sRadius').value = +btn.dataset.r;
    rebuildMesh();
  });
});

// ===== STL EXPORT =====
document.getElementById('exportSTL').addEventListener('click', () => {
  if (!solidMesh) return;
  const geo = solidMesh.geometry;
  const pos = geo.getAttribute('position');
  const idx = geo.index;
  const triCount = idx ? idx.count / 3 : pos.count / 3;

  const buf = new ArrayBuffer(84 + 50 * triCount);
  const dv  = new DataView(buf);
  const hdr = 'Fret Radius Sander';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 0);
  dv.setUint32(80, triCount, true);
  let off = 84;

  for (let i = 0; i < triCount; i++) {
    const ai = idx ? idx.getX(i * 3)     : i * 3;
    const bi = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
    const ci = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
    const ax = pos.getX(ai), ay = pos.getY(ai), az = pos.getZ(ai);
    const bx = pos.getX(bi), by = pos.getY(bi), bz = pos.getZ(bi);
    const cx = pos.getX(ci), cy = pos.getY(ci), cz = pos.getZ(ci);
    const ux = bx-ax, uy = by-ay, uz = bz-az;
    const vx = cx-ax, vy = cy-ay, vz = cz-az;
    const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
    const nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
    dv.setFloat32(off, nx/nl, true); off += 4;
    dv.setFloat32(off, ny/nl, true); off += 4;
    dv.setFloat32(off, nz/nl, true); off += 4;
    for (const [x, y, z] of [[ax,ay,az],[bx,by,bz],[cx,cy,cz]]) {
      dv.setFloat32(off, x, true); off += 4;
      dv.setFloat32(off, y, true); off += 4;
      dv.setFloat32(off, z, true); off += 4;
    }
    dv.setUint16(off, 0, true); off += 2;
  }

  const p = lastParams;
  const rLabel = inchStr(p.R).replace('"', 'in').replace('.', '_');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }));
  a.download = `radius_sander_R${rLabel}_${p.L}x${p.W}x${p.H}mm.stl`;
  a.click();
});

// ===== OBJ EXPORT =====
document.getElementById('exportOBJ').addEventListener('click', () => {
  if (!solidMesh) return;
  const geo  = solidMesh.geometry;
  const pos  = geo.getAttribute('position');
  const norm = geo.getAttribute('normal');
  const idx  = geo.index;
  let obj = '# Fret Radius Sander\n';
  for (let i = 0; i < pos.count; i++)
    obj += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
  for (let i = 0; i < norm.count; i++)
    obj += `vn ${norm.getX(i).toFixed(4)} ${norm.getY(i).toFixed(4)} ${norm.getZ(i).toFixed(4)}\n`;
  const tc = idx ? idx.count / 3 : pos.count / 3;
  for (let i = 0; i < tc; i++) {
    const a = (idx ? idx.getX(i*3)   : i*3)   + 1;
    const b = (idx ? idx.getX(i*3+1) : i*3+1) + 1;
    const c = (idx ? idx.getX(i*3+2) : i*3+2) + 1;
    obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
  }
  const el = document.createElement('a');
  el.href = URL.createObjectURL(new Blob([obj], { type: 'text/plain' }));
  el.download = 'radius_sander.obj';
  el.click();
});

rebuildMesh();
