export type ForceRules = {
  byCellIndex?: Record<string, number>;
};

export type ForceRuleCell = {
  cell_index: number;
  is_revealed: boolean;
  revealed_number: number | null;
};

export function normalizeForceRules(input: unknown): ForceRules {
  if (!input || typeof input !== "object") {
    return {
      byCellIndex: {},
    };
  }

  const raw = input as Record<string, unknown>;

  return {
    byCellIndex:
      raw.byCellIndex && typeof raw.byCellIndex === "object"
        ? (raw.byCellIndex as Record<string, number>)
        : {},
  };
}

export function validateForceRules({
  rules,
  cells,
  cellCount,
  minNumber = 1,
  maxNumber = 30,
}: {
  rules: ForceRules;
  cells: ForceRuleCell[];
  cellCount: number;
  minNumber?: number;
  maxNumber?: number;
}) {
  const byCellIndex = rules.byCellIndex ?? {};

  const openedCells = cells.filter((c) => c.is_revealed);
  const openedCellIndexes = new Set(openedCells.map((c) => c.cell_index));
  const usedNumbers = new Set(
    openedCells
      .map((c) => c.revealed_number)
      .filter((n): n is number => n !== null)
  );

  const reservedNumbers = new Set<number>();

  for (const [cellKey, number] of Object.entries(byCellIndex)) {
    const cellIndex = Number(cellKey);

    if (!Number.isInteger(cellIndex) || cellIndex < 1 || cellIndex > cellCount) {
      return { ok: false as const, message: `第 ${cellKey} 格不合法` };
    }

    if (!Number.isInteger(number) || number < minNumber || number > maxNumber) {
      return {
        ok: false as const,
        message: `第 ${cellIndex} 格設定的數字 ${number} 不合法`,
      };
    }

    if (openedCellIndexes.has(cellIndex)) {
      return {
        ok: false as const,
        message: `第 ${cellIndex} 格已經開過，不能修改`,
      };
    }

    if (usedNumbers.has(number)) {
      return {
        ok: false as const,
        message: `數字 ${number} 已經被開出，不能再指定`,
      };
    }

    if (reservedNumbers.has(number)) {
      return {
        ok: false as const,
        message: `數字 ${number} 在規則中重複指定`,
      };
    }

    reservedNumbers.add(number);
  }

  return { ok: true as const };
}

export function getForcedNumber({
  forceRules,
  drawOrder,
  cellIndex,
  remainingNumbers,
}: {
  forceRules: ForceRules | null | undefined;
  drawOrder: number;
  cellIndex: number;
  remainingNumbers: number[];
}) {
  const rules = normalizeForceRules(forceRules);
  const byCellIndex = rules.byCellIndex ?? {};

  const forcedByCell = byCellIndex[String(cellIndex)];
  if (
    forcedByCell !== undefined &&
    remainingNumbers.includes(forcedByCell)
  ) {
    return forcedByCell;
  }

  return null;
}

export function cleanupForceRules(input: ForceRules): ForceRules {
  const byCellIndex = Object.fromEntries(
    Object.entries(input.byCellIndex ?? {}).filter(
      ([key, value]) =>
        key.trim() !== "" &&
        Number.isInteger(Number(key)) &&
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    )
  );

  return { byCellIndex };
}