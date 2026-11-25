const path = require('path');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: 'jpeg', ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { type: 'png', ext: 'png', mime: 'image/png' };
  }
  // WebP: RIFF .... WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { type: 'webp', ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

function stripJpegMetadata(buf) {
  // Keep SOI (FF D8), strip APP1..APP15 (E1..EF) and COM (FE) which hold EXIF/GPS/XMP/IPTC
  const out = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos < buf.length) {
    if (buf[pos] !== 0xff) {
      // Unexpected byte; keep remainder safely
      out.push(buf.subarray(pos));
      break;
    }
    while (pos < buf.length && buf[pos] === 0xff) pos += 1;
    if (pos >= buf.length) break;
    const marker = buf[pos];
    pos += 1;

    if (marker === 0xd9) {
      // EOI
      out.push(Buffer.from([0xff, 0xd9]));
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(Buffer.from([0xff, marker]));
      continue;
    }
    if (marker === 0xda) {
      // Start Of Scan: copy header + image bitstream until EOI
      out.push(Buffer.from([0xff, 0xda]));
      out.push(buf.subarray(pos));
      break;
    }
    if (pos + 2 > buf.length) break;
    const segLen = buf.readUInt16BE(pos);
    if (segLen < 2 || pos + segLen > buf.length) break;
    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) {
      out.push(Buffer.from([0xff, marker]));
      out.push(buf.subarray(pos, pos + segLen));
    }
    pos += segLen;
  }
  return Buffer.concat(out);
}

function stripPngMetadata(buf) {
  // Drop eXIf, tEXt, zTXt, iTXt, tIME chunks
  const dropTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
  const out = [buf.subarray(0, 8)];
  let pos = 8;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    const totalLen = 12 + len;
    if (pos + totalLen > buf.length) break;
    if (!dropTypes.has(type)) {
      out.push(buf.subarray(pos, pos + totalLen));
    }
    pos += totalLen;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

function stripWebpMetadata(buf) {
  // Walk RIFF chunks after 'WEBP' (offset 12) and drop 'EXIF' and 'XMP '
  const chunks = [];
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const fourcc = buf.subarray(pos, pos + 4).toString('ascii');
    const size = buf.readUInt32LE(pos + 4);
    const paddedSize = size + (size % 2);
    const end = Math.min(buf.length, pos + 8 + paddedSize);
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      const chunkBuf = Buffer.from(buf.subarray(pos, end));
      if (fourcc === 'VP8X' && chunkBuf.length >= 12) {
        // Clear EXIF (bit 3 = 0x08) and XMP (bit 2 = 0x04) metadata flags
        chunkBuf[8] = chunkBuf[8] & ~0x0c;
      }
      chunks.push(chunkBuf);
    }
    pos = pos + 8 + paddedSize;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, body]);
}

function inspectAndStripImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    return { error: 'Please select an image file to upload.' };
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    return { error: 'Image must be 2 MB or smaller.' };
  }
  const detected = detectImageType(buf);
  if (!detected) {
    return { error: 'Only JPEG, PNG, or WebP images are allowed.' };
  }

  let cleaned = buf;
  if (detected.type === 'jpeg') cleaned = stripJpegMetadata(buf);
  else if (detected.type === 'png') cleaned = stripPngMetadata(buf);
  else if (detected.type === 'webp') cleaned = stripWebpMetadata(buf);

  return {
    buffer: cleaned,
    ext: detected.ext,
    mime: detected.mime,
  };
}

function resolveSafeUploadPath(baseDir, ...segments) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, ...segments);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Invalid file path');
  }
  return resolvedTarget;
}

module.exports = {
  MAX_IMAGE_BYTES,
  detectImageType,
  inspectAndStripImage,
  resolveSafeUploadPath,
};
