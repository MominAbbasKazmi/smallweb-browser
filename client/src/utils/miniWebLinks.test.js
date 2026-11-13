import { describe, expect, it, vi } from 'vitest';
import { handleMiniWebLinkClick } from './miniWebLinks.js';

function createLink({ href, miniWebAddress, unsupportedLink } = {}) {
  return {
    dataset: {
      miniwebAddress: miniWebAddress,
      unsupportedLink: unsupportedLink
    },
    getAttribute: vi.fn(() => href)
  };
}

describe('mini-web page links', () => {
  it('navigates to internal addresses without allowing iframe navigation', () => {
    const event = { preventDefault: vi.fn() };
    const onNavigate = vi.fn();

    handleMiniWebLinkClick(event, createLink({ miniWebAddress: 'tidepool.zz' }), {
      onNavigate,
      onUnsupportedLink: vi.fn()
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('tidepool.zz');
  });

  it('blocks unsupported destinations and reports them to the browser', () => {
    const event = { preventDefault: vi.fn() };
    const onUnsupportedLink = vi.fn();

    handleMiniWebLinkClick(event, createLink({ href: '#unsupported-link', unsupportedLink: 'true' }), {
      onNavigate: vi.fn(),
      onUnsupportedLink
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onUnsupportedLink).toHaveBeenCalledOnce();
  });

  it('keeps in-page fragment navigation local to the iframe', () => {
    const event = { preventDefault: vi.fn() };

    handleMiniWebLinkClick(event, createLink({ href: '#notes' }), {
      onNavigate: vi.fn(),
      onUnsupportedLink: vi.fn()
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
