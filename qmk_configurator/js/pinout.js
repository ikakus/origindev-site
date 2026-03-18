// ═══════════════════════════════════════════════════
// RP2040 PINOUT VISUALISER
// ═══════════════════════════════════════════════════

// Physical pin layout for Generic RP2040 (Pi Pico style)
// Each entry: { gpio, name, left: bool (left side of chip), physPos: 1-40 }
// Left side: pins 1-20 top-to-bottom, Right side: pins 21-40 bottom-to-top
// Pi Pico exact 40-pin header pinout
// Left col = pins 1–20 top→bottom, Right col = pins 21–40 top→bottom
// Physical pin numbering matches the actual Pico silkscreen
const RP2040_PINOUT = [
  // Left column (VBUS/power side), pins 40–21 (top → bottom)
  { phys:1,  gpio:0,    name:'GP0',    left:false  },
  { phys:2,  gpio:1,    name:'GP1',    left:false  },
  { phys:3,  gpio:null, name:'GND',    left:false,  special:'gnd'   },
  { phys:4,  gpio:2,    name:'GP2',    left:false  },
  { phys:5,  gpio:3,    name:'GP3',    left:false  },
  { phys:6,  gpio:4,    name:'GP4',    left:false  },
  { phys:7,  gpio:5,    name:'GP5',    left:false  },
  { phys:8,  gpio:null, name:'GND',    left:false,  special:'gnd'   },
  { phys:9,  gpio:6,    name:'GP6',    left:false  },
  { phys:10, gpio:7,    name:'GP7',    left:false  },
  { phys:11, gpio:8,    name:'GP8',    left:false  },
  { phys:12, gpio:9,    name:'GP9',    left:false  },
  { phys:13, gpio:null, name:'GND',    left:false,  special:'gnd'   },
  { phys:14, gpio:10,   name:'GP10',   left:false  },
  { phys:15, gpio:11,   name:'GP11',   left:false  },
  { phys:16, gpio:12,   name:'GP12',   left:false  },
  { phys:17, gpio:13,   name:'GP13',   left:false  },
  { phys:18, gpio:null, name:'GND',    left:false,  special:'gnd'   },
  { phys:19, gpio:14,   name:'GP14',   left:false  },
  { phys:20, gpio:15,   name:'GP15',   left:false  },

  // Right column (GPIO side), pins 1–20 (top → bottom)
  { phys:40, gpio:null, name:'VBUS',   left:true, special:'power' },
  { phys:39, gpio:null, name:'VSYS',   left:true, special:'power' },
  { phys:38, gpio:null, name:'GND',    left:true, special:'gnd'   },
  { phys:37, gpio:null, name:'3V3_EN', left:true, special:'power' },
  { phys:36, gpio:null, name:'3V3',    left:true, special:'power' },
  { phys:35, gpio:null, name:'ADC_REF',left:true, special:'power' },
  { phys:34, gpio:28,   name:'GP28',   left:true },
  { phys:33, gpio:null, name:'AGND',   left:true, special:'gnd'   },
  { phys:32, gpio:27,   name:'GP27',   left:true },
  { phys:31, gpio:26,   name:'GP26',   left:true },
  { phys:30, gpio:null, name:'RUN',    left:true, special:'power' },
  { phys:29, gpio:22,   name:'GP22',   left:true },
  { phys:28, gpio:null, name:'GND',    left:true, special:'gnd'   },
  { phys:27, gpio:21,   name:'GP21',   left:true },
  { phys:26, gpio:20,   name:'GP20',   left:true },
  { phys:25, gpio:19,   name:'GP19',   left:true },
  { phys:24, gpio:18,   name:'GP18',   left:true },
  { phys:23, gpio:null, name:'GND',    left:true, special:'gnd'   },
  { phys:22, gpio:17,   name:'GP17',   left:true },
  { phys:21, gpio:16,   name:'GP16',   left:true },
];

// Bottom pads (not on header) — RP2040 internal: GP23, GP24, GP25 (Pico LED/SMPS/VBUS sense), GP29 (ADC3/VSYS sense)
const RP2040_BOTTOM = [
  { gpio:23, name:'GP23', note:'SMPS mode' },
  { gpio:24, name:'GP24', note:'VBUS sense' },
  { gpio:25, name:'GP25', note:'LED' },
  { gpio:29, name:'GP29',  note:'ADC3/VSYS' },
];

