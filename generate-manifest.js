import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const sha = process.env.GIT_COMMIT_SHA
  || process.env.SOURCE_COMMIT
  || (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

mkdirSync('public', { recursive: true });
writeFileSync('public/manifest.json', JSON.stringify({
  version: sha,
  timestamp: new Date().toISOString(),
}, null, 2));

console.log(`[manifest] version=${sha}`);