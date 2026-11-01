(() => {
  'use strict';
  const params = new URLSearchParams(location.hash.slice(1));
  const profile = params.get('profile'), kind = params.get('kind');
  const target = document.getElementById('stats');
  if (!/^[A-Za-z0-9_.-]+$/.test(profile || '') || !['leetify','faceit'].includes(kind)) {
    target.textContent = 'Invalid profile.'; return;
  }
  const path = `/${encodeURIComponent(profile)}/${kind}`;
  const BASE = 'https://csst.at';
  const visited = new Set();
  const allowedTags = new Set('div span p a img time section article header footer main h1 h2 h3 h4 h5 h6 strong b em i small br hr ul ol li table thead tbody tfoot tr th td caption button input label details summary svg path circle rect line polyline polygon g title defs clippath lineargradient stop use'.split(' '));
  function safeURL(raw) {
    try { const url = new URL(raw, BASE); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
  }
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    for (const element of [...doc.body.querySelectorAll('*')]) {
      if (!allowedTags.has(element.localName.toLowerCase())) { element.remove(); continue; }
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || ['style','srcdoc','srcset','formaction','action','form','is','autofocus'].includes(name)) element.removeAttribute(attribute.name);
        else if (['src','href','xlink:href'].includes(name)) {
          if (attribute.value.startsWith('#') && name !== 'src') continue;
          const url = safeURL(attribute.value);
          if (url) element.setAttribute(attribute.name,url); else element.removeAttribute(attribute.name);
        }
      }
      if (element.localName==='a') {element.target='_blank';element.rel='noopener noreferrer';}
    }
    return doc.body;
  }
  function resize() {
    const height = Math.ceil(target.getBoundingClientRect().height + 2);
    parent.postMessage({type:'steam-csstats-height',height}, 'https://steamcommunity.com');
  }
  async function getFragment(fragmentPath) {
    const response = await chrome.runtime.sendMessage({type:'fragment',path:fragmentPath});
    if (!response?.ok) throw new Error(response?.error || 'Statistics unavailable');
    return sanitize(response.html);
  }
  function applyOutOfBand(body) {
    for (const update of [...body.querySelectorAll('[hx-swap-oob]')]) {
      const destination = [...target.querySelectorAll('[id]')].find(element=>element.id === update.id);
      const mode = update.getAttribute('hx-swap-oob');
      update.removeAttribute('hx-swap-oob');
      if (destination) {
        if (mode === 'innerHTML') destination.replaceChildren(...update.childNodes);
        else destination.replaceWith(update);
      } else update.remove();
    }
  }
  async function loadExtras() {
    // Reproduce only automatic read-only fragment loads. Never run remote scripts.
    const nodes = [...target.querySelectorAll('[hx-get]')].filter(node=> /\b(load|intersect)\b/.test(node.getAttribute('hx-trigger') || ''));
    for (const node of nodes.slice(0,12)) {
      const url = safeURL(node.getAttribute('hx-get'));
      if (!url || new URL(url).origin !== BASE || visited.has(url)) continue;
      visited.add(url);
      try {
        const body = await getFragment(new URL(url).pathname + new URL(url).search);
        // Apply HTMX's out-of-band metric replacements in place, not as header rows.
        applyOutOfBand(body);
        if ((node.getAttribute('hx-swap') || '').startsWith('outerHTML')) node.replaceWith(...body.childNodes);
        else node.replaceChildren(...body.childNodes);
      } catch {node.textContent='—';}
      resize();
    }
    for (const node of target.querySelectorAll('*')) {
      for(const attr of [...node.attributes]) if(attr.name.startsWith('hx-')) node.removeAttribute(attr.name);
    }
  }
  async function start() {
    try {
      const stylePromise = chrome.runtime.sendMessage({type:'stylesheet'}).then(response=>{
        if(response?.ok && response.url?.startsWith(`${BASE}/assets/css/`)) {
          const link=document.createElement('link');link.rel='stylesheet';link.href=response.url;
          link.addEventListener('load',resize);document.head.prepend(link);
        }
      }).catch(()=>{});
      const body = await getFragment(path);
      if (!body.textContent.trim()) throw new Error('No statistics found for this profile');
      // Exclude sidebar avatar/rank updates included alongside the provider card.
      const card = body.querySelector(`.${kind}`);
      if (card) target.replaceChildren(card);
      else {
        for (const extra of body.querySelectorAll('[hx-swap-oob]')) extra.remove();
        target.replaceChildren(...body.childNodes);
      }
      resize(); await loadExtras(); await stylePromise; resize();
    } catch(error) {
      const message=document.createElement('p');message.className='panel-message';
      message.textContent=`Could not load ${kind === 'leetify' ? 'Leetify' : 'FACEIT'} stats: ${error.message}. `;
      const link=document.createElement('a');link.textContent='Open on csst.at';link.href=`${BASE}/profile/${encodeURIComponent(profile)}`;link.target='_blank';link.rel='noopener noreferrer';
      message.append(link);target.replaceChildren(message);resize();
    }
  }
  new ResizeObserver(resize).observe(target);
  target.addEventListener('load',resize,true);
  start();
})();
