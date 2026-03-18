// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let dirHandle = null;
let fileHandles = {};
let _rawInfoJson = {};  // Preserves keys we don't edit (layouts, community_layouts, etc.)
let currentPanel = 'home';
let selectedKey = null;
let currentLayer = 0;
let currentPreview = 'config';

let LAYER_NAMES = ['LAYER_0', 'LAYER_1', 'LAYER_2'];
let keymapData = []; // [layer][row][col] = keycode string
