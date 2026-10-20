import storefrontMaturityWithdrawSpec from '../openapi/storefrontMaturityWithdrawSpec';

describe('storefrontMaturityWithdrawSpec', () => {
  it('exports OpenAPI 3 with savings, investment, and commodity withdraw paths', () => {
    expect(storefrontMaturityWithdrawSpec.openapi).toBe('3.0.0');
    expect(storefrontMaturityWithdrawSpec.paths).toHaveProperty(
      '/api/v1/savings-accounts/{applicationId}/withdraw'
    );
    expect(storefrontMaturityWithdrawSpec.paths).toHaveProperty(
      '/api/v1/investment-accounts/{applicationId}/withdraw'
    );
    expect(storefrontMaturityWithdrawSpec.paths).toHaveProperty(
      '/api/v1/commodity-accounts/{applicationId}/withdraw'
    );
  });

  it('requires userId on withdraw request bodies', () => {
    const savings =
      storefrontMaturityWithdrawSpec.paths['/api/v1/savings-accounts/{applicationId}/withdraw'].post;
    expect(savings?.requestBody).toBeDefined();
    const schema =
      savings?.requestBody?.content?.['application/json']?.schema;
    expect(schema).toEqual({ $ref: '#/components/schemas/MaturityWithdrawRequest' });
    expect(storefrontMaturityWithdrawSpec.components.schemas.MaturityWithdrawRequest.required).toContain(
      'userId'
    );
  });
});
