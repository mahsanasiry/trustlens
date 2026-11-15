import { describe, expect, it } from 'vitest';
import { claimCategories, sourceTypes } from '@/lib/domain/enums';
import { sourceTypeTone } from '@/lib/domain/source-tone';

describe('sourceTypeTone', () => {
  it('gives every source type a category colour', () => {
    for (const type of sourceTypes) {
      expect(claimCategories).toContain(sourceTypeTone[type]);
    }
  });
});
