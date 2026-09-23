import {test,expect} from './fixtures.js';

const teaser=({named=false,offer='25% OFF',opener='span',label='Close teaser'}={})=>`<div data-teaser class="${named?'promo':'unfamiliar'}" style="position:fixed;right:20px;top:40%;background:white;border:1px solid;padding:12px"><div data-testid="animated-teaser"><${opener} ${opener==='button'?'type="button"':'role="button" tabindex="0"'} data-open><span>${offer}</span></${opener}><button data-close aria-label="${label}" style="position:absolute;right:-10px;bottom:-10px;width:20px;height:20px"><svg aria-hidden="true"><title>${label}</title></svg></button></div></div>`;
const cookie='<section id="cookie-banner" style="position:fixed;left:0;top:0"><p>We use cookies</p><button onclick="this.parentElement.remove();window.rejected=true">Reject all</button></section>';
const promo='<section class="newsletter-popup" style="position:fixed;left:0;bottom:0"><h2>Get our newsletter</h2><button type="button" onclick="this.parentElement.remove();window.promotionWitness=true">No thanks</button></section>';
async function visit(page,body,{host='teaser-a.example',script='',promotions=true}={}) {
  await page.route(`https://${host}/**`,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><style>button,[role=button]{padding:8px}svg{width:12px;height:12px}</style><main><h1>Products</h1><p id="products">Keep these products</p></main>${cookie}${promo}${body}<script>window.actions=[];document.addEventListener('click',e=>{const close=e.target.closest('[data-close]'),open=e.target.closest('[data-open]');if(close){actions.push('close');close.closest('[data-teaser]').remove()}else if(open)actions.push('open')});${script}</script>`}));
  await page.goto(`https://${host}/products`);
  await expect.poll(()=>page.evaluate(()=>window.rejected)).toBe(true);
  if(promotions)await expect.poll(()=>page.evaluate(()=>window.promotionWitness)).toBe(true);
}
const count=worker=>worker.evaluate(async()=>Object.values(await chrome.storage.session.get(null)).reduce((n,s)=>n+(s.diagnostics?.filter(r=>r.category==='offer'&&r.outcome==='closed').length||0),0));

for (const [host,options] of [['teaser-a.example',{}],['teaser-b.example',{named:true,offer:'Save 20%',opener:'button'}]]) {
  test(`closes a compact marketing teaser on ${host} without opening its form`,async({extension:{page,worker}})=>{
    await visit(page,teaser(options),{host});
    await expect(page.locator('[data-teaser]')).toHaveCount(0);
    expect(await page.evaluate(()=>actions)).toEqual(['close']);
    await expect.poll(()=>count(worker)).toBe(1);
    await expect(page.locator('#products')).toBeVisible();
  });
}

test('late teaser appears after a dismissed larger promotion',async({extension:{page,worker}})=>{
  await visit(page,'',{script:`setTimeout(()=>document.body.insertAdjacentHTML('beforeend',${JSON.stringify(teaser({offer:'Get $10 off'}))}),6500)`});
  await expect.poll(()=>page.evaluate(()=>actions),{timeout:12000}).toEqual(['close']);
  await expect.poll(()=>count(worker)).toBe(1);
});

test('unsafe or ambiguous teaser variants remain visible on named and structural paths',async({extension:{page,worker}})=>{
  test.setTimeout(120000);
  const cases=[
    teaser({offer:'Help'}),
    teaser({offer:'Sign up & save 20%'}),
    teaser().replace('25% OFF','25% OFF — cookie consent'),
    teaser().replace('25% OFF','25% OFF — checkout'),
    teaser().replace('25% OFF','25% OFF<span hidden>By closing you accept terms</span>'),
    teaser().replace('</span></span>','</span><input hidden></span>'),
    teaser().replace('</span></span>','</span><button>Accept all</button></span>'),
    teaser().replace('position:fixed','position:static'),
    teaser().replace('background:white','width:95vw;height:95vh;background:white'),
    '<form>'+teaser()+'</form>',
    teaser().replace('data-close','form="payment" data-close')+'<form id="payment"></form>',
    teaser().replace('<span role="button" tabindex="0" data-open>','<a href="/checkout" data-open>').replace('</span></span>','</span></a>'),
    teaser().replace('</span></span><button','</span><button').replace('</button></div></div>','</button></span></div></div>'),
    teaser().replace('data-close','id="onetrust-accept-btn-handler" data-close'),
    teaser().replace('data-close','hidden data-close'),
    teaser().replace('<div data-testid="animated-teaser">','<div data-testid="animated-teaser"><form hidden><input></form>'),
    teaser().replace('<title>Close teaser</title>','<title>Accept terms</title>'),
    teaser().replace('data-close','title="Accept terms" data-close'),
    '<style>[data-teaser]::before{content:"Closing accepts tracking"}</style>'+teaser(),
    teaser().replace('data-open','aria-checked="false" data-open'),
    teaser().replace('data-open','aria-description="Closing accepts tracking" data-open'),
    teaser().replace('data-close','aria-describedby="terms" data-close')+'<p id="terms" hidden>Closing accepts terms</p>',
    teaser().replace('</span></span>','</span><img alt="Closing accepts terms"></span>'),
    teaser().replace('</span></span>','</span><span role="switch" style="display:inline-block;width:10px;height:10px"></span></span>'),
  ];
  for (const [index,html] of cases.entries()) {
    await visit(page,html.replace('unfamiliar',index%2?'promo':'unfamiliar'),{host:`unsafe-${index}.example`});
    await page.waitForTimeout(1700);
    expect(await page.evaluate(()=>actions)).toEqual([]);
    await expect(page.locator('[data-teaser]')).toBeVisible();
    expect(await count(worker)).toBe(0);
  }
});

test('a rotated side teaser is found after 200 ordinary product controls',async({extension:{page,worker}})=>{
  const products=Array.from({length:200},(_,i)=>`<button>Product ${i}</button>`).join('');
  const rotated=teaser().replace('right:20px;top:40%','right:0;top:50%;transform:rotate(90deg) translate(50%,0);transform-origin:right top;width:184px');
  await visit(page,products+rotated);
  await expect(page.locator('[data-teaser]')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['close']);
  await expect.poll(()=>count(worker)).toBe(1);
});

test('two independent teaser offers can both close',async({extension:{page,worker}})=>{
  await visit(page,teaser()+teaser({offer:'Save 20%',named:true}).replace('top:40%','top:70%'));
  await expect(page.locator('[data-teaser]')).toHaveCount(0);
  expect(await page.evaluate(()=>actions)).toEqual(['close','close']);
  await expect.poll(()=>count(worker)).toBe(2);
});

test('a user-opened reused teaser node stays protected',async({extension:{page}})=>{
  const hidden=teaser({named:true}).replace('data-teaser','hidden data-teaser');
  await visit(page,'<button id="more">More</button>'+hidden,{script:`document.querySelector('#more').onclick=()=>setTimeout(()=>document.querySelector('[data-teaser]').hidden=false,2100)`});
  await page.locator('#more').click();
  await page.waitForTimeout(11500);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('a trusted opener protects the teaser and its later replacement',async({extension:{page,settings}})=>{
  await settings({enabled:false});
  await visit(page,teaser({named:true}),{promotions:false,script:`window.rejected=true;document.querySelector('[data-open]').onclick=()=>setTimeout(()=>{document.querySelector('[data-teaser]').remove();document.body.insertAdjacentHTML('beforeend',${JSON.stringify(teaser({named:true}))})},2100)`});
  await page.locator('[data-open]').click();
  await settings({enabled:true});
  await expect.poll(()=>page.evaluate(()=>window.promotionWitness)).toBe(true);
  await page.waitForTimeout(11500);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual(['open']);
});

test('an indirectly user-opened offer stays available beyond the gesture window',async({extension:{page}})=>{
  await visit(page,'<button id="more">More</button>',{script:`document.querySelector('#more').onclick=()=>setTimeout(()=>document.body.insertAdjacentHTML('beforeend',${JSON.stringify(teaser({named:true}))}),2100)`});
  await page.locator('#more').click();
  await page.waitForTimeout(11500);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await page.evaluate(()=>actions)).toEqual([]);
});

test('a no-op close is bounded and earns no success credit',async({extension:{page,worker}})=>{
  await visit(page,teaser(),{script:`document.querySelector('[data-close]').addEventListener('click',e=>{e.stopPropagation();actions.push('noop')})`});
  await page.waitForTimeout(6800);
  const actions=await page.evaluate(()=>window.actions);
  expect(actions.length).toBeGreaterThan(0);
  expect(actions.length).toBeLessThanOrEqual(2);
  expect(actions.every(action=>action==='noop')).toBe(true);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await count(worker)).toBe(0);
});

test('a replacement with changed instructions prevents false completion',async({extension:{page,worker}})=>{
  await visit(page,teaser(),{script:`document.querySelector('[data-close]').addEventListener('click',e=>{e.stopPropagation();actions.push('replace');const next=document.querySelector('[data-teaser]').cloneNode(true);next.querySelector('[data-open]').textContent='Payment required';document.querySelector('[data-teaser]').replaceWith(next)})`});
  await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['replace']);
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await count(worker)).toBe(0);
});

