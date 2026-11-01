(() => {
  'use strict';
  const match = location.pathname.match(/^\/(id|profiles)\/([^/]+)\/?$/);
  if (!match) return;
  let identifier;
  try { identifier = decodeURIComponent(match[2]); } catch { return; }
  if (!/^[A-Za-z0-9_.-]+$/.test(identifier)) return;
  const ROOT_ID = 'steam-csstats-panels';
  let enabled = true, root, hideStyle, queued = false;
  const frameOrigin = `chrome-extension://${chrome.runtime.id}`;
  const hideCSS = '.leetify-extension-stats-wrapper { display: none !important; }';
  function build() {
    const area = document.querySelector('.profile_customization_area');
    const leftColumn = document.querySelector('.profile_leftcol');
    if (!enabled) { root?.remove(); root = null; hideStyle?.remove(); hideStyle = null; return; }
    if (!hideStyle?.isConnected) {
      hideStyle = document.createElement('style'); hideStyle.textContent = hideCSS;
      document.documentElement.append(hideStyle);
    }
    if ((!area && !leftColumn) || root?.isConnected) return;
    root = document.createElement('section'); root.id = ROOT_ID;
    root.style.cssText = 'width:100%;box-sizing:border-box;margin:0 0 20px;display:flex;flex-direction:column;gap:12px;clear:both;';
    const button = document.createElement('a');
    button.textContent = 'View full CS stats ↗';
    button.href = `https://steamcommunity.rip/${match[1]}/${encodeURIComponent(identifier)}`;
    button.target = '_blank'; button.rel = 'noopener noreferrer';
    button.style.cssText = 'align-self:flex-start;display:inline-block;padding:11px 18px;border-radius:4px;background:#31759b;color:#fff;font:600 14px Arial,sans-serif;text-decoration:none;';
    root.append(button);
    for (const kind of ['leetify','faceit']) {
      const block = document.createElement('div');
      block.style.cssText = 'min-width:0;border-radius:8px;overflow:hidden;background:#191e24;';
      const frame = document.createElement('iframe');
      frame.title = `${kind === 'leetify' ? 'Leetify' : 'FACEIT'} statistics for ${identifier}`;
      frame.src = `${chrome.runtime.getURL('panel.html')}#${new URLSearchParams({profile:identifier,kind})}`;
      frame.style.cssText = 'display:block;width:100%;height:180px;border:0;background:#191e24;';
      frame.referrerPolicy = 'no-referrer';
      block.append(frame); root.append(block);
    }
    if (area) area.before(root);
    else leftColumn.prepend(root);
  }
  function schedule() { if(!queued) {queued=true;requestAnimationFrame(()=>{queued=false;build();});} }
  window.addEventListener('message',event=>{
    if(event.origin !== frameOrigin || event.data?.type !== 'steam-csstats-height' || !Number.isFinite(event.data.height)) return;
    for(const frame of root?.querySelectorAll('iframe') ?? []) {
      if(event.source === frame.contentWindow) frame.style.height = `${Math.max(100,Math.min(2000,Math.ceil(event.data.height)))}px`;
    }
  });
  chrome.storage.local.get({enabled:true},settings=>{enabled=settings.enabled!==false;schedule();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes.enabled){enabled=changes.enabled.newValue!==false;schedule();}});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
