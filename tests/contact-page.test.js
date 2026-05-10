import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readProjectFile(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('contact page', () => {
  it('首頁有連到聯絡我們頁面', () => {
    const indexHtml = readProjectFile('index.html');

    expect(indexHtml).toContain('contact.html');
    expect(indexHtml).toContain('聯絡我們');
  });

  it('聯絡我們頁面存在且保留 email placeholder', () => {
    const contactHtml = readProjectFile('contact.html');

    expect(contactHtml).toContain('聯絡我們');
    expect(contactHtml).toContain('your-email@example.com');
  });
});
