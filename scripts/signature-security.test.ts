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

assert.equal(normalizeSignerDocument('123.456.789-01'), '12345678901');
assert.equal(normalizeSignerDocument('12.345.678/0001-99'), '12345678000199');
mustThrow(() => normalizeSignerDocument('12345'));

const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const validDataUrl = `data:image/png;base64,${tinyPngBase64}`;
assert.equal(validateSignatureDataUrl(validDataUrl), validDataUrl);

mustThrow(() => validateSignatureDataUrl('javascript:alert(1)'));
mustThrow(() => validateSignatureDataUrl('data:image/jpeg;base64,abcd'));

console.log('signature-security tests passed');
