declare module 'morgan' {
  import { Handler } from 'express';
  
  interface Morgan {
    (format: string): Handler;
    (format: string, options: any): Handler;
  }
  
  const morgan: Morgan;
  export = morgan;
}