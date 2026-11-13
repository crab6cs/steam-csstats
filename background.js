'use strict';
const BASE = 'https://csst.at';
const cache = new Map();
let cssURL;
async function fetchText(path) {
  const url = new URL(path, BASE);
  if (url.origin !== BASE) throw new Error('Invalid stats URL');
  const cached = cache.get(url.href);
  if (cached && Date.now() - cached.time < 60000) return cached.text;
  const response = await fetch(url.href, {credentials: 'omit', signal: AbortSignal.timeout(20000)});
  if (response.headers?.get('cf-mitigated') === 'challenge') throw new Error('csst.at requires browser verification. Open the full profile, complete verification, then retry');
  if (!response.ok) throw new Error(`Stats service returned ${response.status}`);
  if (new URL(response.url).origin !== BASE) throw new Error('Unexpected redirect');
  const text = await response.text();
  if (/\/cdn-cgi\/challenge-platform\/|<title>Just a moment\.\.\.<\/title>/i.test(text)) throw new Error('csst.at requires browser verification. Open the full profile, complete verification, then retry');
  if (text.length > 2000000) throw new Error('Stats response too large');
  cache.set(url.href, {text, time:Date.now()});
  if (cache.size > 80) cache.delete(cache.keys().next().value);
  return text;
}
async function stylesheet() {
  const local = await (await fetch(chrome.runtime.getURL('panel.css'))).text();
  try {
    if (!cssURL) {
      const html = await fetchText('/');
      const match = html.match(/(?:href=["'])(\/assets\/css\/[^"']+\.css)(?:["'])/i);
      if (!match) return local;
      cssURL = new URL(match[1], BASE).href;
    }
    const css = await fetchText(cssURL);
    return css.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (all, quote, raw) => {
      try { const url = new URL(raw.trim(), cssURL); return ['https:','data:'].includes(url.protocol) ? `url("${url.href}")` : 'url("")'; } catch { return 'url("")'; }
    }) + '\n' + local;
  } catch { cssURL = undefined; return local; }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Only our content script on a Steam profile may use the service proxy.
  if (sender.id !== chrome.runtime.id || !/^https:\/\/steamcommunity\.com\/(?:id|profiles)\/[A-Za-z0-9_%.-]+\/?(?:[?#].*)?$/.test(sender.url || '')) return;
  if (message?.type === 'stylesheet') {
    stylesheet().then(css=>respond({ok:true,css}),error=>respond({ok:false,error:error.message}));
    return true;
  }
  if (message?.type === 'fragment' && typeof message.path === 'string') {
    // Only read public statistics fragments; never accept arbitrary URLs or writes.
    if (!/^\/[A-Za-z0-9_%.-]+\/(?:leetify(?:-extra)?|faceit(?:-history)?|game-coordinator)(?:\?[^#]*)?$/.test(message.path)) {
      respond({ok:false,error:'Unsupported statistics endpoint'}); return;
    }
    fetchText(message.path).then(html=>respond({ok:true,html}),error=>respond({ok:false,error:error.message}));
    return true;
  }
});
async function updateBadge() {
  const {enabled = true} = await chrome.storage.local.get('enabled');
  await chrome.action.setBadgeText({text: enabled ? 'ON' : 'OFF'});
  await chrome.action.setBadgeBackgroundColor({color:enabled ? '#3278a5' : '#59616b'});
  await chrome.action.setTitle({title:`Steam profile CS stats: ${enabled ? 'on' : 'off'} — click to toggle`});
}
chrome.action.onClicked.addListener(async()=>{
  const {enabled = true} = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({enabled:!enabled});
});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.enabled) updateBadge();});
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
