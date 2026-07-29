const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
const text = fs.readFileSync(envPath, 'utf8');
const line = text.split(/\r?\n/).find((l) => /^\s*MONGODB_URI\s*=/.test(l));
console.log('envFileExists:', fs.existsSync(envPath));
console.log('hasMongoLine:', Boolean(line));
if (line) {
  const raw = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  try {
    console.log('host:', new URL(raw).hostname);
  } catch (e) {
    console.log('parseError:', e.message);
  }
}
require('dotenv').config({ path: envPath, override: true });
console.log('dotenvHost:', process.env.MONGODB_URI ? new URL(process.env.MONGODB_URI).hostname : 'unset');
