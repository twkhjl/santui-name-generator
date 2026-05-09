export const NAMES_PER_PAGE = 126;

function shuffle(items, randomFn) {
  const list = [...items];

  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

export function buildUniqueNames(config, randomFn = Math.random, total = NAMES_PER_PAGE) {
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
    if (result.length >= total) {
      break;
    }

    result.push(name);
    used.add(name);
  }

  if (result.length < total) {
    throw new Error(`可用化名不足 ${total} 個`);
  }

  return shuffle(result.slice(0, total), randomFn);
}

export function chunkNames(names, rowCount = 14, columnCount = 9) {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from(
      { length: columnCount },
      (_, columnIndex) => names[rowIndex * columnCount + columnIndex]
    )
  );
}

export function chunkPages(names, pageSize = NAMES_PER_PAGE) {
  return Array.from({ length: Math.ceil(names.length / pageSize) }, (_, pageIndex) =>
    names.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  );
}
