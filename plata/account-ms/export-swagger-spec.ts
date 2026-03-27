import fs from 'fs';
import path from 'path';
import swaggerSpec from './src/config/swagger';

const dir = __dirname;
const outPath = path.join(dir, 'openapi.json');
const tmpPath = path.join(dir, 'openapi.json.tmp');
const content = JSON.stringify(swaggerSpec, null, 2);
fs.writeFileSync(tmpPath, content, 'utf-8');
try {
  fs.renameSync(tmpPath, outPath);
  console.log('Written to', outPath);
} catch {
  console.log('Written to', tmpPath, '(openapi.json in use – close it or run without "> openapi.json")');
}
