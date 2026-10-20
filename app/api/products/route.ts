import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import dns from 'dns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Storefront catalog is GET /api/v1/products/app/:appId (see that route). GET here requires appId
// and rewrites to the app catalog. POST create is not a storefront operation.
const PRODUCT_SERVICE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/$/, '');

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  // @ts-ignore - Node lookup signature compatibility
  lookup: (hostname: string, _options: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
});

const http = axios.create({
  timeout: 60000,
  httpsAgent: agent,
  validateStatus: () => true,
  headers: { 'Content-Type': 'application/json' },
});

function logAxiosError(prefix: string, err: unknown, url?: string) {
  const ax = err && typeof err === 'object' && 'isAxiosError' in err ? (err as import('axios').AxiosError) : null;
  const code = ax?.code ?? (err as Error)?.cause;
  const msg = (err as Error)?.message;
  console.error(`[Product API] ${prefix}:`, msg || code);
  console.error(`[Product API] ${prefix} details:`, {
    url: url ?? ax?.config?.url,
    code: code ?? 'unknown',
    message: msg,
    responseStatus: ax?.response?.status,
    responseData: ax?.response?.data ? JSON.stringify(ax.response.data).slice(0, 400) : undefined,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const { appId, type, name, description, ...rest } = body || {};
    if (!appId || !type || !name || !description) {
      return NextResponse.json(
        { success: false, error: 'appId, type, name, and description are required' },
        { status: 400 }
      );
    }

    const selectUrl = `${PRODUCT_SERVICE_URL}/api/v1/products/select-type`;

    let selectResp;
    try {
      selectResp = await http.post(selectUrl, { appId, type, ...rest }, {
        headers: { Authorization: authHeader },
      });
    } catch (err) {
      logAxiosError('select-type request failed', err, selectUrl);
      return NextResponse.json(
        { success: false, error: (err as Error)?.message || 'Product service request failed (select-type)' },
        { status: 500 }
      );
    }

    const selectData = selectResp.data;
    if (selectResp.status !== 200 || !selectData?.data?.id) {
      console.error('[Product API] select-type error:', { status: selectResp.status, data: selectData });
      // Fallback: legacy create
      const legacyUrl = `${PRODUCT_SERVICE_URL}/api/v1/products`;
      let legacyResp;
      try {
        legacyResp = await http.post(legacyUrl, { appId, type, name, description, ...rest }, {
          headers: { Authorization: authHeader },
        });
      } catch (err) {
        logAxiosError('legacy create request failed', err, legacyUrl);
        return NextResponse.json(
          { success: false, error: (err as Error)?.message || 'Product service request failed (legacy create)' },
          { status: 500 }
        );
      }
      const legacyData = legacyResp.data;
      if (legacyResp.status < 200 || legacyResp.status >= 300) {
        console.error('[Product API] legacy create error:', { status: legacyResp.status, data: legacyData });
        return NextResponse.json(
          { success: false, error: legacyData?.error || legacyData?.message || 'Failed to create product' },
          { status: legacyResp.status }
        );
      }
      return NextResponse.json(legacyData);
    }

    const productId = selectData.data.id as string;
    const createUrl = `${PRODUCT_SERVICE_URL}/api/v1/products/create-after-type`;

    let createResp;
    try {
      createResp = await http.post(createUrl, { productId, name, description }, {
        headers: { Authorization: authHeader },
      });
    } catch (err) {
      logAxiosError('create-after-type request failed', err, createUrl);
      return NextResponse.json(
        { success: false, error: (err as Error)?.message || 'Product service request failed (create-after-type)' },
        { status: 500 }
      );
    }

    const createData = createResp.data;
    if (createResp.status < 200 || createResp.status >= 300) {
      console.error('[Product API] create-after-type error:', { status: createResp.status, data: createData });
      return NextResponse.json(
        { success: false, error: createData?.error || createData?.message || 'Failed to create product' },
        { status: createResp.status }
      );
    }

    return NextResponse.json(createData);
  } catch (error: unknown) {
    console.error('[Product API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const incoming = request.nextUrl.searchParams
    const appId = incoming.get("appId")?.trim()
    if (!appId) {
      return NextResponse.json(
        { success: false, error: "appId is required — storefront catalog is GET /api/v1/products/app/{appId}" },
        { status: 400 },
      )
    }

    const pageRaw = Number(incoming.get("page") || "1")
    const limitRaw = Number(incoming.get("limit") || "20")
    const qs = new URLSearchParams()
    qs.set("page", String(Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1))
    qs.set("limit", String(Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 20))
    const type = incoming.get("type")?.trim()
    if (type && type.toLowerCase() !== "all") qs.set("type", type.toUpperCase())

    const url = `${PRODUCT_SERVICE_URL}/api/v1/products/app/${encodeURIComponent(appId)}?${qs.toString()}`

    let response;
    try {
      response = await http.get(url, {
        headers: { Authorization: authHeader },
      });
    } catch (err) {
      logAxiosError('GET products request failed', err, url);
      return NextResponse.json(
        { success: false, error: (err as Error)?.message || 'Failed to fetch products' },
        { status: 500 }
      );
    }

    const data = response.data;
    if (response.status < 200 || response.status >= 300) {
      console.error('[Product API] GET products error:', { status: response.status, data });
      return NextResponse.json(
        { success: false, error: data?.error || data?.message || 'Failed to fetch products' },
        { status: response.status }
      );
    }

    try {
      console.log('[Product API] GET products upstream response:', JSON.stringify(data).slice(0, 4000));
    } catch {
      console.log('[Product API] GET products upstream response (non-JSON body)');
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[Product API] GET products unexpected error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
