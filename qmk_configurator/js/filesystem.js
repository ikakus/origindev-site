// ═══════════════════════════════════════════════════
// FOLDER PERSISTENCE  (IndexedDB)
// ═══════════════════════════════════════════════════
const _IDB = { name: 'qmk-editor', store: 'handles', version: 1 };

function _idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(_IDB.name, _IDB.version);
    req.onupgradeneeded = e => e.target.result.createObjectStore(_IDB.store);
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function _saveHandle(handle) {
  try {
    const db = await _idbOpen();
    const tx = db.transaction(_IDB.store, 'readwrite');
    tx.objectStore(_IDB.store).put(handle, 'lastFolder');
  } catch(e) { /* non-critical */ }
}

async function _loadHandle() {
  try {
    const db = await _idbOpen();
    return await new Promise((res, rej) => {
      const req = db.transaction(_IDB.store, 'readonly').objectStore(_IDB.store).get('lastFolder');
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => res(null);
    });
  } catch(e) { return null; }
}

let _savedHandle = null; // cached after IDB load — used by openFolder synchronously

async function initFolderRestore() {
  // Show last folder name instantly from localStorage while IDB loads
  const savedName = localStorage.getItem('lastFolderName');
  if (savedName) document.getElementById('folderBadge').textContent = savedName;

  const handle = await _loadHandle();
  if (!handle) return;

  _savedHandle = handle; // cache for openFolder to use without awaiting IDB again

  // Already have permission — restore silently
  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') {
    dirHandle = handle;
    localStorage.setItem('lastFolderName', handle.name);
    document.getElementById('folderBadge').textContent = handle.name;
    await scanFolder();
  }
  // Permission expired — openFolder will call requestPermission on next user click
}

// ═══════════════════════════════════════════════════
// FILE SYSTEM
// ═══════════════════════════════════════════════════
async function openFolder() {
  if (!('showDirectoryPicker' in window)) {
    toast('File System Access API not supported. Use Chrome or Edge.', 'error');
    return;
  }
  try {
    const opts = { mode: 'readwrite' };
    if (_savedHandle) opts.startIn = _savedHandle;
    dirHandle = await window.showDirectoryPicker(opts);
    document.getElementById('folderBadge').textContent = dirHandle.name;
    localStorage.setItem('lastFolderName', dirHandle.name);
    _savedHandle = dirHandle;
    await _saveHandle(dirHandle);
    await scanFolder();
  } catch(e) {
    if (e.name !== 'AbortError') toast('Could not open folder: ' + e.message, 'error');
  }
}

['openFolderBtn', 'openFolderBtn2'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', openFolder);
});


// Root-level config files
const ROOT_FILES = [
  { name: 'config.h',  desc: 'Hardware & feature defines' },
  { name: 'rules.mk',  desc: 'Build rules & feature flags' },
  { name: 'info.json', desc: 'Layout & keyboard metadata'  },
];

// Resolved keymap handle + path info
let keymapHandle = null;      // FileSystemFileHandle for keymap.c
let keymapDirHandle = null;   // FileSystemDirectoryHandle for the folder containing keymap.c
let keymapPath = '';          // Display path e.g. "keymaps/default/keymap.c"

