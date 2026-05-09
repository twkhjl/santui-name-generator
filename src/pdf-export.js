import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { chunkNames, chunkPages, NAMES_PER_PAGE } from './name-generator.js';

const FONT_FILE_NAME = 'kaiu.ttf';
const FONT_NAME = 'DFKai';
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

async function fetchFontBase64(fetchImpl = fetch) {
  const response = await fetchImpl(`/fonts/${FONT_FILE_NAME}`);

  if (!response.ok) {
    throw new Error('字型載入失敗');
  }

  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function drawPage(doc, { headerText, names, margin }) {
  const rows = chunkNames(names);
  const usableWidth = PAGE_WIDTH_MM - margin * 2;
  const cellWidth = usableWidth / 9;
  const startY = margin + 18;
  const cellHeight = 18;

  doc.setFontSize(18);
  doc.text(headerText, PAGE_WIDTH_MM / 2, margin + 8, { align: 'center', maxWidth: usableWidth });
  doc.setFontSize(18);

  rows.forEach((row, rowIndex) => {
    const top = startY + rowIndex * cellHeight;
    doc.line(margin, top, margin + usableWidth, top);

    row.forEach((name, columnIndex) => {
      const left = margin + columnIndex * cellWidth;

      doc.line(left, top, left, top + cellHeight);
      doc.text(name, left + cellWidth / 2, top + cellHeight / 2 + 2.4, { align: 'center' });
    });

    doc.line(margin + usableWidth, top, margin + usableWidth, top + cellHeight);
  });

  doc.line(
    margin,
    startY + rows.length * cellHeight,
    margin + usableWidth,
    startY + rows.length * cellHeight
  );
}

async function exportPreviewSheets(doc, sourceElement, renderCanvas) {
  const sheets = Array.from(sourceElement.querySelectorAll('.sheet'));

  if (sheets.length === 0) {
    throw new Error('請先產生名字');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  for (const [index, sheet] of sheets.entries()) {
    if (index > 0) {
      doc.addPage();
    }

    const canvas = await renderCanvas(sheet, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
  }
}

async function exportTextFallback(doc, { headerText, names, pdfConfig }, loadFontBase64) {
  const fontBase64 = await loadFontBase64();
  const pages = chunkPages(names);

  doc.addFileToVFS(FONT_FILE_NAME, fontBase64);
  doc.addFont(FONT_FILE_NAME, FONT_NAME, 'normal');
  doc.setFont(FONT_NAME, 'normal');

  pages.forEach((pageNames, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage();
    }

    drawPage(doc, {
      headerText,
      names: pageNames,
      margin: pdfConfig.marginMm
    });
  });
}

export async function exportPdf(
  { headerText, names, pdfConfig, sourceElement },
  dependencies = {}
) {
  if (!Array.isArray(names) || names.length === 0 || names.length % NAMES_PER_PAGE !== 0) {
    throw new Error('請先產生名字');
  }

  const createDocument = dependencies.createDocument ?? ((options) => new jsPDF(options));
  const loadFontBase64 = dependencies.loadFontBase64 ?? fetchFontBase64;
  const renderCanvas = dependencies.renderCanvas ?? html2canvas;
  const doc = createDocument({
    format: pdfConfig.format,
    orientation: pdfConfig.orientation,
    unit: 'mm'
  });

  if (sourceElement) {
    await exportPreviewSheets(doc, sourceElement, renderCanvas);
  } else {
    await exportTextFallback(doc, { headerText, names, pdfConfig }, loadFontBase64);
  }

  doc.save('name-generator.pdf');
}
