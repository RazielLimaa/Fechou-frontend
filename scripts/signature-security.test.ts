import assert from 'node:assert/strict';
import {
  normalizeSignerDocument,
  validateSignatureDataUrl,
  validateSignerName,
} from '../src/lib/signature-security';

function mustThrow(fn: () => unknown) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.equal(threw, true);
}

assert.equal(validateSignerName('Maria Silva'), 'Maria Silva');
mustThrow(() => validateSignerName('a'));
mustThrow(() => validateSignerName('Maria <script>'));

assert.equal(normalizeSignerDocument('529.982.247-25'), '52998224725');
assert.equal(normalizeSignerDocument('11.222.333/0001-81'), '11222333000181');
mustThrow(() => normalizeSignerDocument('12345'));
mustThrow(() => normalizeSignerDocument('000.000.000-00'));
mustThrow(() => normalizeSignerDocument('529.982.<script>-25'));

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const validDataUrl = `data:image/png;base64,${tinyPngBase64}`;
assert.equal(validateSignatureDataUrl(validDataUrl), validDataUrl);

mustThrow(() => validateSignatureDataUrl('javascript:alert(1)'));
mustThrow(() => validateSignatureDataUrl('data:image/jpeg;base64,abcd'));

console.log('signature-security tests passed');