test('a changed teaser replacement in another corner prevents false completion',async({extension:{page,worker}})=>{
  await visit(page,teaser(),{script:`document.querySelector('[data-close]').addEventListener('click',e=>{e.stopPropagation();actions.push('replace');const next=document.querySelector('[data-teaser]').cloneNode(true);next.style.top='80%';next.style.right='75%';next.querySelector('[data-open]').textContent='Payment required';document.querySelector('[data-teaser]').replaceWith(next)})`});
  await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['replace']);
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await count(worker)).toBe(0);
});

test('identical independent teasers share a bounded budget without false replacement credit',async({extension:{page,worker}})=>{
  await visit(page,teaser()+teaser().replace('top:40%','top:70%'));
  await expect(page.locator('[data-teaser]')).toHaveCount(0,{timeout:10000});
  expect(await page.evaluate(()=>actions)).toEqual(['close','close']);
  await expect.poll(()=>count(worker)).toBe(2);
});

test('a slotted teaser with hidden closed-shadow fields stays untouched',async({extension:{page,worker}})=>{
  await visit(page,teaser(),{script:`document.querySelector('[data-teaser]').attachShadow({mode:'closed'}).innerHTML='<slot></slot><input hidden>'`});
  await page.waitForTimeout(2000);
  expect(await page.evaluate(()=>actions)).toEqual([]);
  await expect(page.locator('[data-teaser]')).toBeVisible();
  expect(await count(worker)).toBe(0);
});

test('timer-unhidden reused nodes close when no user gesture caused the change',async({extension:{page,worker}})=>{
  await visit(page,teaser({named:true}).replace('data-teaser','hidden data-teaser'),{script:`setTimeout(()=>document.querySelector('[data-teaser]').hidden=false,2100)`});
  await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['close']);
  await expect.poll(()=>count(worker)).toBe(1);
});

test('a replacement inside an existing shared fixed wrapper prevents false completion',async({extension:{page,worker}})=>{
  const portal='<section id="portal" class="promo" style="position:fixed;left:0;top:70%">Other component<button disabled aria-label="Close teaser"></button></section>';
  await visit(page,teaser()+portal,{script:`document.querySelector('[data-close]').addEventListener('click',e=>{e.stopPropagation();actions.push('replace');document.querySelector('[data-teaser]').remove();document.querySelector('#portal').insertAdjacentHTML('beforeend','<div data-replacement>Payment required<button aria-label="Close teaser">×</button></div>')})`});
  await expect.poll(()=>page.evaluate(()=>actions)).toEqual(['replace']);
  await page.waitForTimeout(3000);
  await expect(page.locator('[data-replacement]')).toBeVisible();
  expect(await count(worker)).toBe(0);
});
