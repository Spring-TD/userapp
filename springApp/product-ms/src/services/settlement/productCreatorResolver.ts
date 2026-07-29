import { ProductModel } from '../../models/ProductModel';
import { fetchPlataCatalogProductById } from './plataGatewayClient';

export type ProductCreatorContext = {
  creatorMerchantId: string;
  creatorAppId?: string;
  upstreamProductId?: string;
};

/** Resolves Backend-platter / Plata product creator merchant from a Spring catalog product. */
export async function resolveProductCreatorMerchant(productId: string): Promise<ProductCreatorContext | null> {
  const product = await ProductModel.findById(productId);
  if (!product) return null;

  let creatorMerchantId = (product.merchant as { id?: string } | undefined)?.id?.trim() || '';
  let creatorAppId = product.upstreamAppId?.trim() || undefined;
  const upstreamProductId = product.upstreamProductId?.trim() || undefined;

  if (!creatorMerchantId && upstreamProductId) {
    const catalog = await fetchPlataCatalogProductById(upstreamProductId);
    creatorMerchantId = catalog?.merchant?.id?.trim() || '';
    if (!creatorAppId && catalog?.appId) {
      creatorAppId = catalog.appId.trim();
    }
  }

  if (!creatorMerchantId) return null;
  return { creatorMerchantId, creatorAppId, upstreamProductId };
}
