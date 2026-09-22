// The policy deals in permission, independently of switch polarity or markup.
const OPTIONAL = new Set(['preferences','functional','performance','analytics','advertising','sale-sharing','other']);

export function preferenceGoal(preference) {
  if (preference.purpose === 'essential') return true;
  if (!OPTIONAL.has(preference.purpose) || typeof preference.grantsWhen !== 'boolean') return null;
  return !preference.grantsWhen;
}

export function shape(snapshot) {
  return JSON.stringify((snapshot.preferences || []).map(p => [p.id,p.purpose,p.grantsWhen,Boolean(p.observed)]).sort((a,b)=>a[0].localeCompare(b[0])));
}

export function plan(snapshot) {
  if (!snapshot || snapshot.stage === 'unsupported') return {type:'stop', reason:snapshot?.reason || 'unrecognized-controls'};
  if (snapshot.stage === 'blocked') return {type:'stop', reason:snapshot.reason || 'protected'};
  if (snapshot.stage === 'notice') return snapshot.open ? {type:'open', id:'open', control:snapshot.open} : {type:'stop',reason:'no-settings-control'};
  if (snapshot.stage === 'reject' && snapshot.effect === 'deny-optional') return {type:'reject',id:'reject',control:snapshot.reject};
  if (snapshot.stage === 'dismiss') return {type:'dismiss', id:'dismiss', control:snapshot.dismiss};
  if (snapshot.stage !== 'preferences') return {type:'stop',reason:'unrecognized-controls'};
  const preferences = snapshot.preferences || [];
  if (!preferences.length || new Set(preferences.map(p=>p.id)).size !== preferences.length) return {type:'stop',reason:'unknown-preferences'};
  for (const p of preferences) {
    const goal = preferenceGoal(p);
    if (goal === null || typeof p.value !== 'boolean' || (p.purpose === 'essential' && !p.value)) return {type:'stop',reason:'unknown-preferences'};
  }
  const preference = preferences.find(p=>!p.observed && p.value !== preferenceGoal(p));
  if (preference) return {type:'set-preference',id:preference.id,goal:preferenceGoal(preference),control:preference.control};
  if (preferences.some(p=>p.observed && p.value !== preferenceGoal(p))) return {type:'stop',reason:'inconsistent-preferences'};
  return snapshot.save ? {type:'save',id:'save',control:snapshot.save} : {type:'stop',reason:'no-save-control'};
}
