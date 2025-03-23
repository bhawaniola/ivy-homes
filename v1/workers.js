const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { fetchProxies, filterWorkingProxies } = require('./handleProxy');

const BASE_URL = 'http://35.200.185.69:8000/v1/autocomplete';
const MAX_RESULTS = 10;
const RATE_LIMIT_DELAY = 700;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const GROUPS = ALPHABET.split('').map(char => char);

const allNames = new Set();

let PROXIES = [];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logFile = path.join(__dirname, 'workers.log');
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry, 'utf8');
  console.log(logEntry.trim()); 
}

function getNextPrefix(prefix, lastName) {
  return lastName.slice(0, prefix.length + 1);
}

function incrementLastChar(prefix) {
  if (prefix.length === 0) return '';
  let chars = prefix.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== 'z') {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.slice(0, i + 1).join('');
    }
    i--;
  }
  return null;
}

async function fetchNames(prefix, visitedPrefixes, proxy) {
  if (visitedPrefixes.has(prefix)) {
    console.log(`Prefix "${prefix}" already visited. Skipping...`);
    return;
  }

  await delay(RATE_LIMIT_DELAY);

  try {
    const [host, port] = proxy.split(':');
    const response = await axios.get(BASE_URL, {
      params: { query: prefix },
      timeout: 5000,
      proxy: {
        protocol: 'http',
        host: host,
        port: parseInt(port),
      },
    });

    const names = response.data?.results || [];
    names.forEach(name => allNames.add(name));

    console.log(`[${prefix}] Fetched ${names.length} names | Total: ${allNames.size}`);

    if (names.length === MAX_RESULTS) {
      const lastName = names[names.length - 1];
      const nextPrefix = getNextPrefix(prefix, lastName);
      console.log(`Max results reached for prefix "${prefix}". Fetching next prefix: "${nextPrefix}"`);
      await fetchNames(nextPrefix, visitedPrefixes, proxy);
    }

    const nextSibling = incrementLastChar(prefix);
    if (nextSibling) {
      console.log(`Fetching next sibling prefix: "${nextSibling}"`);
      await fetchNames(nextSibling, visitedPrefixes, proxy);
    }
    visitedPrefixes.add(prefix);
  } catch (error) {
    // logMessage(new Error(`ERROR on prefix "${prefix}" using proxy ${proxy}: ${error.message}`));
    await delay(3000);
    await fetchNames(prefix, visitedPrefixes, proxy);
  }
}

async function processGroup(group, proxy) {
  const visitedPrefixes = new Set();
  console.log(`Processing group "${group}" with proxy ${proxy}`);
  for (const char of group) {
    await fetchNames(char, visitedPrefixes, proxy);
  }
}

async function getProxies() {
  try {
    logMessage('Fetching proxies...');
    const proxies = await fetchProxies();
    PROXIES = await filterWorkingProxies(proxies);
    logMessage(`Fetched ${PROXIES.length} working proxies: ${PROXIES.join(', ')}`);
  } catch (error) {
    logMessage(new Error(`ERROR: Failed to fetch proxies: ${error.message}`));
  }
}

async function startWorkers() {
  logMessage('Starting workers...');

  try {
    await getProxies();

    const workerPromises = GROUPS.map((group, index) => {
      const proxy = PROXIES[index % PROXIES.length];
      return processGroup(group, proxy);
    });

    await Promise.all(workerPromises);

    const outputPath = path.join(__dirname, 'all_names.txt');
    fs.writeFileSync(outputPath, Array.from(allNames).sort().join('\n'), 'utf8');

    logMessage(`Extraction completed. Total unique names: ${allNames.size}`);
  } catch (error) {
    logError(new Error(`ERROR in startWorkers: ${error.message}`));
  }
}

module.exports = { startWorkers };