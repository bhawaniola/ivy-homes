const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { fetchProxies, filterWorkingProxies } = require("./handleProxy");

const BASE_URL = "http://35.200.185.69:8000/v1/autocomplete";
const MAX_RESULTS = 10;
const RATE_LIMIT_DELAY = 700;
const PROGRESS_FILE = "progress.json";
const SAVE_INTERVAL = 1*60*1000; 

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const GROUPS = ALPHABET.split("").map((char) => char);

let allNames = new Set();
let lastProcessedPrefixes = {};
let PROXIES = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
      allNames = new Set(data.allNames || []);
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
  console.log("Progress saved.");
}

function getNextPrefix(prefix, lastName) {
  return lastName.slice(0, prefix.length + 1);
}

function incrementLastChar(prefix) {
  if (prefix.length === 0) return "";
  let chars = prefix.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== "z") {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.slice(0, i + 1).join("");
    }
    i--;
  }
  return null;
}

async function fetchNames(prefix, proxy, groupChar) {
  if (lastProcessedPrefixes[groupChar] && prefix < lastProcessedPrefixes[groupChar]) {
    return;  
  }

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

    const names = response.data?.results || [];
    names.forEach((name) => allNames.add(name));

    console.log(`[${prefix}] Fetched ${names.length} names | Total: ${allNames.size}`);

    lastProcessedPrefixes[groupChar] = prefix;  
    if (names.length === MAX_RESULTS) {
      const lastName = names[names.length - 1];
      const nextPrefix = getNextPrefix(prefix, lastName);
      await fetchNames(nextPrefix, proxy, groupChar);
    }

    const nextSibling = incrementLastChar(prefix);
    if (nextSibling) {
      await fetchNames(nextSibling, proxy, groupChar);
    }
  } catch (error) {
    // console.error(`Error on prefix "${prefix}" using proxy ${proxy}: ${error.message}`);
    await delay(3000);
    await fetchNames(prefix, proxy, groupChar);
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
    const proxies = await fetchProxies();
    PROXIES = await filterWorkingProxies(proxies);
    console.log("Updated working proxies:", PROXIES);
  } catch (error) {
    console.error("Failed to update proxies:", error.message);
  }
}

async function startWorkers() {
  if (PROXIES.length === 0) {
    console.log("No valid proxies available. Retrying...");
    await updateProxies();
  }

  console.log("Starting workers...");
  const workerPromises = GROUPS.map((group, index) => {
    const proxy = PROXIES[index % PROXIES.length];
    return processGroup(group, proxy);
  });

  await Promise.all(workerPromises);

  console.log(`Extraction Completed. Total unique names: ${allNames.size}`);
}

setInterval(saveProgress, SAVE_INTERVAL);

(async () => {
  loadProgress(); 
  await updateProxies();
  await startWorkers(); 
})();
