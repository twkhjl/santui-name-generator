import { describe, expect, it, vi } from 'vitest';
import { exportPdf } from '../src/pdf-export.js';

describe('exportPdf', () => {
  it('在未提供 126 個名字時拒絕輸出', async () => {
    await expect(
      exportPdf({
        headerText: '標題',
        names: ['王明'],
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      })
    ).rejects.toThrow('請先產生名字');
  });

  it('建立 jsPDF 並儲存檔案', async () => {
    const save = vi.fn();
    const text = vi.fn();
    const line = vi.fn();
    const setFont = vi.fn();
    const setFontSize = vi.fn();
    const addFileToVFS = vi.fn();
    const addFont = vi.fn();
    const docFactory = vi.fn(() => ({
      addFileToVFS,
      addFont,
      setFont,
      setFontSize,
      text,
      line,
      save
    }));

    await exportPdf(
      {
        headerText: '標題',
        names: Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(3, '0')}`),
        pdfConfig: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      },
      {
        createDocument: docFactory,
        loadFontBase64: vi.fn().mockResolvedValue('ZmFrZS1mb250')
      }
    );

    expect(docFactory).toHaveBeenCalled();
    expect(addFileToVFS).toHaveBeenCalled();
    expect(addFont).toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith('name-generator.pdf');
  });
});
