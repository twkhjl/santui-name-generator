import { describe, expect, it, vi } from 'vitest';
import { buildUniqueNames, chunkNames } from '../src/name-generator.js';

describe('buildUniqueNames', () => {
  it('先使用 fullNames，再用字池補足到 126', () => {
    const random = vi.fn(() => 0);
    const names = buildUniqueNames(
      {
        fullNames: ['王明', '李安'],
        firstChars: [
          '王', '李', '陳', '林', '周', '吳', '徐', '黃', '張', '許', '鄭', '何'
        ],
        secondChars: [
          '明', '安', '華', '芳', '婷', '潔', '軒', '庭', '萱', '蓉', '雯', '欣'
        ]
      },
      random
    );

    expect(names).toHaveLength(126);
    expect(new Set(names).size).toBe(126);
    expect(names[0]).toBe('王明');
    expect(names[1]).toBe('李安');
  });
});

describe('chunkNames', () => {
  it('切成 14 x 9 二維陣列', () => {
    const names = Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`);
    const rows = chunkNames(names);

    expect(rows).toHaveLength(14);
    expect(rows[0]).toHaveLength(9);
    expect(rows[13][8]).toBe(names[125]);
  });
});
