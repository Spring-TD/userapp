import {
  hasAppIdQuery,
  isExternalApplicationServicingRoute,
  isGetUnscopedProductCatalog,
  rewriteUnscopedCatalogPath
} from '../utils/productGatewayRoute';
import { isUserWalletReadRoute, isWalletReadRoute } from '../utils/walletGatewayRoute';

describe('product gateway route helpers', () => {
  it('treats GET /api/v1/products with appId as a dashboard list, not the keyed catalog', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/products',
      query: { appId: '69f3a1d69e4799ddb4decdfb', page: '1', limit: '20', status: 'active' },
      url: '/api/v1/products?appId=69f3a1d69e4799ddb4decdfb&page=1&limit=20&status=active'
    };

    expect(hasAppIdQuery(req)).toBe(true);
    expect(isGetUnscopedProductCatalog(req)).toBe(false);
  });

  it('still treats GET /api/v1/products without appId as the keyed catalog', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/products',
      query: {},
      url: '/api/v1/products'
    };

    expect(hasAppIdQuery(req)).toBe(false);
    expect(isGetUnscopedProductCatalog(req)).toBe(true);
  });

  it('preserves type/page/limit when rewriting unscoped catalog to /catalog', () => {
    expect(rewriteUnscopedCatalogPath('/api/v1/products')).toBe('/api/v1/products/catalog');
    expect(rewriteUnscopedCatalogPath('/api/v1/products?type=LOAN&page=1&limit=20')).toBe(
      '/api/v1/products/catalog?type=LOAN&page=1&limit=20'
    );
  });

  it('requires keys for integrator application servicing routes', () => {
    const base = '/api/v1/products/external-applications/665f1c2e9b1d4a0012ab34cd';
    expect(isExternalApplicationServicingRoute(base, 'GET')).toBe(true);
    expect(isExternalApplicationServicingRoute(`${base}/offer`, 'GET')).toBe(true);
    expect(isExternalApplicationServicingRoute(`${base}/offer`, 'POST')).toBe(true);
    expect(isExternalApplicationServicingRoute(`${base}/account`, 'GET')).toBe(true);
    expect(isExternalApplicationServicingRoute(`${base}/repayment-schedule?x=1`, 'GET')).toBe(true);
  });

  it('does not treat other application routes as integrator servicing routes', () => {
    const base = '/api/v1/products/external-applications/665f1c2e9b1d4a0012ab34cd';
    expect(isExternalApplicationServicingRoute('/api/v1/products/external-applications', 'GET')).toBe(false);
    expect(isExternalApplicationServicingRoute(base, 'POST')).toBe(false);
    expect(isExternalApplicationServicingRoute(`${base}/account`, 'POST')).toBe(false);
    expect(isExternalApplicationServicingRoute(`${base}/disburse`, 'GET')).toBe(false);
    expect(
      isExternalApplicationServicingRoute('/api/v1/products/applications/665f1c2e9b1d4a0012ab34cd', 'GET')
    ).toBe(false);
  });

  it('requires keys for merchant and user wallet read routes', () => {
    const mid = 'merch_abc';
    expect(isWalletReadRoute(`/api/v1/wallets/merchant/${mid}/all`, 'GET')).toBe(true);
    expect(isWalletReadRoute(`/api/v1/wallets/merchant/${mid}/type/TREASURY`, 'GET')).toBe(true);
    expect(isWalletReadRoute(`/api/v1/wallets/treasury/${mid}/transactions`, 'GET')).toBe(true);
    expect(isWalletReadRoute(`/api/v1/wallets/billing/${mid}/transactions`, 'GET')).toBe(true);
    expect(isWalletReadRoute(`/api/v1/wallets/repayment/${mid}/transactions`, 'GET')).toBe(true);
    expect(isUserWalletReadRoute('/api/v1/wallets/user/user_1', 'GET')).toBe(true);
    expect(isUserWalletReadRoute('/api/v1/wallets/user/user_1/transactions', 'GET')).toBe(true);
  });

  it('does not treat wallet writes or unrelated user paths as wallet reads', () => {
    expect(isWalletReadRoute('/api/v1/wallets/merchant/merch_abc/all', 'POST')).toBe(false);
    expect(isWalletReadRoute('/api/v1/wallets/commodity/principal-repayment', 'POST')).toBe(false);
    expect(isUserWalletReadRoute('/api/v1/wallets/user/user_1/balance', 'GET')).toBe(false);
    expect(isUserWalletReadRoute('/api/v1/wallets/user/user_1/transfer', 'GET')).toBe(false);
  });
});
