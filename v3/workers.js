const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { fetchProxies, filterWorkingProxies } = require("./handleProxy");

const BASE_URL = "http://35.200.185.69:8000/v3/autocomplete";
const MAX_RESULTS = 15;
const RATE_LIMIT_DELAY = 800;
const RETRY_DELAY = 5000;
const PROGRESS_FILE = "progress.json";
const SAVE_INTERVAL = 60 * 1000; 

const CHARSET = " +-.0123456789abcdefghijklmnopqrstuvwxyz";
const allNames = new Set();
const visitedPrefixes = new Set();
let totalRequests = 0;
let lastProcessedPrefixes = {};
let PROXIES = [];
let proxyIndex = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
      allNames.clear();
      data.allNames.forEach((name) => allNames.add(name));
      lastProcessedPrefixes = data.lastProcessedPrefixes || {};
      console.log(`Resuming from saved progress.`);
    } catch (err) {
      console.error("Failed to load progress:", err.message);
    }
  }
}

function saveProgress() {
  const progressData = {
    lastProcessedPrefixes,
    allNames: Array.from(allNames),
  };
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progressData, null, 2), "utf8");
  console.log(" Progress saved.");
}

function getNextPrefix(prefix, lastName) {
  return lastName.slice(0, prefix.length + 1);
}

function incrementLastChar(prefix) {
  if (!prefix) return "";
  let chars = prefix.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    let index = CHARSET.indexOf(chars[i]);
    if (index < CHARSET.length - 1) {
      chars[i] = CHARSET[index + 1];
      return chars.slice(0, i + 1).join("");
    }
    i--;
  }
  return null;
}

function isRepeatedChar(prefix) {
  return prefix.length > 1 && prefix.split("").every((char) => char === prefix[0]);
}

function getNextProxy() {
  if (PROXIES.length === 0) {
    console.log(" No proxies available!");
    return null;
  }
  const proxy = PROXIES[proxyIndex % PROXIES.length];
  proxyIndex++;
  return proxy;
}

async function fetchNames(prefix, proxy, groupChar) {
  if (visitedPrefixes.has(prefix) || (lastProcessedPrefixes[groupChar] && prefix < lastProcessedPrefixes[groupChar])) {
    return; 
  }

  visitedPrefixes.add(prefix);
  await delay(RATE_LIMIT_DELAY);

  try {
    const [host, port] = proxy.split(":");
    const response = await axios.get(BASE_URL, {
      params: { query: prefix },
      timeout: 5000,
      proxy: {
        protocol: "http",
        host: host,
        port: parseInt(port),
      },
    });

    totalRequests++;
    const names = response.data?.results || [];
    let newCount = 0;
    names.forEach((name) => {
      if (!allNames.has(name)) {
        allNames.add(name);
        newCount++;
      }
    });

    console.log(
      `[${prefix}] Fetched ${names.length} names | New: ${newCount} | Total: ${allNames.size} | Requests: ${totalRequests} | Proxy: ${proxy}`
    );

    lastProcessedPrefixes[groupChar] = prefix; 

    if (names.length === MAX_RESULTS && !isRepeatedChar(prefix)) {
      const lastName = names[names.length - 1];
      const nextPrefix = getNextPrefix(prefix, lastName);
      await fetchNames(nextPrefix, proxy, groupChar);
    }

    const nextSibling = incrementLastChar(prefix);
    if (nextSibling) {
      await fetchNames(nextSibling, proxy, groupChar);
    }
  } catch (error) {
    console.error(`Error on prefix "${prefix}" using proxy ${proxy}: ${error.message} | Retrying in ${RETRY_DELAY / 1000}s...`);
    await delay(RETRY_DELAY);
    await fetchNames(prefix, getNextProxy(), groupChar); 
  }
}

async function processGroup(group, proxy) {
  for (const char of group) {
    const startPrefix = lastProcessedPrefixes[char] || char;
    await fetchNames(startPrefix, proxy, char);
  }
}

async function updateProxies() {
  try {
    console.log("Fetching new proxies...");
    const proxies = await fetchProxies();
    PROXIES = await filterWorkingProxies(proxies);
    console.log(`Updated working proxies: ${PROXIES.length} proxies available`);
  } catch (error) {
    console.error("Failed to update proxies:", error.message);
  }
}

async function startWorkers() {
  if (PROXIES.length === 0) {
    console.log(" No valid proxies available. Retrying...");
    await updateProxies();
  }

  console.log("Starting workers...");
  const workerPromises = CHARSET.split("").map((group, index) => {
    const proxy = getNextProxy();
    if (!proxy) return;
    return processGroup(group, proxy);
  });

  await Promise.all(workerPromises);

  console.log(` Extraction Completed. Total unique names: ${allNames.size}`);
}

setInterval(saveProgress, SAVE_INTERVAL);

(async () => {
  loadProgress(); 
  await updateProxies(); 
  await startWorkers(); 
})();
