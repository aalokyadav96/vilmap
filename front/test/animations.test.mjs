import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextTransitProgress } from '../src/animations.ts';

test('bus progress advances in discrete route steps', () => {
  const path = [
    [76.1514, 28.2422],
    [76.1533, 28.2428],
    [76.1549, 28.2444],
    [76.1567, 28.2437],
    [76.1558, 28.2402],
  ];

  assert.equal(getNextTransitProgress(path, 0.15), 0.4);
  assert.equal(getNextTransitProgress(path, 0.75), 0.0);
});
