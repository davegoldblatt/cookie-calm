import http from 'node:http';
const shell = body => `<!doctype html><html><head><meta charset="utf-8"><title>Cookie Calm test page</title><style>body{font:16px system-ui;margin:50px;color:#203848}button{padding:12px;margin:5px}section{padding:24px;background:#e9f3f9;border:1px solid #aac;max-width:560px}.banner{position:fixed;bottom:24px;left:24px}label{display:block;margin:12px}</style></head><body><h1>A page worth reading</h1><p id="reading">The extension should leave the rest of the page alone.</p>${body}</body></html>`;
const banner = (buttons = '<button data-choice="reject">Reject all</button><button data-choice="accept">Accept all</button>', extra = '') => `<section class="banner" id="cookie-banner" role="dialog"><h2>Your cookie choices</h2><p>We use cookies to measure visits and personalize ads.</p>${buttons}${extra}</section>`;
const handler = `<script>window.clicks=[];document.addEventListener('click',e=>{const b=e.target.closest('[data-choice]');if(b){window.clicks.push(b.dataset.choice);document.documentElement.dataset.result=b.dataset.choice;if(!b.hasAttribute('data-stuck'))b.closest('section').remove();}})</script>`;
const pages = {
  '/reject': banner()+handler,
  '/accept-only': banner('<button data-choice="accept">Accept all</button>')+handler,
  '/necessary': banner('<button data-choice="necessary">Accept necessary cookies</button><button data-choice="accept">Accept all</button>')+handler,
  '/french': banner('<button data-choice="reject">Tout refuser</button><button data-choice="accept">Tout accepter</button>')+handler,
  '/unrelated': '<section role="dialog"><h2>Accept this invitation?</h2><button data-choice="invite">Accept</button><button data-choice="decline">Decline</button></section>'+handler,
  '/article': '<article class="cookie-guide"><h2>How to reject cookies</h2><p>This article explains cookies.</p><button data-choice="article">Reject all</button></article>'+handler,
  '/account': banner('<input type="password" aria-label="Password"><button data-choice="account">Accept</button>')+handler,
  '/disabled': banner('<button disabled data-choice="reject">Reject all</button><button data-choice="accept">Accept all</button>')+handler,
  '/stuck': banner('<button data-stuck data-choice="reject">Reject all</button><button data-choice="accept">Accept all</button>')+handler,
  '/late': handler+`<script>setTimeout(()=>document.body.insertAdjacentHTML('beforeend',${JSON.stringify(banner())}),6200)</script>`,
  '/iframe': '<iframe title="Consent" width="680" height="400" src="http://127.0.0.1:4179/reject"></iframe>',
  '/srcdoc': `<iframe title="Consent" width="680" height="400" srcdoc="${shell(banner()+handler).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"></iframe>`,
  '/shadow': `<div id="host"></div><script>const root=document.querySelector('#host').attachShadow({mode:'open'});root.innerHTML=${JSON.stringify(banner())};root.addEventListener('click',e=>{document.documentElement.dataset.result=e.target.dataset.choice;root.querySelector('section').remove();});</script>`,
  '/closed-shadow': `<div id="host"></div><script>const root=document.querySelector('#host').attachShadow({mode:'closed'});root.innerHTML=${JSON.stringify(banner())};root.addEventListener('click',e=>{document.documentElement.dataset.result=e.target.dataset.choice;root.querySelector('section').remove();});</script>`,
  '/onetrust-fallback': `<div id="onetrust-banner-sdk" class="banner"><section role="dialog"><p>We use cookies.</p><button id="onetrust-accept-btn-handler" data-choice="accept">Accept all</button></section></div>`+handler,
  '/cookiebot': `<section id="CybotCookiebotDialog" class="banner" role="dialog"><p>Cookie settings</p><button id="CybotCookiebotDialogBodyLevelButtonCustomize">Customize</button><div id="options" hidden><label><input type="checkbox" checked disabled id="essential">Essential</label><label><input type="checkbox" checked id="CybotCookiebotDialogBodyLevelButtonPreferences">Preferences</label><label><input type="checkbox" checked id="CybotCookiebotDialogBodyLevelButtonStatistics">Statistics</label><label><input type="checkbox" checked id="CybotCookiebotDialogBodyLevelButtonMarketing">Marketing</label><button id="CybotCookiebotDialogBodyButtonAcceptSelected">Save choices</button></div></section><script>document.querySelector('#CybotCookiebotDialogBodyLevelButtonCustomize').onclick=()=>{document.querySelector('#options').hidden=false};document.querySelector('#CybotCookiebotDialogBodyButtonAcceptSelected').onclick=()=>{window.saved=[...document.querySelectorAll('input')].map(i=>i.checked);document.querySelector('section').remove();document.documentElement.dataset.result='saved'};</script>`,
  '/no-banner': ''
};
pages['/cookiebot-stuck'] = pages['/cookiebot'] + `<script>document.querySelector('#CybotCookiebotDialogBodyLevelButtonStatistics').addEventListener('change',e=>{e.target.checked=true})</script>`;
pages['/svg'] = '<svg width="50" height="50"><circle cx="25" cy="25" r="20"/></svg>' + banner() + handler;
pages['/govuk'] = `<section class="govuk-cookie-banner" role="region" aria-label="Cookies on GOV.UK"><h2>Cookies on GOV.UK</h2><p>We use some essential cookies.</p><button id="reject">Reject additional cookies</button><button>Accept additional cookies</button></section><script>document.querySelector('#reject').onclick=()=>{document.querySelector('section').innerHTML='<p>You have rejected additional cookies.</p><button id="hide">Hide this message</button>';document.querySelector('#hide').onclick=()=>{document.querySelector('section').remove();document.documentElement.dataset.result='rejected-and-dismissed'}};</script>`;
pages['/scam'] = '<h2>Your computer is infected</h2><p>Call technical support to unlock it.</p>' + banner() + handler;
pages['/password-page'] = '<form><label>Password<input type="password"></label></form>' + banner('<button data-choice="accept">Accept all</button>') + handler;
pages['/payment-page'] = '<form><label>Card number<input autocomplete="cc-number"></label></form>' + banner('<button data-choice="accept">Accept all</button>') + handler;
pages['/wallet-page'] = '<h2>Connect your wallet</h2>' + banner('<button data-choice="accept">Accept all</button>') + handler;
pages['/download-page'] = '<a href="/installer.dmg">Download installer</a>' + banner('<button data-choice="accept">Accept all</button>') + handler;
pages['/scam-frame'] = '<h2>Your computer is infected</h2><iframe title="Consent" width="680" height="400" src="http://127.0.0.1:4179/reject"></iframe>';
pages['/password-frame'] = '<form><label>Password<input type="password"></label></form><iframe title="Consent" width="680" height="400" src="http://127.0.0.1:4179/accept-only"></iframe>';
pages['/payment-iframe'] = '<iframe title="Payment checkout" width="300" height="100" src="http://127.0.0.1:4179/no-banner"></iframe>' + banner('<button data-choice="accept">Accept all</button>') + handler;
http.createServer((request,response)=>{
  const pathname = new URL(request.url,'http://localhost').pathname;
  response.writeHead(pathname in pages ? 200 : 404,{'Content-Type':'text/html; charset=utf-8'});
  response.end(shell(pages[pathname] ?? 'Not found'));
}).listen(4179,'0.0.0.0');
