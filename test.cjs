const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('proxy restricts senders and endpoints, detects verification, and does not cache failures', async () => {
  let listener, challenged = true;
  const requests = [];
  const runtime = {id:'test',getURL:p=>`chrome-extension://test/${p}`,onMessage:{addListener:f=>listener=f},onInstalled:{addListener(){}},onStartup:{addListener(){}}};
  const context = {URL,AbortSignal,Date,Map,chrome:{runtime,storage:{onChanged:{addListener(){}}},action:{onClicked:{addListener(){}}}},fetch:async url=>{
    requests.push(url);
    return {ok:true,url,headers:{get:()=>null},text:async()=>url.endsWith('panel.css')?'body{margin:0}':url==='https://csst.at/'?'<link href="/assets/css/hash/main.css">':url.endsWith('.css')?'div{background:url(../../image.png)}':challenged?'<title>Just a moment...</title>':'<div class="leetify">KD 1.26</div>'};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'background.js'),'utf8'),context);
  const sender={id:'test',url:'https://steamcommunity.com/id/crab6/'};
  const send=message=>new Promise(resolve=>listener(message,sender,resolve));
  assert.equal(listener({type:'fragment',path:'/crab6/leetify'},{id:'other',url:sender.url},()=>assert.fail()),undefined);
  assert.equal(listener({type:'fragment',path:'/crab6/leetify'},{id:'test',url:'https://evil.example/'},()=>assert.fail()),undefined);
  assert.equal((await send({type:'fragment',path:'/crab6/delete'})).ok,false);
  assert.equal((await send({type:'fragment',path:'https://evil.example/'})).ok,false);
  assert.match((await send({type:'fragment',path:'/crab6/leetify'})).error,/verification/);
  challenged=false;
  assert.equal((await send({type:'fragment',path:'/crab6/leetify'})).ok,true);
  await send({type:'fragment',path:'/crab6/leetify'});
  assert.equal(requests.filter(u=>u.endsWith('/leetify')).length,2);
  const style=await send({type:'stylesheet'});
  assert.match(style.css,/https:\/\/csst.at\/assets\/image.png/);
  assert.match(style.css,/body\{margin:0\}/);
});

test('sandboxed panels render, resize, sanitize remote HTML, retry, and toggle', async () => {
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage();
    await page.route('https://steamcommunity.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div class="profile_leftcol"><div class="profile_customization_area"></div></div>'}));
    await page.goto('https://steamcommunity.com/id/crab6');
    await page.evaluate(()=>{
      window.retryCount=0;
      window.chrome={runtime:{sendMessage:async m=>{
        if(m.type==='stylesheet')return {ok:true,css:'body{margin:0;font:16px Arial} #stats{padding:12px}'};
        if(m.path.endsWith('/faceit') && !window.retryCount++)return {ok:false,error:'csst.at requires browser verification'};
        return {ok:true,html:'<div class="'+(m.path.endsWith('/leetify')?'leetify':'faceit')+'"><h2>Verified statistics</h2><p>KD 1.26</p><script>parent.compromised=true</script><img src="x" onerror="parent.compromised=true"><a href="javascript:alert(1)">Unsafe</a><a href="https://leetify.com/">Full stats</a></div>'};
      }},storage:{local:{get:(defaults,callback)=>callback(defaults)},onChanged:{addListener:f=>window.toggleStats=f}}};
    });
    await page.addScriptTag({path:path.join(__dirname,'panel.js')});
    await page.addScriptTag({path:path.join(__dirname,'profile.js')});
    const frames=page.locator('#steam-csstats-panels iframe');
    await frames.first().waitFor();
    await page.frameLocator('iframe[title^="Leetify"]').getByText('KD 1.26').waitFor();
    await page.frameLocator('iframe[title^="FACEIT"]').getByRole('button',{name:'Retry'}).click();
    await page.frameLocator('iframe[title^="FACEIT"]').getByText('KD 1.26').waitFor();
    assert.equal(await page.evaluate(()=>!!window.compromised),false);
    assert.equal(await frames.first().getAttribute('src'),null);
    assert.doesNotMatch(await frames.first().getAttribute('sandbox'),/allow-scripts/);
    assert.equal(await page.frameLocator('iframe[title^="Leetify"]').locator('script,[onerror],a[href^="javascript:"]').count(),0);
    assert.equal(await page.frameLocator('iframe[title^="Leetify"]').getByRole('link',{name:'Full stats'}).getAttribute('target'),'_blank');
    await page.evaluate(()=>window.toggleStats({enabled:{newValue:false}},'local'));
    await page.locator('#steam-csstats-panels').waitFor({state:'detached'});
    await page.evaluate(()=>window.toggleStats({enabled:{newValue:true}},'local'));
    await page.frameLocator('iframe[title^="Leetify"]').getByText('KD 1.26').waitFor();
    assert.equal(await frames.count(),2);
    assert.ok(await frames.first().evaluate(e=>parseFloat(e.style.height)>=100));
  } finally {await browser.close();}
});
