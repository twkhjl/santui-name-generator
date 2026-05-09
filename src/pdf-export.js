import { jsPDF } from 'jspdf';
import { chunkNames } from './name-generator.js';

const REQUIRED_TOTAL = 126;
const FONT_FILE_NAME = 'NotoSansTC-Regular.ttf';
const FONT_NAME = 'NotoSansTC';

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

export async function exportPdf(
  { headerText, names, pdfConfig },
  dependencies = {}
) {
  if (!Array.isArray(names) || names.length !== REQUIRED_TOTAL) {
    throw new Error('請先產生名字');
  }

  const createDocument = dependencies.createDocument ?? ((options) => new jsPDF(options));
  const loadFontBase64 = dependencies.loadFontBase64 ?? fetchFontBase64;
  const doc = createDocument({
    format: pdfConfig.format,
    orientation: pdfConfig.orientation,
    unit: 'mm'
  });
  const fontBase64 = await loadFontBase64();
  const margin = pdfConfig.marginMm;
  const rows = chunkNames(names);
  const pageWidth = 210;
  const usableWidth = pageWidth - margin * 2;
  const cellWidth = usableWidth / 9;
  const startY = margin + 18;
  const cellHeight = 18;

  doc.addFileToVFS(FONT_FILE_NAME, fontBase64);
  doc.addFont(FONT_FILE_NAME, FONT_NAME, 'normal');
  doc.setFont(FONT_NAME, 'normal');
  doc.setFontSize(14);
  doc.text(headerText, pageWidth / 2, margin + 8, { align: 'center', maxWidth: usableWidth });
  doc.setFontSize(11);

  rows.forEach((row, rowIndex) => {
    const top = startY + rowIndex * cellHeight;
    doc.line(margin, top, margin + usableWidth, top);

    row.forEach((name, columnIndex) => {
      const left = margin + columnIndex * cellWidth;

      doc.line(left, top, left, top + cellHeight);
      doc.text(name, left + cellWidth / 2, top + cellHeight / 2 + 1.5, { align: 'center' });
    });

    doc.line(margin + usableWidth, top, margin + usableWidth, top + cellHeight);
  });

  doc.line(
    margin,
    startY + rows.length * cellHeight,
    margin + usableWidth,
    startY + rows.length * cellHeight
  );
  doc.save('name-generator.pdf');
}
