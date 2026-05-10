import { chunkNames, chunkPages, NAMES_PER_PAGE } from './name-generator.js';

function createSheet(headerText, names) {
  const rows = chunkNames(names);
  return `
    <section class="sheet">
      <p class="header-preview">${headerText}</p>
      <table class="name-table" aria-label="假名表格">
        ${rows.map((row) => `<tr>${row.map((name) => `<td>${name ?? ''}</td>`).join('')}</tr>`).join('')}
      </table>
    </section>
  `;
}

function renderSheets(containerElement, headerText, names) {
  containerElement.innerHTML = chunkPages(names)
    .map((pageNames) => createSheet(headerText, pageNames))
    .join('');
}

function parsePageCount(inputElement) {
  const pageCount = Number.parseInt(inputElement.value, 10);
  return Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 1;
}

function createSeededRandom(seed) {
  let state = seed + 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

function buildNamesForPages(config, pageCount, buildUniqueNames) {
  const baseSeed = Math.floor(Math.random() * 0x100000000);

  return Array.from({ length: pageCount }, (_, pageIndex) =>
    buildUniqueNames(config, createSeededRandom(baseSeed + pageIndex + 1), NAMES_PER_PAGE)
  ).flat();
}

function setExportLoadingState(exportButton, status, isLoading) {
  exportButton.disabled = isLoading;
  exportButton.setAttribute('aria-busy', String(isLoading));
  exportButton.classList.toggle('is-loading', isLoading);

  if (isLoading) {
    status.textContent = 'PDF 匯出中...';
  }
}

export async function setupApp({ loadConfig, buildUniqueNames, exportPdf }) {
  const headerInput = document.querySelector('#header-input');
  const pageCountInput = document.querySelector('#page-count-input');
  const generateButton = document.querySelector('#generate-button');
  const exportButton = document.querySelector('#export-button');
  const sheetsContainer = document.querySelector('#print-sheets');
  const status = document.querySelector('#status');

  let config;
  let currentNames = [];
  exportButton.setAttribute('aria-busy', 'false');

  try {
    config = await loadConfig();
    headerInput.value = config.defaultHeaderText;

    if (config.invalidFullNameCount > 0) {
      status.textContent = `已忽略 ${config.invalidFullNameCount} 個非兩字項目`;
    }
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  headerInput.addEventListener('input', () => {
    document.querySelectorAll('.header-preview').forEach((preview) => {
      preview.textContent = headerInput.value;
    });
  });

  generateButton.addEventListener('click', () => {
    try {
      const pageCount = parsePageCount(pageCountInput);
      currentNames = buildNamesForPages(config, pageCount, buildUniqueNames);
      renderSheets(sheetsContainer, headerInput.value, currentNames);
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  exportButton.addEventListener('click', async () => {
    if (currentNames.length === 0) {
      status.textContent = '請先產生名字';
      return;
    }

    try {
      setExportLoadingState(exportButton, status, true);
      await exportPdf({
        headerText: headerInput.value,
        names: currentNames,
        pdfConfig: config.pdf,
        sourceElement: sheetsContainer
      });
    } catch (error) {
      status.textContent = error.message;
    } finally {
      if (status.textContent === 'PDF 匯出中...') {
        status.textContent = '';
      }

      setExportLoadingState(exportButton, status, false);
    }
  });
}
