// ═══════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════
function showPreview(type) {
  currentPreview = type;
  const body = document.getElementById('previewBody');
  const title = document.getElementById('previewTitle');
  let content = '';
  if (type === 'config') { title.textContent = 'config.h'; content = genConfigH(); }
  else if (type === 'rules') { title.textContent = 'rules.mk'; content = genRulesMk(); }
  else if (type === 'info') { title.textContent = 'info.json'; content = genInfoJson(); }
  else if (type === 'keymap') { title.textContent = 'keymap.c'; content = genKeymapC(); }
  body.innerHTML = syntaxHighlight(content);
}

function syntaxHighlight(code) {
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/(\/\/[^\n]*)/g, '<span class="cmt">$1</span>')
    .replace(/(#define|#pragma|#include|#ifdef|#endif|#if|#else)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(yes|no|true|false)\b/g, '<span class="val">$1</span>')
    .replace(/\b(0x[0-9A-Fa-f]+|\d+)\b/g, '<span class="num">$1</span>');
}

function copyPreview() {
  const text = document.getElementById('previewBody').textContent;
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'success'));
}

// ═══════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════
function toast(msg, type = 'success') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? 'ok' : 'err'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
