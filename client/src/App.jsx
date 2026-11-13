import { useEffect, useMemo, useRef, useState } from 'react';
import { useBrowserNavigation } from './hooks/useBrowserNavigation.js';
import {
  getHistoryForPerson,
  getPeople,
  getPersonSession,
  getSiteByAddress,
  publishSite,
  searchSites
} from './services/apiClient.js';
import { normalizeAddress } from './utils/address.js';

function buildFrameDocument(html = '') {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #f8fafc;
            color: #0f172a;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
          }
          body {
            padding: 1rem 1.25rem;
          }
          a {
            color: #1d4ed8;
            text-decoration: underline;
          }
          h1, h2, h3, h4 {
            margin: 0 0 0.75rem;
            line-height: 1.2;
          }
          p, ul, ol, blockquote, pre {
            margin: 0 0 1rem;
          }
          pre {
            background: #f1f5f9;
            padding: 0.75rem;
            border-radius: 10px;
            overflow: auto;
          }
          code {
            font-family: ui-monospace, SFMono-Regular, 'SFMono-Regular', Consolas, monospace;
            background: #f1f5f9;
            padding: 0.1rem 0.3rem;
            border-radius: 4px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>${html}</body>
    </html>`;
}

function HtmlPageFrame({ page, onNavigate, onScroll }) {
  const iframeRef = useRef(null);
  const callbacksRef = useRef({ onNavigate, onScroll });
  callbacksRef.current = { onNavigate, onScroll };

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame || !page || !page.html) {
      return undefined;
    }

    let scrollTimer;
    let cleanupDocument;

    const handleLoad = () => {
      const doc = frame.contentDocument;
      if (!doc) {
        return;
      }

      const getScrollY = () => {
        if (!doc.scrollingElement) {
          return doc.documentElement?.scrollTop || doc.body?.scrollTop || 0;
        }

        return doc.scrollingElement.scrollTop || 0;
      };

      const syncScroll = () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => callbacksRef.current.onScroll(getScrollY(), page.visitId), 150);
      };

      const clickHandler = (event) => {
        const link = event.target.closest('a');
        if (!link) {
          return;
        }

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) {
          return;
        }

        const match = normalizeAddress(href);
        if (!match) {
          event.preventDefault();
          return;
        }

        event.preventDefault();
        callbacksRef.current.onNavigate(match);
      };

      doc.addEventListener('scroll', syncScroll, { passive: true });
      doc.addEventListener('click', clickHandler);

      const restoredScroll = Math.max(0, page.scrollY || 0);
      if (doc.scrollingElement) {
        doc.scrollingElement.scrollTop = restoredScroll;
      } else {
        doc.documentElement.scrollTop = restoredScroll;
        doc.body.scrollTop = restoredScroll;
      }

      return () => {
        doc.removeEventListener('scroll', syncScroll);
        doc.removeEventListener('click', clickHandler);
      };
    };

    const onFrameLoad = () => {
      cleanupDocument?.();
      cleanupDocument = handleLoad();
    };

    frame.addEventListener('load', onFrameLoad);
    if (frame.contentDocument?.readyState === 'complete') {
      onFrameLoad();
    }

    return () => {
      window.clearTimeout(scrollTimer);
      if (frame.contentDocument) {
        const doc = frame.contentDocument;
        const currentScroll = doc.scrollingElement?.scrollTop || doc.documentElement?.scrollTop || doc.body?.scrollTop || 0;
        callbacksRef.current.onScroll(currentScroll, page.visitId);
      }
      cleanupDocument?.();
      frame.removeEventListener('load', onFrameLoad);
    };
  }, [page.address, page.html, page.scrollY, page.visitId]);

  return (
    <iframe
      key={page.visitId || page.address}
      ref={iframeRef}
      title={page?.title || 'mini-web page'}
      sandbox="allow-same-origin"
      srcDoc={buildFrameDocument(page?.html || '')}
      className="browser-viewport__frame"
    />
  );
}

export default function App() {
  const pageLoadId = useRef(0);
  const personLoadId = useRef(0);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    address: '',
    html: '<h1>Welcome</h1><p>Publish a page for the mini-web.</p>'
  });
  const [addressInput, setAddressInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [warning, setWarning] = useState('');
  const [sidebarView, setSidebarView] = useState('history');
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  const { state, restoreSession, navigateToAddress, goBack, goForward, updateScrollPosition, setCurrentPage } = useBrowserNavigation(selectedPersonId);

  const historySummary = useMemo(() => history.slice(0, 18), [history]);

  const loadPageForAddress = async (address, fallbackTitle = 'Page', fallbackStatus = 'success', scrollY = 0, visitId = null) => {
    const loadId = ++pageLoadId.current;
    try {
      const page = await getSiteByAddress(address);
      if (loadId !== pageLoadId.current) {
        return;
      }

      if (page) {
        setCurrentPage({
          ...page,
          address: page.address,
          title: page.title || fallbackTitle,
          status: fallbackStatus,
          html: page.html,
          scrollY,
          visitId
        });
        return;
      }

      setCurrentPage({
        address,
        title: fallbackTitle || 'Not found',
        status: 'not_found',
        html: null,
        scrollY,
        visitId
      });
    } catch (error) {
      if (loadId !== pageLoadId.current) {
        return;
      }

      setCurrentPage({
        address,
        title: fallbackTitle || 'Not found',
        status: 'not_found',
        html: null,
        scrollY,
        visitId
      });
    }
  };

  const loadPersonView = async (personId) => {
    if (!personId) {
      return;
    }

    const loadId = ++personLoadId.current;
    pageLoadId.current += 1;
    try {
      const session = await getPersonSession(personId);
      if (loadId !== personLoadId.current) {
        return;
      }

      restoreSession(session);

      const activeEntry = session.entries?.[session.currentIndex] ?? null;
      if (activeEntry?.address) {
        await loadPageForAddress(activeEntry.address, activeEntry.title, activeEntry.status, activeEntry.scrollY, activeEntry.visitId);
      }

      const nextHistory = await getHistoryForPerson(personId);
      if (loadId !== personLoadId.current) {
        return;
      }
      setHistory(nextHistory);
    } catch (error) {
      if (loadId === personLoadId.current) {
        setWarning(error.message || 'Could not load this person’s browser view.');
      }
    }
  };

  useEffect(() => {
    const loadPeople = async () => {
      try {
        const values = await getPeople();
        setPeople(values || []);
        if (values.length > 0) {
          setSelectedPersonId(values[0].id || values[0]._id || values[0].personId);
        }
      } catch (error) {
        setWarning(error.message || 'Could not load people.');
      }
    };

    loadPeople();
  }, []);

  useEffect(() => {
    if (!selectedPersonId) {
      return;
    }

    loadPersonView(selectedPersonId);
  }, [selectedPersonId]);

  useEffect(() => {
    if (state.currentPage?.address) {
      setAddressInput(state.currentPage.address);
    }
  }, [state.currentPage?.address]);

  const handleNavigate = async (rawAddress, options = {}) => {
    const normalized = normalizeAddress(rawAddress);
    if (!normalized) {
      setWarning('Enter a valid .zz address.');
      return;
    }

    setWarning('');
    const visit = await navigateToAddress(normalized, options);
    if (!visit) {
      return;
    }

    await loadPageForAddress(visit.address, visit.page?.title || normalized, visit.status || 'success', 0, visit.id);
    const nextHistory = await getHistoryForPerson(selectedPersonId);
    setHistory(nextHistory);
  };

  const handleBack = async () => {
    if (state.currentIndex <= 0) {
      return;
    }

    const target = state.entries[state.currentIndex - 1];
    const didMove = await goBack();
    if (!didMove || !target) {
      return;
    }

    await loadPageForAddress(target.address, target.title, target.status, target.scrollY, target.visitId);
  };

  const handleForward = async () => {
    if (state.currentIndex >= state.entries.length - 1) {
      return;
    }

    const target = state.entries[state.currentIndex + 1];
    const didMove = await goForward();
    if (!didMove || !target) {
      return;
    }

    await loadPageForAddress(target.address, target.title, target.status, target.scrollY, target.visitId);
  };

  const handleReload = () => {
    const currentEntry = state.entries[state.currentIndex];
    if (currentEntry) {
      loadPageForAddress(currentEntry.address, currentEntry.title, currentEntry.status, currentEntry.scrollY, currentEntry.visitId);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setWarning('');
    try {
      const results = await searchSites(query);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      setWarning(error.message || 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!selectedPersonId) {
      setWarning('Select a person before publishing.');
      return;
    }

    const address = normalizeAddress(publishForm.address);
    if (!address) {
      setWarning('Use a valid .zz address in the publish form.');
      return;
    }

    try {
      await publishSite({
        title: publishForm.title.trim(),
        address,
        html: publishForm.html,
        authorId: selectedPersonId
      });

      setStatusMessage('Page published successfully.');
      setIsPublishOpen(false);
      setPublishForm({
        title: '',
        address: '',
        html: '<h1>Welcome</h1><p>Publish a page for the mini-web.</p>'
      });
      await handleNavigate(address, { navigationType: 'publish' });
    } catch (error) {
      setWarning(error.message || 'Publishing failed.');
    }
  };

  const browserTitle = state.currentPage?.title || 'Mini-web browser';

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()} aria-label="SmallWeb home">
          <span className="brand-mark" aria-hidden="true">s</span>
          <span>smallweb</span>
        </a>
        <p className="header-note">A little corner of the internet, made by people.</p>
        <div className="header-actions">
          <label className="person-picker">
            <span>Browsing as</span>
            <select
              id="person-select"
              value={selectedPersonId}
              onChange={(event) => setSelectedPersonId(event.target.value)}
              aria-label="Choose a person"
              disabled={people.length === 0}
            >
              {people.map((person) => (
                <option key={person.id || person._id} value={person.id || person._id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="publish-trigger" onClick={() => setIsPublishOpen(true)}>
            <span aria-hidden="true">＋</span> Write a page
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">Your little web</p>
              <h2>Explore</h2>
            </div>
            <span className="history-count">{history.length}</span>
          </div>

          <div className="sidebar-tabs" role="tablist" aria-label="Explore pages">
            <button
              type="button"
              role="tab"
              aria-selected={sidebarView === 'history'}
              className={sidebarView === 'history' ? 'sidebar-tab is-active' : 'sidebar-tab'}
              onClick={() => setSidebarView('history')}
            >
              History
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarView === 'search'}
              className={sidebarView === 'search' ? 'sidebar-tab is-active' : 'sidebar-tab'}
              onClick={() => setSidebarView('search')}
            >
              Find a page
            </button>
          </div>

          {sidebarView === 'history' ? (
            <section className="sidebar-content" role="tabpanel" aria-label="Browsing history">
              {historySummary.length === 0 ? (
                <div className="sidebar-empty">
                  <span className="empty-glyph" aria-hidden="true">↗</span>
                  <p>Your story starts here.</p>
                  <small>Pages you visit will find a home in this list.</small>
                </div>
              ) : (
                <div className="history-list">
                  {historySummary.map((item) => (
                    <button
                      key={item.id}
                      className="history-item"
                      type="button"
                      onClick={() => handleNavigate(item.address, { navigationType: 'history', fromAddress: state.currentPage?.address || null })}
                    >
                      <span className={`history-item__status ${item.status === 'not_found' ? 'is-missing' : ''}`}>
                        <span className="status-dot" aria-hidden="true" />
                        {item.status === 'not_found' ? 'Not found' : 'Visited'}
                      </span>
                      <strong>{item.title || item.address}</strong>
                      <small className="mono">{item.address}</small>
                      <small className="history-date">{new Date(item.visitedAt).toLocaleString()}</small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="sidebar-content" role="tabpanel" aria-label="Search pages">
              <p className="sidebar-intro">Look through the pages people have made.</p>
              <form onSubmit={handleSearch} className="search-form">
                <label className="sr-only" htmlFor="page-search">Search page titles and content</label>
                <input
                  id="page-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Try “tidepool”…"
                  className="control"
                />
                <button type="submit" className="search-submit" disabled={isSearching} aria-label="Search">
                  {isSearching ? '…' : '↗'}
                </button>
              </form>
              <div className="search-list">
                {searchResults.length === 0 ? (
                  <div className="search-empty">
                    {hasSearched ? 'Nothing turned up. Try another word.' : 'Search a word, a place, or an idea.'}
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="search-result"
                      onClick={() => handleNavigate(result.address, { navigationType: 'history' })}
                    >
                      <span className="search-result__type">Page · {result.author}</span>
                      <strong>{result.title}</strong>
                      <span className="mono">{result.address}</span>
                      <small>{result.excerpt}</small>
                    </button>
                  ))
                )}
              </div>
            </section>
          )}

          <div className="sidebar-foot">
            <span className="foot-mark" aria-hidden="true">✳</span>
            <p>Small pages. Curious people.<br />No outside internet, just this one.</p>
          </div>
        </aside>

        <main className="browser-panel">
          <header className="browser-toolbar">
            <div className="browser-toolbar__controls">
              <button type="button" onClick={handleBack} className="toolbar-button" aria-label="Go back" title="Go back" disabled={state.isLoading || state.currentIndex <= 0}>
                ‹
              </button>
              <button type="button" onClick={handleForward} className="toolbar-button" aria-label="Go forward" title="Go forward" disabled={state.isLoading || state.currentIndex >= state.entries.length - 1}>
                ›
              </button>
              <button type="button" onClick={handleReload} className="toolbar-button toolbar-button--reload" aria-label="Reload page" title="Reload page" disabled={!state.currentPage}>
                ↻
              </button>
            </div>

            <form
              className="address-bar"
              onSubmit={(event) => {
                event.preventDefault();
                handleNavigate(addressInput, { navigationType: 'typed' });
              }}
            >
              <span className="address-symbol" aria-hidden="true">⌕</span>
              <label className="sr-only" htmlFor="address-input">Mini-web address</label>
              <input
                id="address-input"
                type="text"
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                className="address-input"
                placeholder="type an address, like tidepool.zz"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" className="open-button" disabled={state.isLoading}>Go</button>
            </form>
          </header>

          <div className="page-heading">
            <div className="page-heading__title">
              <div className="page-meta">
                <span className={`page-status ${state.currentPage?.status === 'not_found' ? 'is-missing' : ''}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {state.currentPage ? (state.currentPage.status === 'not_found' ? 'Unpublished address' : 'Inside the small web') : 'Ready when you are'}
                </span>
                {state.currentPage?.address ? <span className="mono page-address">{state.currentPage.address}</span> : null}
              </div>
              <h1>{browserTitle}</h1>
            </div>
            {statusMessage ? <span className="status-pill">{statusMessage}</span> : null}
          </div>

          {warning ? <div className="alert-banner" role="alert">{warning}</div> : null}

          <div className="browser-viewport">
            {state.isLoading ? (
              <div className="browser-empty">
                <span className="loading-mark" aria-hidden="true">✳</span>
                <h3>Finding your way…</h3>
                <p>One moment while this little page arrives.</p>
              </div>
            ) : state.currentPage && state.currentPage.status === 'not_found' ? (
              <div className="browser-empty browser-empty--warning">
                <span className="not-found-mark" aria-hidden="true">?</span>
                <p className="eyebrow">A small dead end</p>
                <h3>This page hasn’t been made yet.</h3>
                <p><span className="mono">{state.currentPage.address}</span> isn’t part of the small web. You can try another address, or make this one yours.</p>
                <button type="button" className="text-button" onClick={() => {
                  setPublishForm((current) => ({ ...current, address: state.currentPage.address }));
                  setIsPublishOpen(true);
                }}>Make this page <span aria-hidden="true">↗</span></button>
              </div>
            ) : state.currentPage && state.currentPage.html ? (
              <HtmlPageFrame
                page={state.currentPage}
                key={state.currentPage.visitId || state.currentPage.address}
                onNavigate={(address) => handleNavigate(address, { navigationType: 'link', fromAddress: state.currentPage?.address || null })}
                onScroll={(scrollY, visitId) => updateScrollPosition(scrollY, visitId)}
              />
            ) : (
              <div className="browser-empty browser-empty--welcome">
                <span className="welcome-sun" aria-hidden="true">✳</span>
                <p className="eyebrow">Welcome to the small web</p>
                <h3>A slower kind of browsing.</h3>
                <p>Ten little corners, made by four curious people.<br />Type an address or wander through a page.</p>
                <div className="suggested-addresses">
                  {['tidepool.zz', 'nightgarden.zz', 'littleatlas.zz'].map((address) => (
                    <button key={address} type="button" onClick={() => handleNavigate(address, { navigationType: 'typed' })}>
                      {address}<span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <footer className="browser-footer">
            <span>{state.currentPage?.address || 'The small web is yours to explore.'}</span>
            <span>{state.currentIndex >= 0 ? `${state.currentIndex + 1} of ${state.entries.length} in this journey` : 'No pages visited yet'}</span>
          </footer>
        </main>
      </section>

      {isPublishOpen ? (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsPublishOpen(false);
        }}>
          <section className="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Add to the little web</p>
                <h2 id="publish-title">Make a page</h2>
                <p>Something you know, a place you love, a thought worth keeping.</p>
              </div>
              <button type="button" className="dialog-close" aria-label="Close publish dialog" onClick={() => setIsPublishOpen(false)}>×</button>
            </div>
            <form onSubmit={handlePublish} className="publish-form">
              <label>
                <span>Page title</span>
                <input
                  type="text"
                  value={publishForm.title}
                  onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="A title that feels like you"
                  className="control"
                  required
                  minLength={2}
                  maxLength={200}
                />
              </label>
              <label>
                <span>Address <small>ends in .zz</small></span>
                <input
                  type="text"
                  value={publishForm.address}
                  onChange={(event) => setPublishForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="your-place.zz"
                  className="control mono"
                  required
                />
              </label>
              <label>
                <span>Your page <small>simple HTML is welcome</small></span>
                <textarea
                  value={publishForm.html}
                  onChange={(event) => setPublishForm((current) => ({ ...current, html: event.target.value }))}
                  rows={9}
                  className="control textarea mono"
                  placeholder="<h1>Hello, small web</h1>"
                  required
                />
              </label>
              <div className="dialog-actions">
                <button type="button" className="cancel-button" onClick={() => setIsPublishOpen(false)}>Not now</button>
                <button type="submit" className="publish-submit">Publish page <span aria-hidden="true">↗</span></button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
