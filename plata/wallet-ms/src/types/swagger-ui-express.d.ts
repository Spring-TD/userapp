declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  export interface SwaggerUiOptions {
    explorer?: boolean;
    customCss?: string;
    customSiteTitle?: string;
  }

  export const serve: RequestHandler[];
  export function setup(
    swaggerDoc: object,
    options?: SwaggerUiOptions
  ): RequestHandler;
}