const ROLE_STYLES = {
  'matrix-row': { fill:'#1a3a2a', stroke:'#5de4c7', label:'Matrix Row' },
  'matrix-col': { fill:'#1a2a3a', stroke:'#7b9ef0', label:'Matrix Col' },
  'trackball':  { fill:'#3a2a1a', stroke:'#f0a86b', label:'Trackball SPI' },
  'split':      { fill:'#2a1a3a', stroke:'#c084fc', label:'Split / TRRS' },
  'rgb':        { fill:'#3a1a2a', stroke:'#f472b6', label:'RGB' },
  'encoder':    { fill:'#1a3a3a', stroke:'#34d399', label:'Encoder' },
  'conflict':   { fill:'#3a1a1a', stroke:'#f06b6b', label:'Conflict!' },
  'free':       { fill:'#1a1e29', stroke:'#2a2f3f', label:'Free' },
  'power':      { fill:'#1e1e14', stroke:'#6b6b3a', label:'Power' },
  'gnd':        { fill:'#161a1e', stroke:'#4a5060', label:'GND' },
  'debug':      { fill:'#181822', stroke:'#4a4a6a', label:'Debug' },
  'usb':        { fill:'#161e18', stroke:'#3a5a3a', label:'USB' },
};

// RP2040 hardware peripheral capabilities per GPIO
const PIN_CAPS = {
  0:  ['SPI0','I2C0','UART0'], 1:  ['SPI0','I2C0','UART0'],
  2:  ['SPI0','I2C1'],         3:  ['SPI0','I2C1'],
  4:  ['SPI0','I2C0','UART1'], 5:  ['SPI0','I2C0','UART1'],
  6:  ['SPI0','I2C1'],         7:  ['SPI0','I2C1'],
  8:  ['SPI1','I2C0','UART1'], 9:  ['SPI1','I2C0','UART1'],
  10: ['SPI1','I2C1'],         11: ['SPI1','I2C1'],
  12: ['SPI1','I2C0','UART0'], 13: ['SPI1','I2C0','UART0'],
  14: ['SPI1','I2C1'],         15: ['SPI1','I2C1'],
  16: ['SPI0','I2C0','UART0'], 17: ['SPI0','I2C0','UART0'],
  18: ['SPI0','I2C1'],         19: ['SPI0','I2C1'],
  20: ['SPI0','I2C0','UART1'], 21: ['SPI0','I2C0','UART1'],
  22: ['SPI0','I2C1'],         23: ['SPI0','I2C1'],
  24: ['SPI1','I2C0','UART1'], 25: ['SPI1','I2C0','UART1'],
  26: ['SPI1','I2C1'],         27: ['SPI1','I2C1'],
  28: ['I2C0','UART0'],
};

// Capability badge colours
const CAP_COLOURS = {
  'SPI0':  '#7b9ef0',  // blue
  'SPI1':  '#a78bfa',  // violet
  'I2C0':  '#34d399',  // green
  'I2C1':  '#2dd4bf',  // teal
  'UART0': '#f0a86b',  // orange
  'UART1': '#fb923c',  // amber-orange
};

function getPinRole(gpioNum, usedMap) {
  if (gpioNum === null || gpioNum === undefined) return null;
  const key = `GP${gpioNum}`;
  const uses = usedMap[key];
  if (!uses || uses.length === 0) return 'free';
  if (uses.length > 1) return 'conflict';
  const src = uses[0].source.toLowerCase();
  if (src === 'matrix' && uses[0].label.startsWith('Row')) return 'matrix-row';
  if (src === 'matrix') return 'matrix-col';
  if (src === 'trackball') return 'trackball';
  if (src === 'split') return 'split';
  if (src === 'rgb') return 'rgb';
  if (src === 'encoder') return 'encoder';
  return 'free';
}

function getPinTooltip(gpioNum, usedMap) {
  const key = `GP${gpioNum}`;
  const uses = usedMap[key];
  if (!uses || uses.length === 0) return `GP${gpioNum} — free`;
  return `GP${gpioNum} — ${uses.map(u => `${u.label} (${u.source})`).join(', ')}`;
}

