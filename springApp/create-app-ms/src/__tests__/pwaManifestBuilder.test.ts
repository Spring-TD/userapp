import { describe, expect, it } from '@jest/globals';
import { buildRuntimeManifest } from '../utils/pwaManifestBuilder';
import type { App } from '../types/app';
import type { AppPwaTemplate } from '../types/pwaTemplate';

describe('buildRuntimeManifest', () => {
  const app: App = {
    id: '69f330b2a795ac77103a6d77',
    name: 'CRBC',
    websiteUrl: 'https://crbc.example',
    alias: 'CRBC',
    description: 'App desc',
    merchantId: 'merchant_1',
    subdomain: 'crbc',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  const template: AppPwaTemplate = {
    id: 'tpl-1',
    appId: app.id,
    name: 'Classic Banking',
    category: 'BANKING',
    description: 'Classic template',
    isApplied: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    config: {
      asset: {
        logoUrl: 'https://cdn.example/logo.png',
        splashImageUrl: 'https://cdn.example/splash.png',
        siteDescription: 'Site blurb'
      },
      splash: { primaryColor: '#2563EB', secondaryColor: '#F59E0B' },
      onboarding: {
        screens: [{ title: 'Smart Banking', description: 'Welcome' }]
      },
      appProfile: { fontFamily: 'Inter', textColors: { primary: '#111' } },
      policyTerms: {
        privacyPolicy: { title: 'Privacy', contentHtml: '<p>p</p>' },
        faq: [{ q: 'one' }]
      },
      support: { contactEmail: 'help@crbc.example' },
      dns: {
        defaultAppUrl: 'https://www.crbc.tryspring.io/',
        subdomain: 'crbc',
        useCustomDomain: true,
        customDomainVerificationStatus: 'pending',
        dnsRecords: []
      }
    }
  };

  it('includes W3C fields and full app_builder config', () => {
    const manifest = buildRuntimeManifest(app, template);

    expect(manifest.name).toBe('CRBC');
    expect(manifest.description).toBe('Site blurb');
    expect(manifest.theme_color).toBe('#2563EB');
    expect(manifest.background_color).toBe('#F59E0B');
    expect(manifest.icons[0].src).toBe('https://cdn.example/logo.png');
    expect(manifest.start_url).toBe('https://www.crbc.tryspring.io/');

    expect(manifest.app_builder.schemaVersion).toBe(1);
    expect(manifest.app_builder.template.name).toBe('Classic Banking');
    expect(manifest.app_builder.template.category).toBe('BANKING');
    expect(manifest.app_builder.app.id).toBe(app.id);
    expect(manifest.app_builder.config.asset.splashImageUrl).toBe('https://cdn.example/splash.png');
    expect(manifest.app_builder.config.onboarding.screens).toHaveLength(1);
    expect(manifest.app_builder.config.appProfile.fontFamily).toBe('Inter');
    expect(manifest.app_builder.config.policyTerms.privacyPolicy?.title).toBe('Privacy');
    expect(manifest.app_builder.config.support.contactEmail).toBe('help@crbc.example');
    expect(manifest.app_builder.config.dns.subdomain).toBe('crbc');
  });

  it('always emits empty support when unset', () => {
    const sparse: AppPwaTemplate = {
      ...template,
      config: {
        asset: { logoUrl: 'https://cdn.example/logo.png' },
        splash: { primaryColor: '#2563EB' },
        onboarding: { screens: [] },
        appProfile: {},
        policyTerms: {},
        dns: { subdomain: 'crbc', dnsRecords: [] }
      } as unknown as AppPwaTemplate['config']
    };
    const manifest = buildRuntimeManifest(app, sparse);
    expect(manifest.app_builder.config).toHaveProperty('support');
    expect(manifest.app_builder.config.support).toEqual({});
    for (const key of [
      'asset',
      'splash',
      'onboarding',
      'appProfile',
      'policyTerms',
      'support',
      'dns'
    ] as const) {
      expect(manifest.app_builder.config).toHaveProperty(key);
    }
  });
});
