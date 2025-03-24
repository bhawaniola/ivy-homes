import { startWorkers } from './workers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.join(__dirname, 'workers.log');

fs.writeFileSync(logFilePath, '', 'utf8');
console.log('Cleared workers.log');

// Start the workers
startWorkers()
  .then(() => {
    console.log('Workers completed successfully');
  })
  .catch((error) => {
    console.error('Workers failed:', error.message);
  });