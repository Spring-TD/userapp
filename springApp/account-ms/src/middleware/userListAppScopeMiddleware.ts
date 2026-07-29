import { NextFunction, Request, Response } from 'express';

const MONGO_OBJECT_ID = /[a-f0-9]{24}/i;

function firstHeaderValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return firstQueryValue(value[0]);
  }
  return typeof value === 'string' ? value.trim() : '';
}

function extractAppIdFromReferer(referer: string): string | undefined {
  const match = referer.match(/\/apps\/([a-f0-9]{24})(?:\/|$|\?)/i);
  return match?.[1];
}

function resolveAppId(req: Request): string {
  const fromQuery =
    firstQueryValue(req.query.appId) ||
    firstQueryValue(req.query.app_id) ||
    firstQueryValue(req.query.applicationId);

  if (fromQuery && MONGO_OBJECT_ID.test(fromQuery)) {
    return fromQuery;
  }

  const fromHeader =
    firstHeaderValue(req.headers['x-app-id']) ||
    firstHeaderValue(req.headers['x-selected-app-id']) ||
    firstHeaderValue(req.headers['x-dashboard-app-id']) ||
    firstHeaderValue(req.headers['x-tenant-app-id']);

  if (fromHeader && MONGO_OBJECT_ID.test(fromHeader)) {
    return fromHeader;
  }

  const referer =
    firstHeaderValue(req.headers.referer) || firstHeaderValue(req.headers.referrer);
  const fromReferer = referer ? extractAppIdFromReferer(referer) : undefined;
  return fromReferer && MONGO_OBJECT_ID.test(fromReferer) ? fromReferer : '';
}

/**
 * Merchant dashboard calls `/api/v1/user/list` from a page that already selected an app.
 * Inject `appId` into the proxied query when it is present in headers or `/apps/{appId}` referer.
 */
export function userListAppScopeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const isUserList = req.method === 'GET' && (req.path === '/list' || req.url.startsWith('/list'));
  if (!isUserList) {
    next();
    return;
  }

  const existingAppId =
    firstQueryValue(req.query.appId) ||
    firstQueryValue(req.query.app_id) ||
    firstQueryValue(req.query.applicationId);

  if (existingAppId) {
    next();
    return;
  }

  const appId = resolveAppId(req);
  if (!appId) {
    next();
    return;
  }

  req.query.appId = appId;
  const separator = req.url.includes('?') ? '&' : '?';
  req.url = `${req.url}${separator}appId=${encodeURIComponent(appId)}`;
  next();
}