function renderPinout() {
  const svg = document.getElementById('rp2040Svg');
  if (!svg) return;

  const usedMap = getAllUsedPins();
  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  svg.innerHTML = '';

  const W = 760, H = 640;
  const chipX = 250, chipY = 24, chipW = 220, chipH = 480;
  const PIN_H = 24, PIN_W = 195, DOT = 9;
  const leftX = chipX - PIN_W, rightX = chipX + chipW;
  const ROWS = 20;
  const rowH = chipH / ROWS;

  // ── Chip body ──
  svg.appendChild(el('rect', {
    x: chipX, y: chipY, width: chipW, height: chipH,
    rx: 10, ry: 10,
    fill: '#0f1117', stroke: '#363d52', 'stroke-width': '1.5'
  }));

  // Chip label
  svg.appendChild(el('text', {
    x: chipX + chipW/2, y: chipY + chipH/2 - 14,
    'text-anchor':'middle', 'font-size':'15', fill:'#4a5568',
    'font-family':'Syne,sans-serif', 'font-weight':'700'
  }, 'RP2040'));
  svg.appendChild(el('text', {
    x: chipX + chipW/2, y: chipY + chipH/2 + 6,
    'text-anchor':'middle', 'font-size':'9', fill:'#2d3748',
    'font-family':'JetBrains Mono,monospace'
  }, 'Dual Cortex-M0+'));
  svg.appendChild(el('text', {
    x: chipX + chipW/2, y: chipY + chipH/2 + 20,
    'text-anchor':'middle', 'font-size':'9', fill:'#2d3748',
    'font-family':'JetBrains Mono,monospace'
  }, '264KB SRAM · 2MB Flash'));

  // USB notch
  svg.appendChild(el('rect', {
    x: chipX + chipW/2 - 20, y: chipY - 10, width: 40, height: 14,
    rx: 3, fill:'#1a2a1a', stroke:'#444', 'stroke-width':'1'
  }));
  svg.appendChild(el('text', {
    x: chipX + chipW/2, y: chipY - 1,
    'text-anchor':'middle', 'font-size':'7', fill:'#666',
    'font-family':'JetBrains Mono,monospace'
  }, 'USB'));

  // ── Draw a pin ──
  function drawPin(pin, rowIdx) {
    const isLeft = pin.left;
    const y = chipY + rowIdx * rowH + rowH/2;

    // Determine role & style
    let role, style, tooltip, conflictPin = false;
    if (pin.special) {
      role = pin.special;
      style = ROLE_STYLES[role] || ROLE_STYLES.free;
      tooltip = pin.name;
    } else {
      const uses = usedMap[`GP${pin.gpio}`] || [];
      conflictPin = uses.length > 1;
      if (conflictPin) {
        // Use the FIRST use's role for the dot colour, flag conflict for box only
        const firstSrc = uses[0].source.toLowerCase();
        const firstLbl = uses[0].label || '';
        if (firstSrc === 'matrix' && firstLbl.startsWith('Row')) role = 'matrix-row';
        else if (firstSrc === 'matrix') role = 'matrix-col';
        else if (firstSrc === 'trackball') role = 'trackball';
        else if (firstSrc === 'split') role = 'split';
        else if (firstSrc === 'rgb') role = 'rgb';
        else if (firstSrc === 'encoder') role = 'encoder';
        else role = 'free';
      } else {
        role = getPinRole(pin.gpio, usedMap);
      }
      style = ROLE_STYLES[role] || ROLE_STYLES.free;
      tooltip = getPinTooltip(pin.gpio, usedMap);
    }

    const g = el('g', { class: 'pinout-pin' });

    // Pin trace line from chip edge
    const lineX1 = isLeft ? chipX : chipX + chipW;
    const lineX2 = isLeft ? chipX - 16 : chipX + chipW + 16;
    g.appendChild(el('line', {
      x1: lineX1, y1: y, x2: lineX2, y2: y,
      stroke: style.stroke, 'stroke-width':'1.5', opacity:'0.6'
    }));

    // Pin dot — free pins are larger and lighter so the number is readable
    const dotX   = isLeft ? chipX - 16 : chipX + chipW + 16;
    const isFree    = role === 'free';
    const isSpecial = !!pin.special;  // GND, power, debug, USB — no GPIO number
    // Free GPIO pins: bigger dot, light readable number
    // Special non-pins: smaller dot (diamond shape via rotation), lighter label
    // Assigned GPIO: normal dot with role colour
    const dotR      = isFree ? DOT + 2 : isSpecial ? DOT - 2 : DOT;
    // For conflict pins: dot keeps the underlying role colour (style already = conflict style).
    // We override this below for box only. Store the actual role style separately.
    const dotFill   = isFree ? '#1e2433' : style.fill;
    const dotStroke = isFree ? '#4a5568' : style.stroke;
    const numColour = isFree ? '#94a3b8' : style.stroke;
    const isConflict = role === 'conflict';

    if (isSpecial) {
      // Small rotated square (diamond) for GND/power/debug/USB — visually distinct from GPIO dots
      const s = dotR * 0.85;
      g.appendChild(el('rect', {
        x: dotX - s, y: y - s, width: s * 2, height: s * 2,
        fill: dotFill, stroke: dotStroke, 'stroke-width':'1',
        transform: `rotate(45,${dotX},${y})`
      }));
    } else {
      // Circle for GPIO pins
      const dot = el('circle', {
        cx: dotX, cy: y, r: dotR,
        fill: dotFill, stroke: dotStroke,
        'stroke-width': role === 'conflict' ? '2' : isFree ? '1' : '1.2'
      });
      g.appendChild(dot);

      // Conflict pulse ring — shown when pin is used by multiple sources
      if (conflictPin) {
        g.appendChild(el('circle', {
          cx: dotX, cy: y, r: dotR + 3,
          fill: 'none', stroke: '#f06b6b', 'stroke-width':'1.2', opacity:'0.6'
        }));
      }

      // GPIO number inside dot — bigger and lighter for free pins
      if (pin.gpio !== null && pin.gpio !== undefined) {
        g.appendChild(el('text', {
          x: dotX, y: y + 0.5,
          'text-anchor':'middle', 'dominant-baseline':'middle',
          'font-size': isFree ? '8' : '7',
          fill: numColour,
          'font-family':'JetBrains Mono,monospace', 'font-weight':'700'
        }, `${pin.gpio}`));
      }
    }

    // Pin label box — narrower now that badges are outside
    const hasRole = role !== 'free' && role !== 'power' && role !== 'gnd' && role !== 'debug' && role !== 'usb' && pin.gpio !== null;
    const uses = hasRole ? (usedMap[`GP${pin.gpio}`] || []) : [];
    const roleText = uses.map(u => u.label).join('+').substring(0, 14);

    const boxW = 96, boxH = hasRole ? 20 : 16, boxR = 3;
    const boxX = isLeft ? chipX - 16 - dotR - 4 - boxW : chipX + chipW + 16 + dotR + 4;
    const boxY = y - boxH / 2;

    // Colour hierarchy: assigned > free > special(non-pin)
    const boxStroke  = isSpecial ? style.stroke : isFree ? '#3a4255' : style.stroke;
    const nameColour = isSpecial ? style.stroke : isFree ? '#94a3b8' : style.stroke;
    const nameFill   = isSpecial ? style.fill   : isFree ? '#161a24' : style.fill;
    const nameWeight = isSpecial ? '300'        : isFree ? '400'     : '600';
    const swOp       = isSpecial ? '0.6' : '0.96';

    const boxStrokeConflict = conflictPin ? '#f06b6b' : boxStroke;
    const boxSwConflict     = conflictPin ? '1.8'     : (isSpecial ? '0.5' : isFree ? '0.6' : '0.7');
    const boxFillConflict   = conflictPin ? '#f06b6b12' : nameFill;
    g.appendChild(el('rect', {
      x: boxX, y: boxY, width: boxW, height: boxH, rx: boxR,
      fill: boxFillConflict, stroke: boxStrokeConflict,
      'stroke-width': boxSwConflict,
      opacity: swOp
    }));

    // GPIO name — centred vertically, always anchored to the chip-side edge of the box
    const nameY = hasRole ? boxY + 6.5 : y;
    g.appendChild(el('text', {
      x: isLeft ? boxX + boxW - 5 : boxX + 5,
      y: nameY,
      'text-anchor': isLeft ? 'end' : 'start',
      'dominant-baseline': 'middle',
      'font-size': isSpecial ? '7.5' : '8',
      fill: nameColour,
      'font-family': 'JetBrains Mono,monospace',
      'font-weight': nameWeight,
      'font-style': isSpecial ? 'italic' : 'normal'
    }, pin.name));

    // Role label — lower half of box
    if (hasRole) {
      g.appendChild(el('text', {
        x: isLeft ? boxX + boxW - 5 : boxX + 5,
        y: boxY + 14,
        'text-anchor': isLeft ? 'end' : 'start',
        'dominant-baseline': 'middle',
        'font-size': '6', fill: style.stroke, opacity: '0.7',
        'font-family': 'JetBrains Mono,monospace'
      }, roleText));
    }

    // Capability badges — rendered OUTSIDE the box, on the far edge away from chip
    // Left pins: badges go further left beyond the box outer edge
    // Right pins: badges go further right beyond the box outer edge
    if (!isSpecial && pin.gpio !== null) {
      const caps = PIN_CAPS[pin.gpio] || [];
      if (caps.length) {
        const bh  = 8;   // badge height — matches label box height nicely
        const bGap = 2;  // horizontal gap between badges
        const outerEdge = isLeft ? boxX : boxX + boxW;

        // Pre-compute total width so left-side badges can be right-aligned flush to box
        const bws = caps.map(cap => cap.length * 5.2 + 6);
        const totalBW = bws.reduce((s, w) => s + w + bGap, 0) - bGap;

        // Start x: left pins start so last badge ends at outerEdge-3
        //           right pins start at outerEdge+3
        let bx = isLeft ? outerEdge - totalBW - 3 : outerEdge + 3;
        const by = y - bh / 2;  // vertically centred on pin row

        caps.forEach((cap, ci) => {
          const bw  = bws[ci];
          const col = CAP_COLOURS[cap];

          g.appendChild(el('rect', {
            x: bx, y: by, width: bw, height: bh, rx: '1.5',
            fill: col + '12',
            stroke: col + '50',
            'stroke-width': '0.5'
          }));
          g.appendChild(el('text', {
            x: bx + bw / 2, y: by + bh / 2 + 0.3,
            'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-size': '5', fill: col + '99',
            'font-family': 'JetBrains Mono,monospace', 'font-weight': '500'
          }, cap));

          bx += bw + bGap;  // advance horizontally
        });

        tooltip += `  |  ${caps.join(' · ')}`;
      }
    }

    // Tooltip
    const title = el('title', {});
    title.textContent = tooltip;
    g.appendChild(title);

    // Click any GPIO pin to open the matrix pin picker
    if (!isSpecial && pin.gpio !== null) {
      g.classList.add('clickable');
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        openPinmapPicker(`GP${pin.gpio}`, e.clientX, e.clientY);
      });
    }

    svg.appendChild(g);
  }

  // ── Split pins into left/right ──
  const leftPins  = RP2040_PINOUT.filter(p => p.left);
  // Right col: array is stored phys 40→21 (VBUS at top, GP16 at bottom) — render as-is
  const rightPins = RP2040_PINOUT.filter(p => !p.left);

  leftPins.forEach((p, i)  => drawPin(p, i));
  rightPins.forEach((p, i) => drawPin(p, i));

  // Move USB notch to bottom if VBUS is bottom — it's top here so notch stays top

  // ── Bottom pads (internal, not on 40-pin header) ──
  const bottomY = chipY + chipH + 55;
  const bCount  = RP2040_BOTTOM.length;
  // Centre the small cluster under the chip
  const bSpacing = 62;
  const bStartX  = chipX + chipW/2 - (bCount * bSpacing)/2 + bSpacing/2;

  svg.appendChild(el('text', {
    x: chipX + chipW/2, y: bottomY - 14,
    'text-anchor':'middle', 'font-size':'8', fill:'#4a5568',
    'font-family':'JetBrains Mono,monospace'
  }, 'v Internal / bottom pads (not on header)'));

  RP2040_BOTTOM.forEach((p, i) => {
    const bx = bStartX + i * bSpacing;
    const role = getPinRole(p.gpio, usedMap);
    const style = ROLE_STYLES[role] || ROLE_STYLES.free;
    const tooltip = `GP${p.gpio} — ${p.note}${role !== 'free' ? ' | ' + getPinTooltip(p.gpio, usedMap).split('—')[1] : ' (free)'}`;

    const g = el('g', { class: 'pinout-pin' });

    // Dashed line from chip bottom
    g.appendChild(el('line', {
      x1: bx, y1: chipY + chipH,
      x2: bx, y2: bottomY - DOT - 2,
      stroke: style.stroke, 'stroke-width':'1',
      'stroke-dasharray':'3,3', opacity:'0.4'
    }));

    // Dot
    g.appendChild(el('circle', {
      cx: bx, cy: bottomY, r: DOT,
      fill: style.fill, stroke: style.stroke,
      'stroke-width': role === 'conflict' ? '2' : '1'
    }));

    // GPIO number inside dot
    g.appendChild(el('text', {
      x: bx, y: bottomY + 0.5,
      'text-anchor':'middle', 'dominant-baseline':'middle',
      'font-size':'6.5', fill: style.stroke,
      'font-family':'JetBrains Mono,monospace', 'font-weight':'700'
    }, `${p.gpio}`));

    // GPIO name below dot
    g.appendChild(el('text', {
      x: bx, y: bottomY + DOT + 9,
      'text-anchor':'middle',
      'font-size':'7.5', fill: role !== 'free' ? style.stroke : '#4a5568',
      'font-family':'JetBrains Mono,monospace', 'font-weight':'600'
    }, p.name));

    // Function note below name
    g.appendChild(el('text', {
      x: bx, y: bottomY + DOT + 19,
      'text-anchor':'middle',
      'font-size':'6.5', fill:'#4a5568',
      'font-family':'JetBrains Mono,monospace'
    }, p.note));

    // Role label if assigned
    if (role !== 'free') {
      const uses = usedMap[`GP${p.gpio}`] || [];
      g.appendChild(el('text', {
        x: bx, y: bottomY + DOT + 29,
        'text-anchor':'middle',
        'font-size':'6', fill: style.stroke, opacity:'0.8',
        'font-family':'JetBrains Mono,monospace'
      }, (uses[0]?.label || '').substring(0, 10)));
    }

    const title = el('title', {});
    title.textContent = tooltip;
    g.appendChild(title);
    svg.appendChild(g);
  });

  // ── Legend ──
  const legendEl = document.getElementById('pinMapLegendFull');
  if (legendEl) {
    legendEl.innerHTML = '';

    // ── Assigned pin roles ──
    const rolesShown = ['matrix-row','matrix-col','trackball','split','rgb','encoder','conflict','free'];
    rolesShown.forEach(role => {
      const s = ROLE_STYLES[role];
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-dot" style="background:${s.fill};border-color:${s.stroke};border-radius:50%;"></span>${s.label}`;
      legendEl.appendChild(item);
    });

    // ── Divider ──
    const div1 = document.createElement('div');
    div1.style.cssText = 'width:100%;height:1px;background:var(--border);margin:6px 0 4px;';
    legendEl.appendChild(div1);

    // ── Special non-GPIO pin shapes ──
    const specials = [
      { label:'Power (VBUS/3V3/RUN)',  stroke:'#6b6b3a', fill:'#1e1e14' },
      { label:'GND / AGND',            stroke:'#4a5060', fill:'#161a1e' },
      { label:'Debug (SWD)',            stroke:'#4a4a6a', fill:'#181822' },
      { label:'USB pads',              stroke:'#3a5a3a', fill:'#161e18' },
    ];
    specials.forEach(s => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      // Diamond SVG icon to match the pinout
      item.innerHTML = `<svg width="12" height="12" style="margin-right:5px;flex-shrink:0;" viewBox="0 0 12 12">
        <rect x="2" y="2" width="8" height="8" rx="1"
          fill="${s.fill}" stroke="${s.stroke}" stroke-width="1"
          transform="rotate(45,6,6)"/>
      </svg>${s.label}`;
      legendEl.appendChild(item);
    });

    // ── Divider ──
    const div2 = document.createElement('div');
    div2.style.cssText = 'width:100%;height:1px;background:var(--border);margin:6px 0 4px;';
    legendEl.appendChild(div2);

    // ── Hardware peripheral capability badges ──
    const capLabel = document.createElement('div');
    capLabel.style.cssText = 'width:100%;font-size:10px;color:var(--text3);margin-bottom:4px;';
    capLabel.textContent = 'Hardware peripherals (shown as badges on each GPIO pin):';
    legendEl.appendChild(capLabel);

    Object.entries(CAP_COLOURS).forEach(([cap, colour]) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span style="
        display:inline-block;padding:1px 5px;border-radius:2px;margin-right:5px;
        background:${colour}22;border:0.6px solid ${colour}88;
        font-size:9px;font-family:var(--font-mono);color:${colour};font-weight:600;
      ">${cap}</span>${cap.replace('0','').replace('1','')} bus ${cap.slice(-1) === '0' ? '#0' : '#1'}`;
      legendEl.appendChild(item);
    });
  }
}

// Patch all pin inputs to re-render pinout on change
function _hookPinoutRefresh() {
  ['spiSck','spiMosi','spiMiso','spiCs','serialPin','handPin',
   'rgbPin','encAPin','encBPin','encAPin2','encBPin2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderPinout);
  });
  document.getElementById('sideDetect').addEventListener('change', renderPinout);
  document.getElementById('rgbType').addEventListener('change', renderPinout);
  // Also re-render when switching to hardware panel
  document.querySelector('[data-panel="hardware"]').addEventListener('click', () => {
    setTimeout(renderPinout, 50);
  });
}
