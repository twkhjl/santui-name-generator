import { chunkNames, NAMES_PER_PAGE } from './name-generator.js';

const CELL_EDIT_REGEX = /[\u4e00-\u9fff]/gu;

function sanitizeEditableName(value) {
  return (value.match(CELL_EDIT_REGEX) ?? []).join('').slice(0, 3);
}

function getNameCellClass(name) {
  return name.length === 3 ? 'name-cell name-cell--compact' : 'name-cell';
}

function createSheet(headerText, names, { editable = false, pageIndex = 0 } = {}) {
  const rows = chunkNames(names);

  return `
    <section class="sheet">
      <p class="header-preview">${headerText}</p>
      <table class="name-table" aria-label="名字預覽表格">
        ${rows
          .map(
            (row, rowIndex) => `
              <tr>
                ${row
                  .map((name, columnIndex) => {
                    const flatIndex = rowIndex * 9 + columnIndex;
                    const classes = getNameCellClass(name ?? '');
                    const editableAttrs = editable
                      ? ` data-page-index="${pageIndex}" data-name-index="${flatIndex}" tabindex="0"`
                      : '';
                    return `<td class="${classes}"${editableAttrs}>${name ?? ''}</td>`;
                  })
                  .join('')}
              </tr>
            `
          )
          .join('')}
      </table>
    </section>
  `;
}

function renderAllSheets(containerElement, headerText, pages) {
  containerElement.innerHTML = pages
    .map((pageNames, pageIndex) => createSheet(headerText, pageNames, { pageIndex }))
    .join('');
}

function renderPreview(previewElement, headerText, pages, pageIndex) {
  if (!previewElement) {
    return;
  }

  const currentPage = pages[pageIndex] ?? [];
  previewElement.innerHTML =
    currentPage.length > 0 ? createSheet(headerText, currentPage, { editable: true, pageIndex }) : '';
}

function buildPageOptions(totalPages, currentPageNumber) {
  return Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const selected = pageNumber === currentPageNumber ? ' selected' : '';
    return `<option value="${pageNumber}"${selected}>第 ${pageNumber} 頁</option>`;
  }).join('');
}

function updatePaginationControls(
  prevButton,
  nextButton,
  indicator,
  pageSelect,
  jumpButton,
  currentPageIndex,
  totalPages
) {
  const currentPageNumber = totalPages === 0 ? 0 : currentPageIndex + 1;

  if (indicator) {
    indicator.textContent = `${currentPageNumber} / ${totalPages}`;
  }

  if (pageSelect) {
    pageSelect.innerHTML = buildPageOptions(totalPages, currentPageNumber);
    pageSelect.disabled = totalPages <= 1;
    if (totalPages > 0) {
      pageSelect.value = String(currentPageNumber);
    }
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

function createNameEditor(cell, name) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = name;
  input.maxLength = 3;
  input.className = 'name-editor';
  input.setAttribute('data-name-editor', 'true');
  input.setAttribute('inputmode', 'text');
  input.setAttribute('aria-label', '編輯名字');
  cell.textContent = '';
  cell.append(input);
  input.focus();
  input.select();
  return input;
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
  const pageSelect = document.querySelector('#preview-page-select');
  const jumpButton = document.querySelector('#preview-jump-button');
  const sheetsContainer = document.querySelector('#print-sheets');
  const status = document.querySelector('#status');

  let config;
  let currentPages = [];
  let currentPageIndex = 0;

  exportButton.setAttribute('aria-busy', 'false');
  updatePaginationControls(prevButton, nextButton, pageIndicator, pageSelect, jumpButton, 0, 0);

  function syncRenderedPages() {
    renderPreview(previewElement, headerInput.value, currentPages, currentPageIndex);
    renderAllSheets(sheetsContainer, headerInput.value, currentPages);
    updatePaginationControls(
      prevButton,
      nextButton,
      pageIndicator,
      pageSelect,
      jumpButton,
      currentPageIndex,
      currentPages.length
    );
  }

  function goToPage(pageNumber) {
    if (currentPages.length === 0) {
      return;
    }

    currentPageIndex = Math.min(Math.max(pageNumber - 1, 0), currentPages.length - 1);
    syncRenderedPages();
  }

  function saveEditedName(pageIndex, nameIndex, nextValue) {
    const currentValue = currentPages[pageIndex]?.[nameIndex] ?? '';
    const sanitized = sanitizeEditableName(nextValue);

    if (!sanitized) {
      syncRenderedPages();
      return;
    }

    currentPages[pageIndex][nameIndex] = sanitized || currentValue;
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
    goToPage(parsePositiveInteger(pageSelect?.value, currentPageIndex + 1));
  });

  previewElement?.addEventListener('click', (event) => {
    const cell = event.target.closest('td[data-page-index][data-name-index]');
    if (!cell || cell.querySelector('input[data-name-editor="true"]')) {
      return;
    }

    const pageIndex = Number.parseInt(cell.dataset.pageIndex, 10);
    const nameIndex = Number.parseInt(cell.dataset.nameIndex, 10);
    const originalName = currentPages[pageIndex]?.[nameIndex] ?? '';
    const input = createNameEditor(cell, originalName);

    const commit = () => {
      saveEditedName(pageIndex, nameIndex, input.value);
    };

    input.addEventListener('keydown', (keyboardEvent) => {
      if (keyboardEvent.key === 'Enter') {
        keyboardEvent.preventDefault();
        commit();
      }

      if (keyboardEvent.key === 'Escape') {
        syncRenderedPages();
      }
    });

    input.addEventListener('blur', commit, { once: true });
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
