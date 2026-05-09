import { describe, expect, it, vi } from 'vitest';
import { exportPdf } from '../src/pdf-export.js';

function createDocMock() {
  const save = vi.fn();
  const text = vi.fn();
  const line = vi.fn();
  const setFont = vi.fn();
  const setFontSize = vi.fn();
  const addFileToVFS = vi.fn();
  const addFont = vi.fn();
  const addPage = vi.fn();
  const addImage = vi.fn();

  return {
    addFileToVFS,
    addFont,
    addImage,
    addPage,
    line,
    save,
    setFont,
    setFontSize,
    text
  };
}

function createCanvasMock() {
  return {
    height: 100,
    width: 100,
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,fake')
  };
}

describe('exportPdf', () => {
  it('在未提供完整頁面名字時拒絕輸出', async () => {
    await expect(
      exportPdf({
        headerText: '標題',
        names: ['王明'],
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      })
    ).rejects.toThrow('請先產生名字');
  });

  it('有預覽元素時使用 HTML 預覽輸出 PDF', async () => {
    document.body.innerHTML = '<section id="print-sheets"><section class="sheet"></section></section>';
    const doc = createDocMock();
    const canvas = createCanvasMock();
    const renderCanvas = vi.fn().mockResolvedValue(canvas);

    await exportPdf(
      {
        headerText: '標題',
        names: Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`),
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 },
        sourceElement: document.querySelector('#print-sheets')
      },
      {
        createDocument: vi.fn(() => doc),
        renderCanvas
      }
    );

    expect(renderCanvas).toHaveBeenCalledWith(expect.any(HTMLElement), {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    expect(doc.addImage).toHaveBeenCalledWith(
      'data:image/jpeg;base64,fake',
      'JPEG',
      0,
      0,
      210,
      297,
      undefined,
      'FAST'
    );
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(doc.addFileToVFS).not.toHaveBeenCalled();
    expect(doc.save).toHaveBeenCalledWith('name-generator.pdf');
  });

  it('多個預覽頁面會在 PDF 加頁', async () => {
    document.body.innerHTML = `
      <section id="print-sheets">
        <section class="sheet"></section>
        <section class="sheet"></section>
      </section>
    `;
    const doc = createDocMock();

    await exportPdf(
      {
        headerText: '標題',
        names: Array.from({ length: 252 }, (_, index) => `名${String(index).padStart(3, '0')}`),
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 },
        sourceElement: document.querySelector('#print-sheets')
      },
      {
        createDocument: vi.fn(() => doc),
        renderCanvas: vi.fn().mockResolvedValue(createCanvasMock())
      }
    );

    expect(doc.addImage).toHaveBeenCalledTimes(2);
    expect(doc.addPage).toHaveBeenCalledTimes(1);
    expect(doc.save).toHaveBeenCalledWith('name-generator.pdf');
  });

  it('大量頁面匯出時降低截圖解析度', async () => {
    document.body.innerHTML = `<section id="print-sheets">${
      Array.from({ length: 50 }, () => '<section class="sheet"></section>').join('')
    }</section>`;
    const renderCanvas = vi.fn().mockResolvedValue(createCanvasMock());

    await exportPdf(
      {
        headerText: '標題',
        names: Array.from({ length: 6300 }, (_, index) => `名${String(index).padStart(4, '0')}`),
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 },
        sourceElement: document.querySelector('#print-sheets')
      },
      {
        createDocument: vi.fn(() => createDocMock()),
        renderCanvas
      }
    );

    expect(renderCanvas).toHaveBeenCalledTimes(50);
    expect(renderCanvas).toHaveBeenCalledWith(expect.any(HTMLElement), {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true
    });
  });
});
