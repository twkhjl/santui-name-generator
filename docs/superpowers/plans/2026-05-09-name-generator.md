# Name Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立純前端假名產生器，可讀取 `config.json`、產生 `126` 個不重複兩字繁體中文化名、渲染 `14 x 9` 表格，並匯出 `A4 直式 PDF`。

**Architecture:** 採用 `Vite + Vanilla JavaScript`。邏輯拆成設定驗證、名字產生、表格渲染、PDF 匯出四個模組；畫面層維持單頁應用。測試以 `Vitest` 為主，先鎖定資料驗證與名字產生，再補 UI 行為與 PDF 呼叫整合。

**Tech Stack:** Vite, Vanilla JavaScript, Vitest, jsdom, jsPDF

---

## File Structure

- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Create: `src/config.js`
- Create: `src/name-generator.js`
- Create: `src/pdf-export.js`
- Create: `src/dom.js`
- Create: `public/config.json`
- Create: `public/fonts/NotoSansTC-Regular.ttf`
- Create: `tests/config.test.js`
- Create: `tests/name-generator.test.js`
- Create: `tests/dom.test.js`
- Create: `tests/pdf-export.test.js`

責任分工：

- `src/config.js`：載入並驗證 `config.json`，回傳標準化資料。
- `src/name-generator.js`：去重、組名、補名、隨機取樣。
- `src/dom.js`：畫面初始化、按鈕事件、錯誤訊息、表格渲染。
- `src/pdf-export.js`：字型載入與 `A4 直式 PDF` 輸出。
- `src/main.js`：組裝模組。

## Task 1: Bootstrap Project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Create: `public/config.json`

- [ ] **Step 1: 建立 `package.json`**

```json
{
  "name": "name-generator",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "jspdf": "^3.0.1"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^26.1.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: 建立 `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
});
```

- [ ] **Step 3: 建立畫面骨架 `index.html`**

```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>假名產生器</title>
    <script type="module" src="/src/main.js"></script>
  </head>
  <body>
    <main class="page">
      <section class="controls">
        <label class="field">
          <span>上方文字</span>
          <textarea id="header-input" rows="3"></textarea>
        </label>
        <div class="actions">
          <button id="generate-button" type="button">產生名字</button>
          <button id="export-button" type="button">匯出 PDF</button>
        </div>
        <p id="status" class="status" role="status"></p>
      </section>

      <section id="print-sheet" class="sheet">
        <p id="header-preview" class="header-preview"></p>
        <table id="name-table" class="name-table" aria-label="假名表格"></table>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 4: 建立基本樣式 `src/styles.css`**

```css
:root {
  font-family: "Noto Sans TC", sans-serif;
  color: #1f2937;
  background: #f3f4f6;
}

body {
  margin: 0;
}

.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px;
}

.controls {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.field {
  display: grid;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 12px;
}

.status {
  min-height: 24px;
  margin: 0;
  color: #b91c1c;
}

.sheet {
  width: 210mm;
  min-height: 297mm;
  box-sizing: border-box;
  padding: 10mm;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.header-preview {
  margin: 0 0 12mm;
  text-align: center;
  white-space: pre-wrap;
}

.name-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.name-table td {
  border: 1px solid #111827;
  text-align: center;
  vertical-align: middle;
  height: 18mm;
  font-size: 18px;
}
```

- [ ] **Step 5: 建立預設設定檔 `public/config.json`**

```json
{
  "defaultHeaderText": "請將下列表格作為化名名單使用。",
  "fullNames": [
    "王明",
    "李安",
    "陳華",
    "林芳",
    "周婷",
    "吳潔"
  ],
  "firstChars": ["王", "李", "陳", "林", "周", "吳", "徐", "黃", "張", "許", "鄭", "何"],
  "secondChars": ["明", "安", "華", "芳", "婷", "潔", "軒", "庭", "萱", "蓉", "雯", "欣"],
  "pdf": {
    "format": "a4",
    "orientation": "portrait",
    "marginMm": 10
  }
}
```

- [ ] **Step 6: 建立入口檔 `src/main.js`**

```js
import './styles.css';

console.log('App bootstrap pending implementation');
```

- [ ] **Step 7: 安裝依賴**

Run: `npm install`  
Expected: 安裝 `vite`、`vitest`、`jspdf` 成功，無 `npm ERR!`

