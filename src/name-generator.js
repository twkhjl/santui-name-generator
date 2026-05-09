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
    Array.from(
      { length: columnCount },
      (_, columnIndex) => names[rowIndex * columnCount + columnIndex]
    )
  );
}
