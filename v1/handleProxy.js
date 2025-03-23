const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");

const PROXY_SOURCES = [
  "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=1000&country=all",
  "https://www.proxy-list.download/api/v1/get?type=http",
  "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
  "https://www.proxyscan.io/download?type=http",
  "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list.txt",
  "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
  "https://raw.githubusercontent.com/roosterkid/openproxylist/main/http.txt",
  "https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt",
  "https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt",
  "https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt"
];

const TEST_URL = "http://ip-api.com/json";
const TIMEOUT = 5000;

async function fetchProxies() {
  let proxyList = new Set();
  for (let url of PROXY_SOURCES) {
    try {
      const response = await axios.get(url, { timeout: TIMEOUT });
      const proxies = response.data.split(/\r?\n/).filter(p => p.trim());
      proxies.forEach(proxy => proxyList.add(proxy));
    } catch (error) {}
  }
  return Array.from(proxyList);
}

async function checkProxy(proxy) {
  try {
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const response = await axios.get(TEST_URL, { httpsAgent: agent, timeout: TIMEOUT });
    if (response.status === 200) return proxy;
  } catch (error) {}
  return null;
}

async function filterWorkingProxies(proxies) {
  const checkPromises = proxies.map(proxy => checkProxy(proxy));
  const results = await Promise.all(checkPromises);
  const validProxies = results.filter(proxy => proxy !== null); 
  return validProxies
}

module.exports = { fetchProxies, filterWorkingProxies };