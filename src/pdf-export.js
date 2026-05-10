import { chunkNames, chunkPages, NAMES_PER_PAGE } from './name-generator.js';

const FONT_FILE_NAME = 'NotoSansTC-ExtraBold.ttf';
const FONT_NAME = 'NotoSansTCExtraBold';
const FONT_FILE_URLS = [
  new URL(`./fonts/${FONT_FILE_NAME}`, document.baseURI).href,
  new URL(`./public/fonts/${FONT_FILE_NAME}`, document.baseURI).href
];
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const LARGE_EXPORT_PAGE_THRESHOLD = 20;
const FAST_TEXT_EXPORT_PAGE_THRESHOLD = 80;

async function fetchFontBase64(fetchImpl = fetch) {
  for (const fontUrl of FONT_FILE_URLS) {
    const response = await fetchImpl(fontUrl);

    if (!response.ok) {
      continue;
    }

    const buffer = await response.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);

    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  throw new Error('字型載入失敗');
}

function getPdfDependencies() {
  const renderCanvas = globalThis.html2canvas;
  const jsPdfConstructor = globalThis.jspdf?.jsPDF;

  if (!renderCanvas || !jsPdfConstructor) {
    throw new Error('PDF 套件載入失敗，請重新整理頁面後再試一次。');
  }

  return { renderCanvas, jsPdfConstructor };
}

function drawPage(doc, { headerText, names, margin }) {
  const rows = chunkNames(names);
  const usableWidth = PAGE_WIDTH_MM - margin * 2;
  const cellWidth = usableWidth / 9;
  const startY = margin + 18;
  const cellHeight = 18;

  doc.setFontSize(12);
  doc.text(headerText, PAGE_WIDTH_MM / 2, margin, { align: 'center', maxWidth: usableWidth });
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

function getRenderScale(pageCount) {
  return pageCount > LARGE_EXPORT_PAGE_THRESHOLD ? 1 : 2;
}

function shouldUseTextFallback(pageCount, sourceElement) {
  return !sourceElement || pageCount >= FAST_TEXT_EXPORT_PAGE_THRESHOLD;
}

function releaseCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

async function yieldToBrowser() {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function exportPreviewSheets(doc, sourceElement, renderCanvas) {
  const sheets = Array.from(sourceElement.querySelectorAll('.sheet'));

  if (sheets.length === 0) {
    throw new Error('請先產生名字');
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const scale = getRenderScale(sheets.length);

  for (const [index, sheet] of sheets.entries()) {
    if (index > 0) {
      doc.addPage();
    }

    const canvas = await renderCanvas(sheet, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true
    });
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    doc.addImage(imageData, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'FAST');
    releaseCanvas(canvas);

    if ((index + 1) % 5 === 0) {
      await yieldToBrowser();
    }
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

  const pageCount = names.length / NAMES_PER_PAGE;

  const globals = dependencies.createDocument && dependencies.renderCanvas ? null : getPdfDependencies();
  const createDocument =
    dependencies.createDocument ?? ((options) => new globals.jsPdfConstructor(options));
  const loadFontBase64 = dependencies.loadFontBase64 ?? fetchFontBase64;
  const renderCanvas = dependencies.renderCanvas ?? globals.renderCanvas;
  const doc = createDocument({
    format: pdfConfig.format,
    orientation: pdfConfig.orientation,
    unit: 'mm'
  });

  await exportTextFallback(doc, { headerText, names, pdfConfig }, loadFontBase64);

  doc.save('name-generator.pdf');
}
