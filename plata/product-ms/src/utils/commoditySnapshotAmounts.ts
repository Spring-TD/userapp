/**
 * Best-effort extraction from `UserProductApplication.contractSnapshot` for COMMODITY rows.
 * Field names vary by client; first positive match wins (major currency units).
 */

function toNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function firstPositive(...values: unknown[]): number {
  for (const v of values) {
    const n = toNonNegativeNumber(v);
    if (n != null && n > 0) {
      return n;
    }
  }
  return 0;
}

/** Current value of commodity inventory held. */
export function extractInventoryFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.inventoryAmount,
    s.inventoryValue,
    s.totalInventoryValue,
    s.stockValue,
    s.carryingValue
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.inventoryAmount,
      effective.inventoryValue,
      effective.totalInventoryValue,
      effective.stockValue
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(
      structure.inventoryAmount,
      structure.inventoryValue,
      structure.totalInventoryValue
    );
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}

/** Gross income generated from commodity sales. */
export function extractSalesFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.salesAmount,
    s.totalSales,
    s.grossSales,
    s.grossIncome,
    s.revenue
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.salesAmount,
      effective.totalSales,
      effective.grossSales,
      effective.grossIncome,
      effective.revenue
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(
      structure.salesAmount,
      structure.totalSales,
      structure.grossSales,
      structure.revenue
    );
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}

/** Cost of goods sold (COGS): acquisition cost for units sold. */
export function extractCostOfGoodsSoldFromContractSnapshot(
  snapshot: Record<string, unknown> | undefined
): number {
  if (!snapshot) {
    return 0;
  }

  const s = snapshot;
  const direct = firstPositive(
    s.costOfGoodsSold,
    s.cogs,
    s.totalCOGS,
    s.totalCostOfGoodsSold,
    s.costSpentOnSoldGoods
  );
  if (direct > 0) {
    return direct;
  }

  const effective = asRecord(s.effective);
  if (effective) {
    const fromEff = firstPositive(
      effective.costOfGoodsSold,
      effective.cogs,
      effective.totalCOGS,
      effective.totalCostOfGoodsSold
    );
    if (fromEff > 0) {
      return fromEff;
    }
  }

  const structure = asRecord(s.structure);
  if (structure) {
    const fromStruct = firstPositive(
      structure.costOfGoodsSold,
      structure.cogs,
      structure.totalCOGS
    );
    if (fromStruct > 0) {
      return fromStruct;
    }
  }

  return 0;
}
