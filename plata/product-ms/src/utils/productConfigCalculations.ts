import type {
  CommodityPriceEntry,
  Product,
  ProductAmountProjection,
  ProductConfigCalculations
} from '../types/product';

type NumericRange = {
  min?: number;
  max?: number;
};

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value.replace(/,/g, '').replace(/%/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parsePositiveNumber(value: unknown): number | undefined {
  const parsed = parseNumber(value);
  if (parsed === undefined || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function parseTenureMonths(value: unknown): number | undefined {
  const direct = parsePositiveNumber(value);
  if (direct !== undefined) {
    return direct;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const rawValue = parsePositiveNumber(record.value);
  if (rawValue === undefined) {
    return undefined;
  }
  const unit = String(record.unit ?? record.type ?? 'month').toLowerCase();

  if (unit.startsWith('year')) {
    return rawValue * 12;
  }
  if (unit.startsWith('week')) {
    return rawValue / 4.345;
  }
  if (unit.startsWith('day')) {
    return rawValue / 30;
  }
  if (unit === 'none' || unit === 'open') {
    return undefined;
  }
  return rawValue;
}

function projectionFromSimpleAnnualRate(
  principal: number,
  annualRatePercent?: number,
  tenureMonths?: number,
  periodicDivisor?: number
): ProductAmountProjection {
  const normalizedRate = annualRatePercent ?? 0;
  const normalizedTenureMonths = tenureMonths ?? 12;
  const interest = principal * (normalizedRate / 100) * (normalizedTenureMonths / 12);
  const total = principal + interest;

  return {
    principal,
    projectedInterestOrYield: interest,
    projectedTotalValue: total,
    projectedPeriodicPayment:
      periodicDivisor && periodicDivisor > 0 ? total / periodicDivisor : normalizedTenureMonths > 0 ? total / normalizedTenureMonths : undefined
  };
}

function parseRepaymentFrequencyPeriods(tenureMonths: number | undefined, frequency: string | undefined): number | undefined {
  if (tenureMonths === undefined || tenureMonths <= 0 || !frequency) {
    return undefined;
  }

  const key = frequency.toLowerCase();
  if (key === 'daily') {
    return tenureMonths * 30;
  }
  if (key === 'monthly') {
    return tenureMonths;
  }
  if (key === 'quarterly') {
    return tenureMonths / 3;
  }
  if (key === 'bi-annually' || key === 'biannually' || key === 'bi annually') {
    return tenureMonths / 6;
  }
  if (key === 'annually') {
    return tenureMonths / 12;
  }
  return undefined;
}

function getAmountRange(product: Product): NumericRange {
  const structure = product.structure;
  if (!structure) {
    return {};
  }

  if (product.type === 'LOAN' || product.type === 'MORTGAGE') {
    return {
      min: parsePositiveNumber(structure.loanAmount?.min),
      max: parsePositiveNumber(structure.loanAmount?.max)
    };
  }

  if (product.type === 'SAVINGS') {
    return {
      min: parsePositiveNumber(structure.savingsAmount?.min),
      max: parsePositiveNumber(structure.savingsAmount?.max)
    };
  }

  if (product.type === 'INVESTMENT') {
    return {
      min: parsePositiveNumber(structure.investmentAmount?.min),
      max: parsePositiveNumber(structure.investmentAmount?.max)
    };
  }

  return {};
}

function calculateFees(product: Product, principal: number): number {
  const fees = product.feesAndCharges?.fees ?? [];
  return fees.reduce((sum, fee) => {
    const value = parsePositiveNumber(fee.value);
    if (value === undefined) {
      return sum;
    }
    const feeType = String(fee.feeType ?? '').toLowerCase();
    if (feeType === 'percent' || feeType === 'percentage') {
      return sum + (principal * value) / 100;
    }
    return sum + value;
  }, 0);
}

function calculateLoanOrMortgage(product: Product): ProductConfigCalculations {
  const amountRange = getAmountRange(product);
  const interestRate = parsePositiveNumber(product.structure?.interestRate);
  const tenureMonths = parseTenureMonths(product.about?.tenure ?? product.structure?.moratorium);
  const repaymentFrequency = product.structure?.repaymentFrequency;
  const periods = parseRepaymentFrequencyPeriods(tenureMonths, repaymentFrequency);

  const calculations: ProductConfigCalculations = {
    basis: {
      type: product.type,
      tenureMonths,
      annualRatePercent: interestRate,
      repaymentFrequency
    }
  };

  if (amountRange.min !== undefined || amountRange.max !== undefined) {
    calculations.projections = {};
    calculations.fees = {};
  }

  if (amountRange.min !== undefined) {
    calculations.projections!.minimum = projectionFromSimpleAnnualRate(amountRange.min, interestRate, tenureMonths, periods);
    calculations.fees!.minimum = calculateFees(product, amountRange.min);
  }
  if (amountRange.max !== undefined) {
    calculations.projections!.maximum = projectionFromSimpleAnnualRate(amountRange.max, interestRate, tenureMonths, periods);
    calculations.fees!.maximum = calculateFees(product, amountRange.max);
  }

  if (product.type === 'MORTGAGE') {
    const equityContributionPercent = parsePositiveNumber(product.equityContribution);
    const propertyValue = parsePositiveNumber(product.propertyValue);
    const downPayment =
      equityContributionPercent !== undefined && propertyValue !== undefined
        ? (propertyValue * equityContributionPercent) / 100
        : undefined;

    calculations.mortgage = {
      equityContributionPercent,
      propertyValue,
      estimatedDownPayment: downPayment,
      estimatedFinancedAmount:
        propertyValue !== undefined && downPayment !== undefined ? propertyValue - downPayment : undefined
    };
  }

  return calculations;
}

function calculateSavings(product: Product): ProductConfigCalculations {
  const amountRange = getAmountRange(product);
  const annualRatePercent = parsePositiveNumber(product.structure?.interestRate);
  const tenureMonths = parseTenureMonths(product.about?.duration);

  const calculations: ProductConfigCalculations = {
    basis: {
      type: product.type,
      tenureMonths,
      annualRatePercent
    },
    savings: {
      savingsType: product.structure?.savingsType,
      withdrawalFlexibility: product.structure?.withdrawalFlexibility
    }
  };

  if (amountRange.min !== undefined || amountRange.max !== undefined) {
    calculations.projections = {};
    calculations.fees = {};
  }

  if (amountRange.min !== undefined) {
    calculations.projections!.minimum = projectionFromSimpleAnnualRate(amountRange.min, annualRatePercent, tenureMonths);
    calculations.fees!.minimum = calculateFees(product, amountRange.min);
  }
  if (amountRange.max !== undefined) {
    calculations.projections!.maximum = projectionFromSimpleAnnualRate(amountRange.max, annualRatePercent, tenureMonths);
    calculations.fees!.maximum = calculateFees(product, amountRange.max);
  }

  return calculations;
}

function parseInvestmentUnitAmount(value: Product['structure'] extends { unitAmount?: infer U } ? U : unknown): {
  unitPrice?: number;
  minimumUnits?: number;
} {
  if (typeof value === 'number' || typeof value === 'string') {
    return { unitPrice: parsePositiveNumber(value) };
  }
  const record = asRecord(value);
  if (!record) {
    return {};
  }
  return {
    unitPrice: parsePositiveNumber(record.amount),
    minimumUnits: parsePositiveNumber(record.minQuantity)
  };
}

function calculateInvestment(product: Product): ProductConfigCalculations {
  const amountRange = getAmountRange(product);
  const annualRatePercent = parsePositiveNumber(product.structure?.returnsOnInvestment);
  const tenureMonths = parseTenureMonths(product.about?.duration);
  const unitAmount = parseInvestmentUnitAmount(product.structure?.unitAmount);

  const calculations: ProductConfigCalculations = {
    basis: {
      type: product.type,
      tenureMonths,
      annualRatePercent
    },
    investment: {
      unitPrice: unitAmount.unitPrice,
      minimumUnits: unitAmount.minimumUnits,
      minimumTicketSize:
        unitAmount.unitPrice !== undefined && unitAmount.minimumUnits !== undefined
          ? unitAmount.unitPrice * unitAmount.minimumUnits
          : undefined
    }
  };

  if (amountRange.min !== undefined || amountRange.max !== undefined) {
    calculations.projections = {};
    calculations.fees = {};
  }

  if (amountRange.min !== undefined) {
    calculations.projections!.minimum = projectionFromSimpleAnnualRate(amountRange.min, annualRatePercent, tenureMonths);
    calculations.fees!.minimum = calculateFees(product, amountRange.min);
  }
  if (amountRange.max !== undefined) {
    calculations.projections!.maximum = projectionFromSimpleAnnualRate(amountRange.max, annualRatePercent, tenureMonths);
    calculations.fees!.maximum = calculateFees(product, amountRange.max);
  }

  return calculations;
}

function parseCommodityPrices(entries: CommodityPriceEntry[] | undefined): {
  recentPrice?: number;
  averageHistoricalPrice?: number;
  lowestHistoricalPrice?: number;
  highestHistoricalPrice?: number;
} {
  if (!entries || entries.length === 0) {
    return {};
  }
  const prices = entries
    .map((entry) => parsePositiveNumber(entry.price))
    .filter((price): price is number => price !== undefined);
  if (prices.length === 0) {
    return {};
  }

  const sum = prices.reduce((acc, value) => acc + value, 0);
  return {
    recentPrice: prices[prices.length - 1],
    averageHistoricalPrice: sum / prices.length,
    lowestHistoricalPrice: Math.min(...prices),
    highestHistoricalPrice: Math.max(...prices)
  };
}

function calculateCommodity(product: Product): ProductConfigCalculations {
  const unitPrice = parsePositiveNumber(product.structure?.unitAmount) ?? parsePositiveNumber(product.price);
  const minimumQuantity =
    parsePositiveNumber(product.structure?.minQuantityPurchase) ?? parsePositiveNumber(product.minimumQuantity);
  const offerYieldPercent = product.structure?.offerYieldEnabled
    ? parsePositiveNumber(product.structure.offerYield)
    : undefined;
  const historical = parseCommodityPrices(product.commodityPrices);
  const projectedUnitPriceWithYield =
    unitPrice !== undefined && offerYieldPercent !== undefined ? unitPrice * (1 + offerYieldPercent / 100) : undefined;
  const projectedGrossMarginPerUnit =
    projectedUnitPriceWithYield !== undefined && unitPrice !== undefined ? projectedUnitPriceWithYield - unitPrice : undefined;

  return {
    basis: {
      type: product.type,
      annualRatePercent: offerYieldPercent
    },
    commodity: {
      unitPrice,
      minimumQuantity,
      estimatedMinimumNotional:
        unitPrice !== undefined && minimumQuantity !== undefined ? unitPrice * minimumQuantity : undefined,
      offerYieldPercent,
      projectedUnitPriceWithYield,
      recentPrice: historical.recentPrice,
      averageHistoricalPrice: historical.averageHistoricalPrice,
      lowestHistoricalPrice: historical.lowestHistoricalPrice,
      highestHistoricalPrice: historical.highestHistoricalPrice,
      projectedGrossMarginPerUnit,
      projectedGrossMarginPercent:
        projectedGrossMarginPerUnit !== undefined && unitPrice !== undefined && unitPrice > 0
          ? (projectedGrossMarginPerUnit / unitPrice) * 100
          : undefined
    }
  };
}

export function computeProductConfigCalculations(product: Product): ProductConfigCalculations {
  if (product.type === 'LOAN' || product.type === 'MORTGAGE') {
    return calculateLoanOrMortgage(product);
  }
  if (product.type === 'SAVINGS') {
    return calculateSavings(product);
  }
  if (product.type === 'INVESTMENT') {
    return calculateInvestment(product);
  }
  return calculateCommodity(product);
}