- [ ] **Step 8: 啟動開發站確認骨架可開**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`  
Expected: 顯示 `Local: http://127.0.0.1:4173/`

- [ ] **Step 9: 若需要版本控制，初始化 git**

Run: `git init`  
Expected: 顯示 `Initialized empty Git repository`

- [ ] **Step 10: Commit**

```bash
git add package.json vite.config.js index.html src/main.js src/styles.css public/config.json
git commit -m "chore: bootstrap name generator"
```

## Task 2: Implement Config Validation with Tests

**Files:**
- Create: `src/config.js`
- Create: `tests/config.test.js`

- [ ] **Step 1: 先寫失敗測試 `tests/config.test.js`**

```js
import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../src/config.js';

describe('normalizeConfig', () => {
  it('保留合法兩字 fullNames 並去重', () => {
    const config = normalizeConfig({
      defaultHeaderText: '標題',
      fullNames: ['王明', '王明', '王小明', 'A1', '李安'],
      firstChars: ['王'],
      secondChars: ['明'],
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });

    expect(config.fullNames).toEqual(['王明', '李安']);
    expect(config.invalidFullNameCount).toBe(2);
  });

  it('當可用唯一名字不足 126 時丟出錯誤', () => {
    expect(() =>
      normalizeConfig({
        defaultHeaderText: '標題',
        fullNames: ['王明'],
        firstChars: ['王'],
        secondChars: ['明'],
        pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
      })
    ).toThrow('可用化名不足 126 個');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- tests/config.test.js`  
Expected: FAIL，錯誤包含 `Cannot find module '../src/config.js'`

- [ ] **Step 3: 寫最小實作 `src/config.js`**

```js
const REQUIRED_TOTAL = 126;
const TWO_CJK_REGEX = /^[\u4e00-\u9fff]{2}$/u;

function unique(items) {
  return [...new Set(items)];
}

export function normalizeConfig(rawConfig) {
  const defaultHeaderText = String(rawConfig?.defaultHeaderText ?? '').trim();
  const fullNameInput = Array.isArray(rawConfig?.fullNames) ? rawConfig.fullNames : [];
  const firstChars = unique(Array.isArray(rawConfig?.firstChars) ? rawConfig.firstChars : []);
  const secondChars = unique(Array.isArray(rawConfig?.secondChars) ? rawConfig.secondChars : []);
  const validFullNames = unique(fullNameInput.filter((name) => TWO_CJK_REGEX.test(name)));
  const invalidFullNameCount = fullNameInput.length - validFullNames.length;
  const generatedCapacity = firstChars.length * secondChars.length;
  const totalUniqueCapacity = new Set([
    ...validFullNames,
    ...firstChars.flatMap((first) => secondChars.map((second) => `${first}${second}`))
  ]).size;

  if (totalUniqueCapacity < REQUIRED_TOTAL) {
    throw new Error('可用化名不足 126 個');
  }

  return {
    defaultHeaderText,
    fullNames: validFullNames,
    firstChars,
    secondChars,
    invalidFullNameCount,
    generatedCapacity,
    pdf: {
      format: rawConfig?.pdf?.format ?? 'a4',
      orientation: rawConfig?.pdf?.orientation ?? 'portrait',
      marginMm: Number(rawConfig?.pdf?.marginMm ?? 10)
    }
  };
}

export async function loadConfig(fetchImpl = fetch) {
  const response = await fetchImpl('/config.json');

  if (!response.ok) {
    throw new Error('設定檔讀取失敗');
  }

  const rawConfig = await response.json();
  return normalizeConfig(rawConfig);
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test -- tests/config.test.js`  
Expected: PASS，顯示 `2 passed`

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "test: validate config loading rules"
```

## Task 3: Implement Name Generation with Tests

**Files:**
- Create: `src/name-generator.js`
- Create: `tests/name-generator.test.js`

- [ ] **Step 1: 先寫失敗測試 `tests/name-generator.test.js`**

```js
import { describe, expect, it, vi } from 'vitest';
import { buildUniqueNames } from '../src/name-generator.js';

