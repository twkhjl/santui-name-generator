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
