// Regression snapshot: every synthetic boundary input still produces the stored fields.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ManseInput } from '../src/index';
import { expectedFields } from './fixtures/make-expected';

const raw = readFileSync(new URL('./fixtures/synthetic-inputs.json', import.meta.url));
const inputs = JSON.parse(raw.toString('utf8')) as { cases: Array<{ id: string; input: ManseInput }> };
const expected = JSON.parse(readFileSync(new URL('./fixtures/expected.json', import.meta.url), 'utf8')) as { inputsSha256: string; cases: Record<string, Record<string, string>> };

describe('synthetic regression snapshot', () => {
  it('expected.json was generated from these inputs', () => {
    expect(expected.inputsSha256).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(Object.keys(expected.cases).sort()).toEqual(inputs.cases.map((c) => c.id).sort());
  });
  it.each(inputs.cases.map((c) => [c.id, c.input] as const))('%s', (id, input) => {
    expect(expectedFields(input)).toEqual(expected.cases[id]);
  });
});
