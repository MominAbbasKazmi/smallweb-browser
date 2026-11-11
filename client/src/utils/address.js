const ADDRESS_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function normalizeAddress(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('://') || trimmed.startsWith('//') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return null;
  }

  if (trimmed.includes('@') || trimmed.includes('?') || trimmed.includes('#') || trimmed.includes(' ')) {
    return null;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (!withoutTrailingSlash) {
    return null;
  }

  if (withoutTrailingSlash.includes('/')) {
    return null;
  }

  const lower = withoutTrailingSlash.toLowerCase();
  const labels = lower.split('.');

  if (labels.length < 2 || labels.at(-1) !== 'zz') {
    return null;
  }

  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return null;
  }

  if (!ADDRESS_PATTERN.test(lower)) {
    return null;
  }

  return lower;
}

export function isValidAddress(value) {
  return Boolean(normalizeAddress(value));
}
