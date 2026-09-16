export const DEFAULTS = Object.freeze({ enabled: true, mode: 'reject', disabledSites: [] });

export function normalizeSettings(value = {}) {
  return {
    enabled: value.enabled !== false,
    mode: value.mode === 'dismiss' ? 'dismiss' : 'reject',
    disabledSites: Array.isArray(value.disabledSites)
      ? [...new Set(value.disabledSites.filter(host => typeof host === 'string' && host.length < 254))]
      : []
  };
}

export function hostname(url) {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.hostname : '';
  } catch { return ''; }
}

export function isEnabled(settings, host) {
  return Boolean(host && settings.enabled && !settings.disabledSites.includes(host));
}

export async function getSettings() {
  const result = await chrome.storage.local.get('settings');
  return normalizeSettings(result.settings);
}
