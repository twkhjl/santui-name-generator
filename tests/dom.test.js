import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupApp } from '../src/dom.js';

function buildNames(prefix = '測') {
  return Array.from({ length: 126 }, (_, index) => `${prefix}${String(index).padStart(3, '0')}`);
}

describe('setupApp', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="header-input"></textarea>
      <input id="page-count-input" type="number" value="1" />
      <button id="generate-button" type="button">產生名字</button>
      <button id="export-button" type="button">匯出 PDF</button>
      <button id="preview-prev-button" type="button">上一頁</button>
      <select id="preview-page-select"></select>
      <button id="preview-next-button" type="button">下一頁</button>
      <section id="name-editor-panel"></section>
      <p id="status"></p>
      <section id="preview-sheet"></section>
      <section id="print-sheets"></section>
    `;
  });

  it('載入後帶入預設標題，按產生後渲染單頁預覽與完整匯出內容', async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: buildNames('甲'),
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi.fn((config) => config.fullNames);
    const exportPdf = vi.fn();

    await setupApp({ loadConfig, buildUniqueNames, exportPdf });
    document.querySelector('#generate-button').click();

    expect(document.querySelector('#header-input').value).toBe('測試標題');
    expect(document.querySelectorAll('#preview-sheet td')).toHaveLength(126);
    expect(document.querySelectorAll('#print-sheets td')).toHaveLength(126);
    expect(document.querySelector('#preview-page-select').value).toBe('1');
    expect(document.querySelectorAll('#preview-page-select option')).toHaveLength(1);
    expect(document.querySelector('#preview-page-select option').textContent).toBe('1');
    expect(document.querySelector('#preview-prev-button').disabled).toBe(true);
    expect(document.querySelector('#preview-next-button').disabled).toBe(true);
    expect(document.querySelector('.header-preview').textContent).toBe('測試標題');
    expect(exportPdf).not.toHaveBeenCalled();
  });

  it('多頁時預覽只顯示目前頁，完整頁面仍保留給匯出', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
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
    expect(document.querySelectorAll('#preview-sheet .sheet')).toHaveLength(1);
    expect(document.querySelectorAll('#print-sheets .sheet')).toHaveLength(2);
    expect(document.querySelector('#preview-page-select').value).toBe('1');
    expect(document.querySelectorAll('#preview-page-select option')).toHaveLength(2);
    expect(document.querySelectorAll('#preview-page-select option')[1].textContent).toBe('2');
    expect(document.querySelector('#preview-prev-button').disabled).toBe(true);
    expect(document.querySelector('#preview-next-button').disabled).toBe(false);
    expect(document.querySelectorAll('#print-sheets td')).toHaveLength(252);
  });

  it('尚未產生名字前禁止匯出', async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
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

  it('匯出時傳入完整預覽容器而不是只有當前分頁', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
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
      headerText: '測試標題',
      names: pageNames,
      pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 },
      sourceElement: document.querySelector('#print-sheets')
    });
  });

  it('匯出 PDF 時顯示 loading，完成後恢復按鈕狀態', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
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

  it('預覽可切換上一頁下一頁，使用者不必一直往下捲', async () => {
    const allNames = buildNames('A').concat(buildNames('B'));
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: allNames.slice(0, 126),
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi
      .fn()
      .mockReturnValueOnce(allNames.slice(0, 126))
      .mockReturnValueOnce(allNames.slice(126));

    await setupApp({ loadConfig, buildUniqueNames, exportPdf: vi.fn() });
    document.querySelector('#page-count-input').value = '2';
    document.querySelector('#generate-button').click();

    document.querySelector('#preview-next-button').click();

    expect(document.querySelector('#preview-page-select').value).toBe('2');
    expect(document.querySelector('#preview-sheet').textContent).toContain('B000');
    expect(document.querySelector('#preview-prev-button').disabled).toBe(false);
    expect(document.querySelector('#preview-next-button').disabled).toBe(true);
  });

  it('更動下拉選單後直接跳轉到指定頁', async () => {
    const pages = buildNames('A').concat(buildNames('B'), buildNames('C'));
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: pages.slice(0, 126),
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi
      .fn()
      .mockReturnValueOnce(pages.slice(0, 126))
      .mockReturnValueOnce(pages.slice(126, 252))
      .mockReturnValueOnce(pages.slice(252));

    await setupApp({ loadConfig, buildUniqueNames, exportPdf: vi.fn() });
    document.querySelector('#page-count-input').value = '3';
    document.querySelector('#generate-button').click();

    const pageSelect = document.querySelector('#preview-page-select');
    pageSelect.value = '3';
    pageSelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('#preview-sheet').textContent).toContain('C000');
    expect(document.querySelector('#preview-next-button').disabled).toBe(true);
  });

  it('點名字後顯示清楚的編輯面板，儲存後同步更新預覽與匯出內容', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });

    await setupApp({
      loadConfig,
      buildUniqueNames: vi.fn(() => pageNames),
      exportPdf: vi.fn()
    });
    document.querySelector('#generate-button').click();

    document.querySelector('#preview-sheet td').click();

    expect(document.querySelector('#name-editor-panel').textContent).toContain('正在編輯');
    const editor = document.querySelector('#name-editor-input');
    editor.value = '王小明';
    document.querySelector('#name-editor-save').click();

    expect(document.querySelector('#preview-sheet td').textContent).toBe('王小明');
    expect(document.querySelector('#print-sheets td').textContent).toBe('王小明');
  });

  it('編輯後可還原成原始名字', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });

    await setupApp({
      loadConfig,
      buildUniqueNames: vi.fn(() => pageNames),
      exportPdf: vi.fn()
    });
    document.querySelector('#generate-button').click();
    const original = document.querySelector('#preview-sheet td').textContent;

    document.querySelector('#preview-sheet td').click();
    const editor = document.querySelector('#name-editor-input');
    editor.value = '王小明';
    document.querySelector('#name-editor-save').click();

    document.querySelector('#preview-sheet td').click();
    document.querySelector('#name-editor-reset').click();

    expect(document.querySelector('#preview-sheet td').textContent).toBe(original);
    expect(document.querySelector('#print-sheets td').textContent).toBe(original);
  });

  it('三個中文字會自動縮小，超過三字只保留前三個中文字', async () => {
    const pageNames = buildNames('甲');
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '測試標題',
      fullNames: pageNames,
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });

    await setupApp({
      loadConfig,
      buildUniqueNames: vi.fn(() => pageNames),
      exportPdf: vi.fn()
    });
    document.querySelector('#generate-button').click();

    document.querySelector('#preview-sheet td').click();
    const editor = document.querySelector('#name-editor-input');
    editor.value = '王小明天A';
    document.querySelector('#name-editor-save').click();

    const previewCell = document.querySelector('#preview-sheet td');
    expect(previewCell.textContent).toBe('王小明');
    expect(previewCell.classList.contains('name-cell--compact')).toBe(true);
  });
});
