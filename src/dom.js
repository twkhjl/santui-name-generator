import { chunkNames, NAMES_PER_PAGE } from './name-generator.js';

const CELL_EDIT_REGEX = /[\u4e00-\u9fff]/gu;

function sanitizeEditableName(value) {
  return (value.match(CELL_EDIT_REGEX) ?? []).join('').slice(0, 3);
}

function getNameCellClass(name, isEditing) {
  const classes = ['name-cell'];

  if ((name ?? '').length === 3) {
    classes.push('name-cell--compact');
  }

  if (isEditing) {
    classes.push('name-cell--editing');
  }

  return classes.join(' ');
}

function createSheet(headerText, names, options = {}) {
  const { editable = false, pageIndex = 0, editingCell = null } = options;
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
                    const isEditing =
                      editable &&
                      editingCell?.pageIndex === pageIndex &&
                      editingCell?.nameIndex === flatIndex;
                    const editableAttrs = editable
                      ? ` data-page-index="${pageIndex}" data-name-index="${flatIndex}" tabindex="0"`
                      : '';
                    return `<td class="${getNameCellClass(name ?? '', isEditing)}"${editableAttrs}>${name ?? ''}</td>`;
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

function renderPreview(previewElement, headerText, pages, pageIndex, editingCell) {
  if (!previewElement) {
    return;
  }

  const currentPage = pages[pageIndex] ?? [];
  previewElement.innerHTML =
    currentPage.length > 0
      ? createSheet(headerText, currentPage, {
          editable: true,
          pageIndex,
          editingCell
        })
      : '';
}

function renderEditorPanel(panelElement, editingState, currentPages, originalPages, onSave, onCancel, onReset) {
  if (!panelElement) {
    return;
  }

  if (!editingState) {
    panelElement.innerHTML = `
      <div class="name-editor-panel name-editor-panel--idle">
        <p class="name-editor-title">點選預覽中的名字即可編輯</p>
        <p class="name-editor-help">支援 1 到 3 個中文字；輸入 3 字時會自動縮小，不影響排版。</p>
      </div>
    `;
    return;
  }

  const { pageIndex, nameIndex } = editingState;
  const currentValue = currentPages[pageIndex]?.[nameIndex] ?? '';
  const originalValue = originalPages[pageIndex]?.[nameIndex] ?? currentValue;

  panelElement.innerHTML = `
    <div class="name-editor-panel">
      <div class="name-editor-meta">
        <p class="name-editor-title">正在編輯</p>
        <p class="name-editor-position">第 ${pageIndex + 1} 頁，第 ${nameIndex + 1} 格</p>
      </div>
      <label class="name-editor-field">
        <span>姓名</span>
        <input id="name-editor-input" type="text" value="${currentValue}" maxlength="3" />
      </label>
      <p class="name-editor-help">只保留 1 到 3 個中文字；若輸入 3 字，預覽會自動縮小字級。</p>
      <div class="name-editor-actions">
        <button id="name-editor-save" type="button">儲存</button>
        <button id="name-editor-cancel" type="button" class="button-secondary">取消</button>
        <button id="name-editor-reset" type="button" class="button-secondary"${
          currentValue === originalValue ? ' disabled' : ''
        }>還原</button>
      </div>
    </div>
  `;

  const input = panelElement.querySelector('#name-editor-input');
  const saveButton = panelElement.querySelector('#name-editor-save');
  const cancelButton = panelElement.querySelector('#name-editor-cancel');
  const resetButton = panelElement.querySelector('#name-editor-reset');

  saveButton?.addEventListener('click', () => onSave(input.value));
  cancelButton?.addEventListener('click', onCancel);
  resetButton?.addEventListener('click', onReset);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSave(input.value);
    }

    if (event.key === 'Escape') {
      onCancel();
    }
  });
  input?.focus();
  input?.select();
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
  const pageSelect = document.querySelector('#preview-page-select');
  const editorPanel = document.querySelector('#name-editor-panel');
  const sheetsContainer = document.querySelector('#print-sheets');
  const status = document.querySelector('#status');

  let config;
  let currentPages = [];
  let originalPages = [];
  let currentPageIndex = 0;
  let editingState = null;

  exportButton.setAttribute('aria-busy', 'false');
  updatePaginationControls(prevButton, nextButton, pageIndicator, pageSelect, 0, 0);

  function syncRenderedPages() {
    renderPreview(previewElement, headerInput.value, currentPages, currentPageIndex, editingState);
    renderAllSheets(sheetsContainer, headerInput.value, currentPages);
    updatePaginationControls(
      prevButton,
      nextButton,
      pageIndicator,
      pageSelect,
      currentPageIndex,
      currentPages.length
    );
    renderEditorPanel(
      editorPanel,
      editingState,
      currentPages,
      originalPages,
      (nextValue) => {
        if (!editingState) {
          return;
        }

        const sanitized = sanitizeEditableName(nextValue);
        if (!sanitized) {
          return;
        }

        currentPages[editingState.pageIndex][editingState.nameIndex] = sanitized;
        editingState = null;
        syncRenderedPages();
      },
      () => {
        editingState = null;
        syncRenderedPages();
      },
      () => {
        if (!editingState) {
          return;
        }

        currentPages[editingState.pageIndex][editingState.nameIndex] =
          originalPages[editingState.pageIndex][editingState.nameIndex];
        editingState = null;
        syncRenderedPages();
      }
    );
  }

  function goToPage(pageNumber) {
    if (currentPages.length === 0) {
      return;
    }

    editingState = null;
    currentPageIndex = Math.min(Math.max(pageNumber - 1, 0), currentPages.length - 1);
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

  syncRenderedPages();

  headerInput.addEventListener('input', () => {
    syncRenderedPages();
  });

  generateButton.addEventListener('click', () => {
    try {
      const pageCount = parsePageCount(pageCountInput);
      currentPages = buildNamesForPages(config, pageCount, buildUniqueNames);
      originalPages = currentPages.map((page) => [...page]);
      currentPageIndex = 0;
      editingState = null;
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

  pageSelect?.addEventListener('change', () => {
    goToPage(parsePositiveInteger(pageSelect?.value, currentPageIndex + 1));
  });

  previewElement?.addEventListener('click', (event) => {
    const cell = event.target.closest('td[data-page-index][data-name-index]');
    if (!cell) {
      return;
    }

    editingState = {
      pageIndex: Number.parseInt(cell.dataset.pageIndex, 10),
      nameIndex: Number.parseInt(cell.dataset.nameIndex, 10)
    };
    syncRenderedPages();
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
