import path from 'path';
import fs from 'fs';

const openApiPath = path.join(__dirname, '..', '..', 'openapi.json');
const fallbackSpec = {
  openapi: '3.0.0',
  info: {
    title: 'wallet-ms',
    version: '1.0.0'
  },
  paths: {}
};

const spec = fs.existsSync(openApiPath)
  ? JSON.parse(fs.readFileSync(openApiPath, 'utf-8'))
  : fallbackSpec;

export default spec;
