export type AppPwaPublishStatus = 'pending' | 'published' | 'failed';

export interface RuntimeManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface RuntimeManifest {
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  scope: string;
  display: 'standalone';
  theme_color: string;
  background_color: string;
  icons: RuntimeManifestIcon[];
}

export interface ServiceWorkerMeta {
  version: string;
  hash: string;
  path: string;
  contentType: 'application/javascript';
}

export interface AppPwaPublishArtifactUrls {
  manifestUrl: string;
  serviceWorkerUrl: string;
  pwaEntryUrl: string;
}

export interface AppPwaPublish {
  id: string;
  appId: string;
  templateId: string;
  version: string;
  manifest: RuntimeManifest;
  serviceWorkerMeta: ServiceWorkerMeta;
  artifactUrls: AppPwaPublishArtifactUrls;
  status: AppPwaPublishStatus;
  warnings: string[];
  errors: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface PublishPwaRequest {
  templateId?: string;
  publishMode?: 'apply-and-publish';
}

/** Result of a best-effort publish after template save (does not fail the save). */
export interface PwaAutoPublishResult {
  published: boolean;
  publishId?: string;
  version?: string;
  manifestUrl?: string;
  serviceWorkerUrl?: string;
  pwaEntryUrl?: string;
  publishedAt?: string;
  validationErrors?: string[];
  skippedReason?: string;
}

/** Public storefront hints when a PWA has been published (no auth). */
export interface PublicPwaInstallBundle {
  manifestUrl: string;
  serviceWorkerUrl: string;
  pwaEntryUrl: string;
  version: string;
}

