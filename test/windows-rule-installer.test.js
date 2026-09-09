import assert from 'node:assert/strict';
import { looksLikeMissingPython } from '../scripts/windows-rule-installer.js';

assert.equal(looksLikeMissingPython('Python was not found but can be installed from the Microsoft Store: ms-windows-store://example'), true);
assert.equal(looksLikeMissingPython('akidevrule: Python 3.7+ is required but none was found on PATH.'), true);
assert.equal(looksLikeMissingPython('Installed akidevrule 2.8.0'), false);

console.log('windows rule installer detection tests passed');
