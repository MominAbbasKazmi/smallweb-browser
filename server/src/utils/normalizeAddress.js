const ADDRESS_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function normalizeAddress(value) {
  if (typeof value !== 'string') {
    throw new Error('Address must be a string.');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Address is required.');
  }

  if (trimmed.includes('://') || trimmed.startsWith('//') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    throw new Error('Protocols and relative paths are not allowed.');
  }

  if (trimmed.includes('@') || trimmed.includes('?') || trimmed.includes('#') || trimmed.includes(' ')) {
    throw new Error('Address must not contain credentials, query strings, fragments, or spaces.');
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  if (!withoutTrailingSlash) {
    throw new Error('Address is invalid.');
  }

  if (withoutTrailingSlash.includes('/')) {
    throw new Error('Address must not contain a path.');
  }

  const lower = withoutTrailingSlash.toLowerCase();
  const labels = lower.split('.');

  if (labels.length < 2 || labels.at(-1) !== 'zz') {
    throw new Error('Address must end with .zz.');
  }

  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    throw new Error('Address labels must be between 1 and 63 characters long.');
  }

  if (!ADDRESS_PATTERN.test(lower)) {
    throw new Error('Address contains invalid characters or label formatting.');
  }

  return lower;
}

export function isValidAddress(value) {
  try {
    normalizeAddress(value);
    return true;
  } catch {
    return false;
  }
}
