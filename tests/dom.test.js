import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupApp } from '../src/dom.js';

describe('setupApp', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="header-input"></textarea>
      <button id="generate-button" type="button">產生名字</button>
      <button id="export-button" type="button">匯出 PDF</button>
      <p id="status"></p>
      <p id="header-preview"></p>
      <table id="name-table"></table>
    `;
  });

  it('載入後帶入預設標題，按產生後渲染 126 格', async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '預設標題',
      fullNames: Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`),
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi.fn((config) => config.fullNames);
    const exportPdf = vi.fn();

    await setupApp({ loadConfig, buildUniqueNames, exportPdf });

    document.querySelector('#generate-button').click();

    expect(document.querySelector('#header-input').value).toBe('預設標題');
    expect(document.querySelectorAll('#name-table td')).toHaveLength(126);
    expect(document.querySelector('#header-preview').textContent).toBe('預設標題');
    expect(exportPdf).not.toHaveBeenCalled();
  });

  it('尚未產生名字前禁止匯出', async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '預設標題',
      fullNames: [],
      firstChars: ['王'],
      secondChars: Array.from({ length: 126 }, (_, index) => String.fromCodePoint(0x4e00 + index)),
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi.fn();
    const exportPdf = vi.fn();

    await setupApp({ loadConfig, buildUniqueNames, exportPdf });
    document.querySelector('#export-button').click();

    expect(document.querySelector('#status').textContent).toBe('請先產生名字');
    expect(exportPdf).not.toHaveBeenCalled();
  });
});