async function scanFolder() {
  fileHandles = {};
  keymapHandle = null;
  keymapDirHandle = null;
  keymapPath = '';

  const statusList = document.getElementById('fileStatusList');
  statusList.innerHTML = '';

  // ── Folder path header ──
  const pathHeader = document.createElement('div');
  pathHeader.style.cssText = 'font-family:var(--font-mono);font-size:11px;color:var(--accent);margin-bottom:12px;padding:6px 10px;background:var(--surface2);border-radius:var(--radius);border:1px solid var(--border);word-break:break-all;';
  pathHeader.textContent = `📁 ${dirHandle.name}/`;
  statusList.appendChild(pathHeader);

  // ── Scan root files ──
  for (const f of ROOT_FILES) {
    let found = false;
    try {
      fileHandles[f.name] = await dirHandle.getFileHandle(f.name, { create: false });
      found = true;
    } catch(e) { /* not found */ }

    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-dot ${found ? 'ok' : 'missing'}"></div>
      <div class="file-name">${f.name}</div>
      <div class="file-path">${dirHandle.name}/${f.name}${found ? '' : ' — will be created'}</div>
    `;
    statusList.appendChild(item);
  }

  // ── Find keymap.c ──
  // Search order:
  //   1. keymaps/<any_folder>/keymap.c  (list all, prefer "default")
  //   2. keymap.c at root (fallback)
  const keymapResult = await findKeymapFile();
  const keymapItem = document.createElement('div');
  keymapItem.className = 'file-item';
  if (keymapResult.found) {
    keymapItem.innerHTML = `
      <div class="file-dot ok"></div>
      <div class="file-name">keymap.c</div>
      <div class="file-path">${dirHandle.name}/${keymapResult.path}</div>
    `;
    if (keymapResult.availableKeymaps && keymapResult.availableKeymaps.length > 1) {
      // Show a selector for multiple keymaps
      const sel = document.createElement('select');
      sel.style.cssText = 'margin-left:auto;font-size:10px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:2px 6px;';
      keymapResult.availableKeymaps.forEach(km => {
        const opt = document.createElement('option');
        opt.value = km.name;
        opt.textContent = km.name;
        if (km.name === keymapResult.selectedName) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', async () => {
        const chosen = keymapResult.availableKeymaps.find(k => k.name === sel.value);
        if (chosen) {
          keymapHandle = chosen.handle;
          keymapDirHandle = chosen.dirHandle;
          keymapPath = `keymaps/${chosen.name}/keymap.c`;
        }
      });
      keymapItem.appendChild(sel);
    }
  } else {
    keymapItem.innerHTML = `
      <div class="file-dot missing"></div>
      <div class="file-name">keymap.c</div>
      <div class="file-path">${dirHandle.name}/keymaps/default/keymap.c — will be created</div>
    `;
  }
  statusList.appendChild(keymapItem);

  document.getElementById('welcomeScreen').style.display = 'none';
  document.getElementById('fileStatusScreen').style.display = 'block';
  document.getElementById('saveAllBtn').disabled = false;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-panel="home"]').classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-home').classList.add('active');
}

async function findKeymapFile() {
  const result = { found: false, path: '', selectedName: '', availableKeymaps: [] };

  // Try keymaps/ subdirectory first
  try {
    const keymapsDirHandle = await dirHandle.getDirectoryHandle('keymaps', { create: false });

    // List all subdirs inside keymaps/
    for await (const [name, handle] of keymapsDirHandle) {
      if (handle.kind === 'directory') {
        try {
          const kmHandle = await handle.getFileHandle('keymap.c', { create: false });
          result.availableKeymaps.push({ name, handle: kmHandle, dirHandle: handle });
        } catch(e) { /* no keymap.c in this subdir */ }
      }
    }

    if (result.availableKeymaps.length > 0) {
      // Prefer "default", else first found
      const preferred = result.availableKeymaps.find(k => k.name === 'default') || result.availableKeymaps[0];
      keymapHandle    = preferred.handle;
      keymapDirHandle = preferred.dirHandle;
      keymapPath      = `keymaps/${preferred.name}/keymap.c`;
      result.found        = true;
      result.path         = keymapPath;
      result.selectedName = preferred.name;
      return result;
    }
  } catch(e) { /* no keymaps/ dir */ }

  // Fallback: keymap.c at root
  try {
    keymapHandle    = await dirHandle.getFileHandle('keymap.c', { create: false });
    keymapDirHandle = dirHandle;
    keymapPath      = 'keymap.c';
    result.found    = true;
    result.path     = 'keymap.c (root)';
    return result;
  } catch(e) { /* not found anywhere */ }

  return result;
}

async function loadAllFiles() {
  // 1. info.json — source of truth: layout, matrix, config
  try {
    if (fileHandles['info.json']) {
      parseInfoJson(await (await fileHandles['info.json'].getFile()).text());
    }
  } catch(e) { console.warn('Error loading info.json', e); }

  // 2. Populate layoutKeys immediately — keymap.c parse depends on it
  getLayoutFromRaw();

  // 3. config.h — fills gaps not already set by info.json
  try {
    if (fileHandles['config.h']) {
      parseConfigH(await (await fileHandles['config.h'].getFile()).text());
    }
  } catch(e) { console.warn('Error loading config.h', e); }

  // 4. rules.mk — feature flags
  try {
    if (fileHandles['rules.mk']) {
      parseRulesMk(await (await fileHandles['rules.mk'].getFile()).text());
    }
  } catch(e) { console.warn('Error loading rules.mk', e); }

  // 5. keymap.c — keycodes mapped onto layout (single pass, layoutKeys ready)
  try {
    if (keymapHandle) {
      parseKeymapC(await (await keymapHandle.getFile()).text());
    }
  } catch(e) { console.warn('Error loading keymap.c', e); }

  document.body.classList.remove('app--unloaded');
  document.querySelectorAll('select option[data-placeholder]').forEach(o => o.remove());
  toast(`Files loaded${keymapPath ? ' — keymap: ' + keymapPath : ''}`, 'success');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-panel="keymap"]').classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-keymap').classList.add('active');
  initKeymap();
  renderLayoutCanvas();
  updateLayoutJsonPreview();
}

// ═══════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════
document.getElementById('saveAllBtn').addEventListener('click', saveAll);

async function saveAll() {
  if (!dirHandle) { toast('No folder open', 'error'); return; }

  // Root-level files
  const rootFiles = {
    'config.h':  genConfigH(),
    'rules.mk':  genRulesMk(),
    'info.json': genInfoJson(),
  };

  let saved = 0;
  for (const [name, fileContent] of Object.entries(rootFiles)) {
    try {
      const fh = await dirHandle.getFileHandle(name, { create: true });
      const w  = await fh.createWritable();
      await w.write(fileContent);
      await w.close();
      saved++;
    } catch(e) {
      toast(`Failed to save ${name}: ${e.message}`, 'error');
    }
  }

  // keymap.c — write to existing location, or create keymaps/default/keymap.c
  try {
    let targetDirHandle = keymapDirHandle;
    let targetPath = keymapPath || 'keymaps/default/keymap.c';

    if (!targetDirHandle) {
      // Create keymaps/default/ if needed
      const keymapsDir  = await dirHandle.getDirectoryHandle('keymaps',  { create: true });
      const defaultDir  = await keymapsDir.getDirectoryHandle('default', { create: true });
      targetDirHandle   = defaultDir;
      keymapDirHandle   = defaultDir;
      keymapPath        = 'keymaps/default/keymap.c';
      targetPath        = keymapPath;
    }

    const fh = await targetDirHandle.getFileHandle('keymap.c', { create: true });
    const w  = await fh.createWritable();
    await w.write(genKeymapC());
    await w.close();
    saved++;

    toast(`Saved ${saved} files — keymap → ${targetPath}`, 'success');
  } catch(e) {
    toast(`Failed to save keymap.c: ${e.message}`, 'error');
  }
}
