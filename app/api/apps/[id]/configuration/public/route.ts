import { NextRequest, NextResponse } from 'next/server';

import { getApiUpstreamBase } from '@/lib/server/apiUpstreamBase';
import { fetchUpstream } from '@/lib/server/upstreamFetch';
import {
    applyManifestToMobileAppConfig,
    emptyMobileShellConfig,
    parseWebAppManifestBranding,
} from '@/lib/webAppManifest';

const API_UPSTREAM_BASE = getApiUpstreamBase();

/**
 * Legacy public mobile config.
 * Storefront splash/onboarding should use resolve `pwaManifest`.
 * This route now maps the same PWA/app_builder payload instead of dummy mortgage copy.
 *
 * GET /api/apps/[id]/configuration/public
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: appId } = await params;
        const shell = emptyMobileShellConfig(appId);

        const [legacyConfig, pwaManifest] = await Promise.all([
            fetchLegacyConfiguration(appId),
            fetchPwaManifest(appId),
        ]);

        const fromLegacy = legacyConfig ? transformToMobileConfig(appId, legacyConfig) : shell;
        const mobileConfig = applyManifestToMobileAppConfig(fromLegacy, pwaManifest, null);

        return NextResponse.json({
            success: true,
            data: mobileConfig,
        });
    } catch (error) {
        console.error('Error fetching public configuration:', error);
        return NextResponse.json({
            success: true,
            data: emptyMobileShellConfig(null),
        });
    }
}

async function fetchLegacyConfiguration(appId: string): Promise<Record<string, unknown> | null> {
    try {
        const response = await fetchUpstream(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/configuration`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) return null;
        const data = await response.json();
        const payload = data?.data || data;
        return payload && typeof payload === 'object' ? payload : null;
    } catch {
        return null;
    }
}

async function fetchPwaManifest(appId: string) {
    try {
        const response = await fetchUpstream(
            `${API_UPSTREAM_BASE}/api/v1/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`,
            {
                method: 'GET',
                headers: { Accept: 'application/manifest+json, application/json, */*' },
            },
        );
        if (!response.ok) return null;
        const json = await response.json();
        return parseWebAppManifestBranding(json);
    } catch {
        return null;
    }
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | undefined {
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** Old appElements / onboarding.splashN shape — only used if present. */
function transformToMobileConfig(appId: string, config: Record<string, unknown>) {
    const appElements = asRecord(config.appElements) || {};
    const onboarding = asRecord(config.onboarding) || {};
    const bg = asRecord(onboarding.backgroundColors) || {};
    const text = asRecord(onboarding.textColors) || {};
    const buttons = asRecord(appElements.buttons) || {};
    const header = asRecord(appElements.header) || {};
    const body = asRecord(appElements.body) || {};
    const splash1 = asRecord(onboarding.splash1);
    const splash2 = asRecord(onboarding.splash2);
    const splash3 = asRecord(onboarding.splash3);

    const steps = [splash1, splash2, splash3]
        .map((s, i) => {
            if (!s) return null;
            const title = asString(s.title);
            const description = asString(s.subtitle) || asString(s.description);
            const image = asString(s.image);
            if (!title && !description && !image) return null;
            return {
                id: `step-${i + 1}`,
                title: title || `Step ${i + 1}`,
                description: description || '',
                image,
            };
        })
        .filter(Boolean);

    const base = emptyMobileShellConfig(asString(config.appId) || appId);
    return {
        ...base,
        appName: asString(config.name) || base.appName,
        splash: {
            ...base.splash,
            logo: asString(appElements.logo),
            backgroundColor: asString(bg.primary) || asString(buttons.primaryColor) || base.splash.backgroundColor,
            textColor: asString(text.primary) || base.splash.textColor,
        },
        onboarding: {
            ...base.onboarding,
            backgroundColor: asString(bg.primary) || base.onboarding.backgroundColor,
            secondaryBackgroundColor: asString(bg.secondary) || base.onboarding.secondaryBackgroundColor,
            textColor: asString(text.primary) || base.onboarding.textColor,
            secondaryTextColor: asString(text.secondary) || base.onboarding.secondaryTextColor,
            buttonColor: asString(buttons.primaryColor) || base.onboarding.buttonColor,
            fontFamily: asString(onboarding.fontFamily) || base.onboarding.fontFamily,
            steps: steps as NonNullable<typeof steps[number]>[],
        },
        theme: {
            ...base.theme,
            primaryColor: asString(buttons.primaryColor) || base.theme.primaryColor,
            secondaryColor: asString(buttons.secondaryColor) || base.theme.secondaryColor,
            headerBackgroundColor: asString(header.backgroundColor) || base.theme.headerBackgroundColor,
            headerTextColor: asString(header.textColor) || base.theme.headerTextColor,
            bodyBackgroundColor: asString(body.backgroundColor) || base.theme.bodyBackgroundColor,
            bodyTextColor: asString(body.textColor) || base.theme.bodyTextColor,
        },
    };
}
