import { normalizeAddress } from './address.js';

export function handleMiniWebLinkClick(event, link, { onNavigate, onUnsupportedLink }) {
  const address = link.dataset.miniwebAddress || normalizeAddress(link.getAttribute('href'));
  if (address) {
    event.preventDefault();
    onNavigate(address);
    return;
  }

  if (link.dataset.unsupportedLink === 'true') {
    event.preventDefault();
    onUnsupportedLink();
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) {
    return;
  }

  event.preventDefault();
  onUnsupportedLink();
}
