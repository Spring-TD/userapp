import path from 'path';
import fs from 'fs';

const openApiPath = path.join(__dirname, '..', '..', 'openapi.json');
const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));

export default spec;
