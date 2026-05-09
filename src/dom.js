import { chunkNames } from './name-generator.js';

function renderTable(tableElement, names) {
  const rows = chunkNames(names);
  tableElement.innerHTML = rows
    .map((row) => `<tr>${row.map((name) => `<td>${name ?? ''}</td>`).join('')}</tr>`)
    .join('');
}

export async function setupApp({ loadConfig, buildUniqueNames, exportPdf }) {
  const headerInput = document.querySelector('#header-input');
  const headerPreview = document.querySelector('#header-preview');
  const generateButton = document.querySelector('#generate-button');
  const exportButton = document.querySelector('#export-button');
  const table = document.querySelector('#name-table');
  const status = document.querySelector('#status');

  let config;
  let currentNames = [];

  try {
    config = await loadConfig();
    headerInput.value = config.defaultHeaderText;
    headerPreview.textContent = config.defaultHeaderText;

    if (config.invalidFullNameCount > 0) {
      status.textContent = `已忽略 ${config.invalidFullNameCount} 個非兩字項目`;
    }
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  headerInput.addEventListener('input', () => {
    headerPreview.textContent = headerInput.value;
  });

  generateButton.addEventListener('click', () => {
    try {
      currentNames = buildUniqueNames(config);
      renderTable(table, currentNames);
      headerPreview.textContent = headerInput.value;
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  exportButton.addEventListener('click', async () => {
    if (currentNames.length !== 126) {
      status.textContent = '請先產生名字';
      return;
    }

    await exportPdf({
      headerText: headerInput.value,
      names: currentNames,
      pdfConfig: config.pdf
    });
  });
}
