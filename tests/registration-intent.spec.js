import {test, expect} from './fixtures.js';

test('registration intent survives hydration after the interaction window', async ({extension:{page}})=>{
  const url='https://delayed-registration.example/story';
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body>
    <button id="save">Save</button><div id="mount"></div>
    <section id="cookie-banner" role="dialog"><p>Optional cookies</p><button onclick="this.parentElement.remove()">Reject all</button></section>
    <script>
    window.dismissed=0;
    document.querySelector('#save').onclick=()=>{
      setTimeout(()=>{document.querySelector('#mount').innerHTML='<section class="registration-wall" id="gate"><h2>Sign in to keep reading</h2><button id="close" type="button">Close</button></section>';document.querySelector('#close').onclick=()=>{dismissed++;document.querySelector('#gate').remove()}},1800);
      setTimeout(()=>document.querySelector('#gate').insertAdjacentHTML('beforeend','<a href="/login" id="signin">Sign in with email</a>'),11000);
    };
    </script></body>`}));
  await page.goto(url);await expect(page.locator('#cookie-banner')).toHaveCount(0);
  await page.locator('#save').click();await expect(page.locator('#gate')).toBeVisible();
  await expect(page.locator('#signin')).toBeVisible({timeout:13000});
  await page.waitForTimeout(1800);
  expect(await page.evaluate(()=>dismissed)).toBe(0);await expect(page.locator('#gate')).toBeVisible();
});

test('delayed registration hydration without user intent is dismissed',async({extension:{page}})=>{
  const url='https://delayed-registration.example/passive';
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body><section class="registration-wall" id="gate"><h2>Sign in to keep reading</h2><button id="close" type="button">Close</button></section><script>
  document.querySelector('#close').onclick=()=>document.querySelector('#gate').remove();
  setTimeout(()=>document.querySelector('#gate').insertAdjacentHTML('beforeend','<a href="/login">Sign in with email</a>'),11000);
  </script></body>`}));
  await page.goto(url);await expect(page.locator('#gate')).toHaveCount(0,{timeout:14000});
});

test('a body modal class cannot permanently protect unrelated registration prompts',async({extension:{page}})=>{
  const url='https://delayed-registration.example/body-class';
  await page.route(url,r=>r.fulfill({contentType:'text/html',body:`<!doctype html><body class="modal-open"><button id="control">Change text</button><p id="note">Ready</p><div id="mount"></div><script>
  document.querySelector('#control').onclick=()=>{
    document.querySelector('#note').textContent='Changed';
    setTimeout(()=>{
      document.querySelector('#mount').innerHTML='<section class="registration-wall" id="gate"><h2>Sign in to keep reading</h2><a href="/login">Sign in</a><button id="close" type="button">Close</button></section>';
      document.querySelector('#close').onclick=()=>{document.querySelector('#gate').remove();document.body.dataset.dismissed='yes'};
    },11000);
  };
  </script></body>`}));
  await page.goto(url);await page.locator('#control').click();
  await expect(page.locator('body')).toHaveAttribute('data-dismissed','yes',{timeout:14000});
});
