import {
  commodityMinQuantity,
  commodityUnitPrice,
  resolveCommodityPurchaseAmount
} from '../utils/commodityPricing';
import type { Product } from '../types/product';

const baseCommodity = {
  id: 'commodity-1',
  referenceNumber: 'COMM-1',
  name: 'Corn (per bag)',
  description: '',
  type: 'COMMODITY',
  appId: 'app-1',
  isActive: true,
  unitOfMeasure: 'bag',
  structure: { unitAmount: 100, minQuantityPurchase: 1 },
  price: 100
} as Product;

describe('Commodity quantity → total computation', () => {
  it('computes amount = unitPrice × quantity and builds commoditySelection', () => {
    const result = resolveCommodityPurchaseAmount(baseCommodity, 5);
    expect(result.amount).toBe(500);
    expect(result.selection).toEqual({
      unitPrice: 100,
      quantity: 5,
      total: 500,
      unitOfMeasure: 'bag'
    });
  });

  it('defaults to the minimum purchase quantity when quantity is omitted', () => {
    const product = {
      ...baseCommodity,
      structure: { unitAmount: 250, minQuantityPurchase: 2 }
    } as Product;
    const result = resolveCommodityPurchaseAmount(product);
    expect(result.amount).toBe(500);
    expect(result.selection).toMatchObject({ quantity: 2, total: 500 });
  });

  it('falls back to product.price when structure.unitAmount is absent', () => {
    const product = {
      ...baseCommodity,
      structure: { minQuantityPurchase: 1 },
      price: 75
    } as Product;
    const result = resolveCommodityPurchaseAmount(product, 4);
    expect(result.amount).toBe(300);
    expect(commodityUnitPrice(product)).toBe(75);
  });

  it('rejects a quantity below the minimum purchase quantity', () => {
    const product = {
      ...baseCommodity,
      structure: { unitAmount: 100, minQuantityPurchase: 3 }
    } as Product;
    expect(() => resolveCommodityPurchaseAmount(product, 1)).toThrow(/at least 3/);
    expect(commodityMinQuantity(product)).toBe(3);
  });

  it('rejects a commodity that has no unit price configured', () => {
    const product = {
      ...baseCommodity,
      structure: { minQuantityPurchase: 1 },
      price: undefined
    } as Product;
    expect(() => resolveCommodityPurchaseAmount(product, 2)).toThrow(/unit price/);
  });
});
