/* Self-contained ISO-18004 QR Code Model 2 generator (Byte mode, ECC Level M, Versions 1–10) */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NKABOM_QR = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const VERSIONS = [
    null,
    { size: 21, totalData: 16, ecPerBlock: 10, blocks: [[1, 16]], align: [] },
    { size: 25, totalData: 28, ecPerBlock: 16, blocks: [[1, 28]], align: [6, 18] },
    { size: 29, totalData: 44, ecPerBlock: 26, blocks: [[1, 44]], align: [6, 22] },
    { size: 33, totalData: 64, ecPerBlock: 18, blocks: [[2, 32]], align: [6, 26] },
    { size: 37, totalData: 86, ecPerBlock: 24, blocks: [[2, 43]], align: [6, 30] },
    { size: 41, totalData: 108, ecPerBlock: 16, blocks: [[4, 27]], align: [6, 34] },
    { size: 45, totalData: 124, ecPerBlock: 18, blocks: [[4, 31]], align: [6, 22, 38] },
    { size: 49, totalData: 154, ecPerBlock: 22, blocks: [[2, 38], [2, 39]], align: [6, 24, 42] },
    { size: 53, totalData: 182, ecPerBlock: 22, blocks: [[3, 36], [2, 37]], align: [6, 26, 46] },
    { size: 57, totalData: 216, ecPerBlock: 26, blocks: [[4, 43], [1, 44]], align: [6, 28, 50] },
  ];

  // GF(256) with primitive polynomial 0x11D
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function rsGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = EXP[i];
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const res = new Uint8Array(data.length + ecLen);
    res.set(data, 0);
    for (let i = 0; i < data.length; i += 1) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j += 1) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(String(str));
    const out = [];
    const s = String(str);
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63));
      else out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function pickVersion(byteLen) {
    for (let v = 1; v < VERSIONS.length; v += 1) {
      const ccBits = v >= 10 ? 16 : 8;
      const cap = Math.floor((VERSIONS[v].totalData * 8 - 4 - ccBits) / 8);
      if (byteLen <= cap) return v;
    }
    throw new Error('Text exceeds maximum QR capacity (213 bytes).');
  }

  function buildDataCodewords(bytes, version) {
    const spec = VERSIONS[version];
    const totalBits = spec.totalData * 8;
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
    };

    // Byte mode indicator = 0100
    pushBits(0b0100, 4);
    pushBits(bytes.length, version >= 10 ? 16 : 8);
    for (let i = 0; i < bytes.length; i += 1) pushBits(bytes[i], 8);

    // Terminator (up to 4 zero bits)
    const term = Math.min(4, totalBits - bits.length);
    for (let i = 0; i < term; i += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j];
      codewords.push(b);
    }
    const pads = [0xec, 0x11];
    let padIdx = 0;
    while (codewords.length < spec.totalData) {
      codewords.push(pads[padIdx % 2]);
      padIdx += 1;
    }
    return new Uint8Array(codewords);
  }

  function interleaveBlocks(dataBytes, version) {
    const spec = VERSIONS[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (const [count, len] of spec.blocks) {
      for (let i = 0; i < count; i += 1) {
        const block = dataBytes.slice(offset, offset + len);
        offset += len;
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, spec.ecPerBlock));
      }
    }
    const out = [];
    const maxData = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxData; i += 1) {
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    }
    for (let i = 0; i < spec.ecPerBlock; i += 1) {
      for (const b of ecBlocks) if (i < b.length) out.push(b[i]);
    }
    return new Uint8Array(out);
  }

  function bchFormatInfo(mask) {
    // ECC Level M = 00
    const data = (0b00 << 3) | mask;
    let rem = data << 10;
    const gen = 0x537;
    for (let bit = 14; bit >= 10; bit -= 1) {
      if ((rem >>> bit) & 1) rem ^= gen << (bit - 10);
    }
    return ((data << 10) | rem) ^ 0x5412;
  }

  function bchVersionInfo(version) {
    let rem = version << 12;
    const gen = 0x1f25;
    for (let bit = 17; bit >= 12; bit -= 1) {
      if ((rem >>> bit) & 1) rem ^= gen << (bit - 12);
    }
    return (version << 12) | rem;
  }

  function createGrid(version) {
    const spec = VERSIONS[version];
    const size = spec.size;
    const modules = Array.from({ length: size }, () => new Uint8Array(size));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));

    const setFn = (r, c, val) => {
      modules[r][c] = val ? 1 : 0;
      isFunc[r][c] = 1;
    };

    const placeFinder = (top, left) => {
      for (let dr = -1; dr <= 7; dr += 1) {
        for (let dc = -1; dc <= 7; dc += 1) {
          const r = top + dr;
          const c = left + dc;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const on =
            dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
            (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setFn(r, c, on);
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i += 1) {
      const bit = i % 2 === 0 ? 1 : 0;
      setFn(6, i, bit);
      setFn(i, 6, bit);
    }

    // Alignment patterns
    const coords = spec.align;
    for (const r of coords) {
      for (const c of coords) {
        if ((r < 9 && c < 9) || (r < 9 && c >= size - 8) || (r >= size - 8 && c < 9)) continue;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const on = Math.max(Math.abs(dr), Math.abs(dc)) === 2 || (dr === 0 && dc === 0);
            setFn(r + dr, c + dc, on);
          }
        }
      }
    }

    // Dark module + reserve format info areas
    setFn(size - 8, 8, 1);
    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        isFunc[8][i] = 1;
        isFunc[i][8] = 1;
      }
    }
    for (let i = 0; i < 8; i += 1) {
      isFunc[8][size - 1 - i] = 1;
      isFunc[size - 1 - i][8] = 1;
    }

    // Version info for V7+
    if (version >= 7) {
      const vBits = bchVersionInfo(version);
      for (let i = 0; i < 18; i += 1) {
        const bit = (vBits >>> i) & 1;
        const a = Math.floor(i / 3);
        const b = i % 3;
        setFn(a, size - 11 + b, bit);
        setFn(size - 11 + b, a, bit);
      }
    }

    return { size, modules, isFunc };
  }

  function placeDataAndMask(base, allCodewords, maskId) {
    const { size, isFunc } = base;
    const grid = base.modules.map((row) => new Uint8Array(row));
    const totalBits = allCodewords.length * 8;
    let bitIdx = 0;
    let up = true;

    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        const r = up ? size - 1 - vert : vert;
        for (let j = 0; j < 2; j += 1) {
          const c = right - j;
          if (isFunc[r][c]) continue;
          let dark = 0;
          if (bitIdx < totalBits) {
            dark = (allCodewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
            bitIdx += 1;
          }
          const cond = maskId === 0 ? (r + c) % 2 === 0
            : maskId === 1 ? r % 2 === 0
            : maskId === 2 ? c % 3 === 0
            : maskId === 3 ? (r + c) % 3 === 0
            : maskId === 4 ? (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0
            : maskId === 5 ? ((r * c) % 2 + (r * c) % 3) === 0
            : maskId === 6 ? (((r * c) % 2 + (r * c) % 3) % 2) === 0
            : (((r + c) % 2 + (r * c) % 3) % 2) === 0;
          grid[r][c] = dark ^ (cond ? 1 : 0);
        }
      }
      up = !up;
    }

    const fmt = bchFormatInfo(maskId);
    for (let i = 0; i < 6; i += 1) grid[8][i] = (fmt >>> i) & 1;
    grid[8][7] = (fmt >>> 6) & 1;
    grid[8][8] = (fmt >>> 7) & 1;
    grid[7][8] = (fmt >>> 8) & 1;
    for (let i = 9; i < 15; i += 1) grid[14 - i][8] = (fmt >>> i) & 1;

    for (let i = 0; i < 8; i += 1) grid[size - 1 - i][8] = (fmt >>> i) & 1;
    for (let i = 8; i < 15; i += 1) grid[8][size - 15 + i] = (fmt >>> i) & 1;

    return grid;
  }

  function penaltyScore(grid) {
    const n = grid.length;
    let score = 0;

    // N1: 5+ consecutive same color
    for (let r = 0; r < n; r += 1) {
      let runR = 1;
      let runC = 1;
      for (let i = 1; i < n; i += 1) {
        if (grid[r][i] === grid[r][i - 1]) runR += 1;
        else {
          if (runR >= 5) score += 3 + (runR - 5);
          runR = 1;
        }
        if (grid[i][r] === grid[i - 1][r]) runC += 1;
        else {
          if (runC >= 5) score += 3 + (runC - 5);
          runC = 1;
        }
      }
      if (runR >= 5) score += 3 + (runR - 5);
      if (runC >= 5) score += 3 + (runC - 5);
    }

    // N2: 2x2 blocks
    for (let r = 0; r < n - 1; r += 1) {
      for (let c = 0; c < n - 1; c += 1) {
        const v = grid[r][c];
        if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
          score += 3;
        }
      }
    }

    // N4: dark ratio balance
    let dark = 0;
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) dark += grid[r][c];
    }
    const pct = (dark * 100) / (n * n);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function encodeMatrix(text) {
    const bytes = utf8Bytes(text);
    const version = pickVersion(bytes.length);
    const data = buildDataCodewords(bytes, version);
    const interleaved = interleaveBlocks(data, version);
    const base = createGrid(version);

    let bestGrid = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask += 1) {
      const candidate = placeDataAndMask(base, interleaved, mask);
      const s = penaltyScore(candidate);
      if (s < bestScore) {
        bestScore = s;
        bestGrid = candidate;
      }
    }

    return {
      version,
      size: base.size,
      modules: bestGrid.map((row) => Array.from(row, (v) => v === 1)),
    };
  }

  function toSvg(text, { px = 200, margin = 3, fg = '#1C1917', bg = '#FFFFFF', cls = '' } = {}) {
    const { size, modules } = encodeMatrix(text);
    const total = size + margin * 2;
    let pathD = '';
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (modules[r][c]) {
          pathD += `M${c + margin},${r + margin}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" class="${cls}" role="img" aria-label="QR code linking to profile"><rect width="${total}" height="${total}" fill="${bg}" rx="1.5"/><path d="${pathD}" fill="${fg}"/></svg>`;
  }

  function drawOnCanvas(ctx, text, x, y, sizePx, { margin = 2, fg = '#1C1917', bg = '#FFFFFF' } = {}) {
    const { size, modules } = encodeMatrix(text);
    const total = size + margin * 2;
    const cell = sizePx / total;
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, sizePx, sizePx);
    ctx.fillStyle = fg;
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (modules[r][c]) {
          ctx.fillRect(
            Math.floor(x + (c + margin) * cell),
            Math.floor(y + (r + margin) * cell),
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      }
    }
  }

  return {
    encodeMatrix,
    toSvg,
    drawOnCanvas,
  };
});
