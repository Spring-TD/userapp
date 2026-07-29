import {
  calculateCommodityFlatInterest,
  commodityMinQuantity,
  commodityUnitPrice,
  computeMaturityDate,
  isMoratoriumEnded,
  resolveCommodityPurchaseAmount
} from '../utils/commodityPricing';
import type { Product } from '../types/product';

function commodityProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'commodity-1',
    referenceNumber: 'PRD-1',
    name: 'Fortress Commodity',
    description: '',
    type: 'COMMODITY',
    appId: 'app-1',
    isActive: true,
    price: 23,
    structure: {
      unitAmount: 23,
      minQuantityPurchase: 1,
      offerYieldEnabled: true,
      offerYield: 10,
      moratorium: { value: 3, unit: 'month' }
    },
    ...overrides
  } as Product;
}

describe('commodityPricing', () => {
  it('computes unit price from structure.unitAmount', () => {
    expect(commodityUnitPrice(commodityProduct())).toBe(23);
  });

  it('computes amount = unitPrice × quantity', () => {
    const result = resolveCommodityPurchaseAmount(commodityProduct(), 5);
    expect(result.amount).toBe(115);
    expect(result.selection).toMatchObject({ unitPrice: 23, quantity: 5, total: 115 });
  });

  it('calculates flat interest as percent of principal', () => {
    expect(calculateCommodityFlatInterest(100, commodityProduct())).toBe(10);
  });

  it('computes maturity date from moratorium months', () => {
    const fundedAt = new Date('2026-01-15T12:00:00.000Z');
    const maturity = computeMaturityDate(fundedAt, commodityProduct());
    expect(maturity.toISOString().slice(0, 10)).toBe('2026-04-15');
  });

  it('blocks withdrawal before moratorium ends', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isMoratoriumEnded(future)).toBe(false);
  });

  it('enforces minimum quantity', () => {
    const product = commodityProduct({
      structure: { unitAmount: 10, minQuantityPurchase: 3 }
    });
    expect(commodityMinQuantity(product)).toBe(3);
    expect(() => resolveCommodityPurchaseAmount(product, 2)).toThrow(/at least 3/);
  });
});
