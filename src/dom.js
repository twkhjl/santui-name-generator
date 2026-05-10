import { chunkNames, NAMES_PER_PAGE } from './name-generator.js';

function createSheet(headerText, names) {
  const rows = chunkNames(names);
  return `
    <section class="sheet">
      <p class="header-preview">${headerText}</p>
      <table class="name-table" aria-label="名字預覽表格">
        ${rows.map((row) => `<tr>${row.map((name) => `<td>${name ?? ''}</td>`).join('')}</tr>`).join('')}
      </table>
    </section>
  `;
}

function renderAllSheets(containerElement, headerText, pages) {
  containerElement.innerHTML = pages.map((pageNames) => createSheet(headerText, pageNames)).join('');
}

function renderPreview(previewElement, headerText, pages, pageIndex) {
  if (!previewElement) {
    return;
  }

  const currentPage = pages[pageIndex] ?? [];
  previewElement.innerHTML = currentPage.length > 0 ? createSheet(headerText, currentPage) : '';
}

function updatePreviewScale(previewElement) {
  if (!previewElement) {
    return;
  }

  const previewSheet = previewElement.querySelector('.sheet');

  if (!previewSheet) {
    previewElement.style.setProperty('--preview-scale', '1');
    return;
  }

  const frameWidth = previewElement.clientWidth;
  const naturalWidth = previewSheet.offsetWidth;

  if (!frameWidth || !naturalWidth) {
    previewElement.style.setProperty('--preview-scale', '1');
    return;
  }

  const scale = Math.min(frameWidth / naturalWidth, 1);
  previewElement.style.setProperty('--preview-scale', String(scale));
}

function updatePaginationControls(
  prevButton,
  nextButton,
  indicator,
  pageInput,
  jumpButton,
  currentPageIndex,
  totalPages
) {
  const displayPage = totalPages === 0 ? 0 : currentPageIndex + 1;

  if (indicator) {
    indicator.textContent = `${displayPage} / ${totalPages}`;
  }

  if (pageInput) {
    pageInput.min = totalPages === 0 ? '0' : '1';
    pageInput.max = String(totalPages);
    pageInput.value = String(displayPage);
    pageInput.disabled = totalPages <= 1;
  }

  if (jumpButton) {
    jumpButton.disabled = totalPages <= 1;
  }

  if (prevButton) {
    prevButton.disabled = totalPages <= 1 || currentPageIndex <= 0;
  }

  if (nextButton) {
    nextButton.disabled = totalPages <= 1 || currentPageIndex >= totalPages - 1;
  }
}

function parsePositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageCount(inputElement) {
  return parsePositiveInteger(inputElement.value, 1);
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
  );
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
  const previewElement = document.querySelector('#preview-sheet');
  const prevButton = document.querySelector('#preview-prev-button');
  const nextButton = document.querySelector('#preview-next-button');
  const pageIndicator = document.querySelector('#preview-page-indicator');
  const pageInput = document.querySelector('#preview-page-input');
  const jumpButton = document.querySelector('#preview-jump-button');
  const sheetsContainer = document.querySelector('#print-sheets');
  const status = document.querySelector('#status');

  let config;
  let currentPages = [];
  let currentPageIndex = 0;

  exportButton.setAttribute('aria-busy', 'false');
  updatePaginationControls(prevButton, nextButton, pageIndicator, pageInput, jumpButton, 0, 0);

  function syncRenderedPages() {
    renderPreview(previewElement, headerInput.value, currentPages, currentPageIndex);
    updatePreviewScale(previewElement);
    renderAllSheets(sheetsContainer, headerInput.value, currentPages);
    updatePaginationControls(
      prevButton,
      nextButton,
      pageIndicator,
      pageInput,
      jumpButton,
      currentPageIndex,
      currentPages.length
    );
  }

  function goToPage(pageNumber) {
    if (currentPages.length === 0) {
      return;
    }

    const nextPageIndex = Math.min(Math.max(pageNumber - 1, 0), currentPages.length - 1);
    currentPageIndex = nextPageIndex;
    syncRenderedPages();
  }

  try {
    config = await loadConfig();
    headerInput.value = config.defaultHeaderText;

    if (config.invalidFullNameCount > 0) {
      status.textContent = `已忽略 ${config.invalidFullNameCount} 筆不合法的兩字姓名`;
    }
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  headerInput.addEventListener('input', () => {
    syncRenderedPages();
  });

  globalThis.addEventListener?.('resize', () => {
    updatePreviewScale(previewElement);
  });

  generateButton.addEventListener('click', () => {
    try {
      const pageCount = parsePageCount(pageCountInput);
      currentPages = buildNamesForPages(config, pageCount, buildUniqueNames);
      currentPageIndex = 0;
      syncRenderedPages();
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  prevButton?.addEventListener('click', () => {
    goToPage(currentPageIndex);
  });

  nextButton?.addEventListener('click', () => {
    goToPage(currentPageIndex + 2);
  });

  jumpButton?.addEventListener('click', () => {
    goToPage(parsePositiveInteger(pageInput?.value, currentPageIndex + 1));
  });

  pageInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    goToPage(parsePositiveInteger(pageInput.value, currentPageIndex + 1));
  });

  exportButton.addEventListener('click', async () => {
    if (currentPages.length === 0) {
      status.textContent = '請先產生名字';
      return;
    }

    try {
      setExportLoadingState(exportButton, status, true);
      await exportPdf({
        headerText: headerInput.value,
        names: currentPages.flat(),
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
