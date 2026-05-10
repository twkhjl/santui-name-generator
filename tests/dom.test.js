import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupApp } from '../src/dom.js';

describe('setupApp', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="header-input"></textarea>
      <input id="page-count-input" type="number" value="1" />
      <button id="generate-button" type="button">產生名字</button>
      <button id="export-button" type="button">匯出 PDF</button>
      <p id="status"></p>
      <section id="print-sheets"></section>
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
    expect(document.querySelectorAll('#print-sheets td')).toHaveLength(126);
    expect(document.querySelector('.header-preview').textContent).toBe('預設標題');
    expect(exportPdf).not.toHaveBeenCalled();
  });

  it('多頁各自產生 126 個名字，且使用不同隨機來源', async () => {
    const pageNames = Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`);
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '預設標題',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi.fn(() => pageNames);

    await setupApp({ loadConfig, buildUniqueNames, exportPdf: vi.fn() });
    document.querySelector('#page-count-input').value = '2';
    document.querySelector('#generate-button').click();

    expect(buildUniqueNames).toHaveBeenCalledTimes(2);
    expect(buildUniqueNames.mock.calls[0][2]).toBe(126);
    expect(buildUniqueNames.mock.calls[1][2]).toBe(126);
    expect(buildUniqueNames.mock.calls[0][1]).not.toBe(buildUniqueNames.mock.calls[1][1]);
    expect(document.querySelectorAll('.sheet')).toHaveLength(2);
    expect(document.querySelectorAll('#print-sheets td')).toHaveLength(252);
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

  it('匯出時傳入目前的預覽容器', async () => {
    const pageNames = Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`);
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '預設標題',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const exportPdf = vi.fn();

    await setupApp({
      loadConfig,
      buildUniqueNames: vi.fn(() => pageNames),
      exportPdf
    });
    document.querySelector('#generate-button').click();
    document.querySelector('#export-button').click();

    expect(exportPdf).toHaveBeenCalledWith({
      headerText: '預設標題',
      names: pageNames,
      pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 },
      sourceElement: document.querySelector('#print-sheets')
    });
  });
  it('匯出 PDF 時顯示 loading，完成後恢復按鈕狀態', async () => {
    const pageNames = Array.from({ length: 126 }, (_, index) => `??{String(index).padStart(3, '0')}`);
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '?身璅?',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    let resolveExport;
    const exportPdf = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveExport = resolve;
        })
    );

    await setupApp({
      loadConfig,
      buildUniqueNames: vi.fn(() => pageNames),
      exportPdf
    });
    document.querySelector('#generate-button').click();
    document.querySelector('#export-button').click();

    expect(document.querySelector('#export-button').disabled).toBe(true);
    expect(document.querySelector('#export-button').getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('#status').textContent).toBe('PDF 匯出中...');

    resolveExport();
    await Promise.resolve();

    expect(document.querySelector('#export-button').disabled).toBe(false);
    expect(document.querySelector('#export-button').getAttribute('aria-busy')).toBe('false');
    expect(document.querySelector('#status').textContent).toBe('');
  });
});
