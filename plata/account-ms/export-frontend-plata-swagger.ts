import fs from 'fs';
import path from 'path';
import frontendPlataSpec from './src/config/frontendPlataSwagger';

const dir = __dirname;
const outPath = path.join(dir, 'frontend-plata-openapi.json');
const tmpPath = path.join(dir, 'frontend-plata-openapi.json.tmp');
const content = JSON.stringify(frontendPlataSpec, null, 2);
fs.writeFileSync(tmpPath, content, 'utf-8');
try {
  fs.renameSync(tmpPath, outPath);
  console.log('Written to', outPath);
} catch {
  console.log('Written to', tmpPath, '(frontend-plata-openapi.json in use)');
}
