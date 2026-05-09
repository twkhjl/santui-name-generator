import { describe, expect, it, vi } from 'vitest';
import { loadConfig, normalizeConfig } from '../src/config.js';

describe('normalizeConfig', () => {
  it('保留合法兩字 fullNames 並去重', () => {
    const config = normalizeConfig({
      defaultHeaderText: '標題',
      fullNames: ['王明', '王明', '王小明', 'A1', '李安'],
      firstChars: ['王', '李', '陳', '林', '周', '吳', '徐', '黃', '張', '許', '鄭', '何'],
      secondChars: ['明', '安', '華', '芳', '婷', '潔', '軒', '庭', '萱', '蓉', '雯', '欣'],
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });

    expect(config.fullNames).toEqual(['王明', '李安']);
    expect(config.invalidFullNameCount).toBe(3);
  });

  it('當可用唯一名字不足 126 時丟出錯誤', () => {
    expect(() =>
      normalizeConfig({
        defaultHeaderText: '標題',
        fullNames: ['王明'],
        firstChars: ['王'],
        secondChars: ['明'],
        pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      })
    ).toThrow('可用化名不足 126 個');
  });
});

describe('loadConfig', () => {
  it('從 config.local.json 載入設定檔', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        defaultHeaderText: '標題',
        fullNames: [],
        firstChars: ['王', '李', '陳', '林', '周', '吳', '徐', '黃', '張', '許', '鄭', '何'],
        secondChars: ['明', '安', '華', '芳', '婷', '潔', '軒', '庭', '萱', '蓉', '雯', '欣'],
        pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      })
    });

    await loadConfig(fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith('/config.local.json');
  });
});