describe('buildUniqueNames', () => {
  it('先使用 fullNames，再用字池補足到 126', () => {
    const random = vi.fn(() => 0);
    const names = buildUniqueNames(
      {
        fullNames: ['王明', '李安'],
        firstChars: Array.from({ length: 18 }, (_, index) => `甲${index}`.slice(0, 1)),
        secondChars: ['明', '安', '華', '芳', '婷', '潔', '軒']
      },
      random
    );

    expect(names).toHaveLength(126);
    expect(new Set(names).size).toBe(126);
    expect(names[0]).toBe('王明');
    expect(names[1]).toBe('李安');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- tests/name-generator.test.js`  
Expected: FAIL，錯誤包含 `Cannot find module '../src/name-generator.js'`

- [ ] **Step 3: 寫最小實作 `src/name-generator.js`**

```js
const REQUIRED_TOTAL = 126;

function shuffle(items, randomFn) {
  const list = [...items];

  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

export function buildUniqueNames(config, randomFn = Math.random) {
  const result = [...config.fullNames];
  const used = new Set(result);
  const combinations = [];

  for (const firstChar of config.firstChars) {
    for (const secondChar of config.secondChars) {
      const name = `${firstChar}${secondChar}`;

      if (!used.has(name)) {
        combinations.push(name);
      }
    }
  }

  const shuffled = shuffle(combinations, randomFn);

  for (const name of shuffled) {
    if (result.length >= REQUIRED_TOTAL) {
      break;
    }

    result.push(name);
    used.add(name);
  }

  if (result.length < REQUIRED_TOTAL) {
    throw new Error('可用化名不足 126 個');
  }

  return result.slice(0, REQUIRED_TOTAL);
}

export function chunkNames(names, rowCount = 14, columnCount = 9) {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => names[rowIndex * columnCount + columnIndex])
  );
}
```

- [ ] **Step 4: 補 row/column 測試**

在 `tests/name-generator.test.js` 追加：

```js
it('切成 14 x 9 二維陣列', async () => {
  const { chunkNames } = await import('../src/name-generator.js');
  const names = Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(2, '0')}`);
  const rows = chunkNames(names);

  expect(rows).toHaveLength(14);
  expect(rows[0]).toHaveLength(9);
  expect(rows[13][8]).toBe(names[125]);
});
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test -- tests/name-generator.test.js`  
Expected: PASS，顯示 `2 passed`

- [ ] **Step 6: Commit**

```bash
git add src/name-generator.js tests/name-generator.test.js
git commit -m "feat: add unique name generation"
```

## Task 4: Implement DOM Rendering and Interaction with Tests

**Files:**
- Create: `src/dom.js`
- Modify: `src/main.js`
- Create: `tests/dom.test.js`

- [ ] **Step 1: 先寫失敗測試 `tests/dom.test.js`**

```js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupApp } from '../src/dom.js';

describe('setupApp', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="header-input"></textarea>
      <button id="generate-button" type="button">產生名字</button>
      <button id="export-button" type="button">匯出 PDF</button>
      <p id="status"></p>
      <p id="header-preview"></p>
      <table id="name-table"></table>
    `;
  });

  it('載入後帶入預設標題，按產生後渲染 126 格', async () => {
    const loadConfig = vi.fn().mockResolvedValue({
      defaultHeaderText: '預設標題',
      fullNames: Array.from({ length: 126 }, (_, index) => `名${String(index).padStart(2, '0')}`),
      firstChars: [],
      secondChars: [],
      invalidFullNameCount: 0,
      pdf: { format: 'a4', orientation: 'portrait', marginMm: 10 }
    });
    const buildUniqueNames = vi.fn((config) => config.fullNames);
    const exportPdf = vi.fn();

    await setupApp({ loadConfig, buildUniqueNames, exportPdf });

    document.querySelector('#generate-button').click();

    expect(document.querySelector('#header-input').value).toBe('預設標題');
    expect(document.querySelectorAll('#name-table td')).toHaveLength(126);
    expect(document.querySelector('#header-preview').textContent).toBe('預設標題');
    expect(exportPdf).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- tests/dom.test.js`  
Expected: FAIL，錯誤包含 `Cannot find module '../src/dom.js'`

- [ ] **Step 3: 寫最小實作 `src/dom.js`**

```js
import { chunkNames } from './name-generator.js';

function renderTable(tableElement, names) {
  const rows = chunkNames(names);
  tableElement.innerHTML = rows
    .map(
      (row) =>
        `<tr>${row.map((name) => `<td>${name ?? ''}</td>`).join('')}</tr>`
    )
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
```

- [ ] **Step 4: 補主程式 `src/main.js`**

```js
import './styles.css';
import { loadConfig } from './config.js';
import { buildUniqueNames } from './name-generator.js';
import { exportPdf } from './pdf-export.js';
import { setupApp } from './dom.js';

setupApp({ loadConfig, buildUniqueNames, exportPdf });
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test -- tests/dom.test.js`  
Expected: PASS，顯示 `1 passed`

- [ ] **Step 6: Commit**

```bash
git add src/dom.js src/main.js tests/dom.test.js
git commit -m "feat: wire UI interactions"
```

## Task 5: Implement PDF Export with Tests

**Files:**
- Create: `src/pdf-export.js`
- Create: `tests/pdf-export.test.js`
- Create: `public/fonts/NotoSansTC-Regular.ttf`

- [ ] **Step 1: 放入字型檔**

將 `NotoSansTC-Regular.ttf` 放到 `public/fonts/NotoSansTC-Regular.ttf`。  
Expected: 檔案存在，之後可由 `/fonts/NotoSansTC-Regular.ttf` 取得。

- [ ] **Step 2: 先寫失敗測試 `tests/pdf-export.test.js`**

```js
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
        names: Array.from({ length: 126 }, (_, index) => `名${index}`),
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
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npm test -- tests/pdf-export.test.js`  
Expected: FAIL，錯誤包含 `Cannot find module '../src/pdf-export.js'`

- [ ] **Step 4: 寫最小實作 `src/pdf-export.js`**

```js
import { jsPDF } from 'jspdf';
import { chunkNames } from './name-generator.js';

const REQUIRED_TOTAL = 126;

async function fetchFontBase64(fetchImpl = fetch) {
  const response = await fetchImpl('/fonts/NotoSansTC-Regular.ttf');

  if (!response.ok) {
    throw new Error('字型載入失敗');
  }

  const buffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
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

  doc.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64);
  doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
  doc.setFont('NotoSansTC', 'normal');
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

  doc.line(margin, startY + rows.length * cellHeight, margin + usableWidth, startY + rows.length * cellHeight);
  doc.save('name-generator.pdf');
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npm test -- tests/pdf-export.test.js`  
Expected: PASS，顯示 `2 passed`

- [ ] **Step 6: Commit**

```bash
git add src/pdf-export.js tests/pdf-export.test.js public/fonts/NotoSansTC-Regular.ttf
git commit -m "feat: export printable pdf"
```

## Task 6: Full Verification and Build

**Files:**
- Verify: `src/*.js`
- Verify: `tests/*.test.js`
- Verify: `public/config.json`

- [ ] **Step 1: 跑完整測試**

Run: `npm test`  
Expected: PASS，顯示所有測試通過

- [ ] **Step 2: 建置正式版**

Run: `npm run build`  
Expected: 顯示 `dist/` 產物建立成功，無 build error

- [ ] **Step 3: 啟動預覽站**

Run: `npm run preview -- --host 127.0.0.1 --port 4173`  
Expected: 顯示 `Local: http://127.0.0.1:4173/`

- [ ] **Step 4: 手動驗證**

在瀏覽器執行以下檢查：

1. 開站後文字區自動帶入 `config.json` 預設值。
2. 點「產生名字」後，表格出現 `14` 列、每列 `9` 格。
3. `126` 個名字全部不同。
4. 修改上方文字後，預覽文字同步更新。
5. 點「匯出 PDF」後，成功下載 `name-generator.pdf`。
6. 開啟 PDF，確認為 `A4 直式`、中文字正常顯示、表格未溢頁。

- [ ] **Step 5: 最終 Commit**

```bash
git add .
git commit -m "feat: deliver configurable name generator"
```

## Self-Review

Spec coverage 對照：

- 可編輯上方文字：Task 4
- `14 x 9` 表格：Task 3, Task 4
- `126` 個不重複名字：Task 2, Task 3
- `config.json` 雙字池結構：Task 1, Task 2
- `A4 直式 PDF`：Task 5
- 錯誤處理：Task 2, Task 4, Task 5

Placeholder scan：

- 無 `TODO`、`TBD`、`implement later`
- 每個命令有預期結果
- 每個程式步驟有實際檔案內容

Type consistency：

- `normalizeConfig`、`buildUniqueNames`、`chunkNames`、`setupApp`、`exportPdf` 名稱前後一致
- `pdfConfig` 結構固定為 `format`、`orientation`、`marginMm`
