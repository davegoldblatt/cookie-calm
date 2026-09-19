// A provider frame may disappear during Save. The top document can still observe
// its changed first-party receipt. No raw receipt leaves this short-lived reader.
export class ConsentReceipts {
  constructor(active,report) { this.active=active;this.report=report;this.watches=new Map(); }
  clear() { for(const watch of this.watches.values()) clearTimeout(watch.timer);this.watches.clear(); }
  cancel(token) { const watch=this.watches.get(token);if(watch)clearTimeout(watch.timer);this.watches.delete(token); }
  watch({token,siteId}) {
    if(window!==window.top || !this.active() || !/^\d{1,12}$/.test(siteId || '') || typeof token!=='string' || token.length>120) return false;
    if(this.watches.size>=4) return false;
    const key=`_sp_user_consent_${siteId}`,url=location.href;
    let before;
    try { before=localStorage.getItem(key); } catch { return false; }
    const watch={started:Date.now(),timer:null};this.watches.set(token,watch);
    const poll=()=>{
      if(!this.watches.has(token))return;
      if(!this.active() || location.href!==url || Date.now()-watch.started>8000) {this.cancel(token);return;}
      try {
        const raw=localStorage.getItem(key), status=raw && JSON.parse(raw)?.usnat?.consentStatus;
        if(raw && raw!==before && status?.hasConsentData===true && status.rejectedAny===true &&
            status.consentedToAll===false && status.granularStatus?.sellStatus===false && status.granularStatus?.shareStatus===false) {
          this.cancel(token);this.report({provider:'sourcepoint-us',flow:token,category:'consent',outcome:'saved',reason:''});return;
        }
      } catch {}
      watch.timer=setTimeout(poll,200);
    };
    watch.timer=setTimeout(poll,200);
    return true;
  }
}
