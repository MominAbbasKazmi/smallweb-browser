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
  const [publishForm, setPublishForm] = useState({
    title: '',
    address: '',
    html: '<h1>Welcome</h1><p>Publish a page for the mini-web.</p>'
  });
  const [addressInput, setAddressInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [warning, setWarning] = useState('');

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
      return;
    }

    try {
      const results = await searchSites(query);
      setSearchResults(results);
    } catch (error) {
      setWarning(error.message || 'Search failed.');
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
      <aside className="sidebar">
        <div className="panel">
          <label htmlFor="person-select" className="label">Person</label>
          <select
            id="person-select"
            value={selectedPersonId}
            onChange={(event) => setSelectedPersonId(event.target.value)}
            className="control"
          >
            {people.map((person) => (
              <option key={person.id || person._id} value={person.id || person._id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel">
          <h3>History</h3>
          <div className="history-list">
            {historySummary.length === 0 ? (
              <p className="muted">No history yet.</p>
            ) : (
              historySummary.map((item) => (
                <button
                  key={item.id}
                  className="history-item"
                  type="button"
                  onClick={() => handleNavigate(item.address, { navigationType: 'history', fromAddress: state.currentPage?.address || null })}
                >
                  <span className="history-item__status">{item.status}</span>
                  <strong>{item.title || item.address}</strong>
                  <small>{item.address}</small>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Search</h3>
          <form onSubmit={handleSearch} className="stacked-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search published pages"
              className="control"
            />
            <button type="submit" className="primary-button">Search</button>
          </form>

          <div className="search-list">
            {searchResults.length === 0 ? (
              <p className="muted">No results yet.</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="search-result"
                  onClick={() => handleNavigate(result.address, { navigationType: 'history' })}
                >
                  <strong>{result.title}</strong>
                  <span>{result.address}</span>
                  <small>{result.excerpt}</small>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Publish</h3>
          <form onSubmit={handlePublish} className="stacked-form">
            <input
              type="text"
              value={publishForm.title}
              onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Page title"
              className="control"
            />
            <input
              type="text"
              value={publishForm.address}
              onChange={(event) => setPublishForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="address.zz"
              className="control"
            />
            <textarea
              value={publishForm.html}
              onChange={(event) => setPublishForm((current) => ({ ...current, html: event.target.value }))}
              rows={8}
              className="control textarea"
              placeholder="Write HTML..."
            />
            <button type="submit" className="primary-button">Publish</button>
          </form>
        </div>
      </aside>

      <main className="browser-panel">
        <header className="browser-toolbar">
          <div className="browser-toolbar__controls">
            <button type="button" onClick={handleBack} className="toolbar-button" disabled={state.isLoading || state.currentIndex <= 0}>
              ← Back
            </button>
            <button type="button" onClick={handleForward} className="toolbar-button" disabled={state.isLoading || state.currentIndex >= state.entries.length - 1}>
              Forward →
            </button>
            <button type="button" onClick={handleReload} className="toolbar-button toolbar-button--ghost" disabled={!state.currentPage}>
              Reload
            </button>
          </div>

          <form
            className="address-bar"
            onSubmit={(event) => {
              event.preventDefault();
              handleNavigate(addressInput, { navigationType: 'typed' });
            }}
          >
            <input
              type="text"
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              className="control address-input"
              placeholder="tidepool.zz"
            />
            <button type="submit" className="primary-button">Open</button>
          </form>
        </header>

        <div className="browser-header">
          <div>
            <p className="eyebrow">Selected page</p>
            <h2>{browserTitle}</h2>
          </div>
          {statusMessage ? <span className="status-pill">{statusMessage}</span> : null}
        </div>

        {warning ? <div className="alert-banner">{warning}</div> : null}

        <div className="browser-viewport">
          {state.isLoading ? (
            <div className="browser-empty">Loading page…</div>
          ) : state.currentPage && state.currentPage.status === 'not_found' ? (
            <div className="browser-empty browser-empty--warning">
              <h3>Page not found</h3>
              <p>The address {state.currentPage.address} is not currently published in the mini-web.</p>
            </div>
          ) : state.currentPage && state.currentPage.html ? (
            <HtmlPageFrame
              page={state.currentPage}
              key={state.currentPage.visitId || state.currentPage.address}
              onNavigate={(address) => handleNavigate(address, { navigationType: 'link', fromAddress: state.currentPage?.address || null })}
              onScroll={(scrollY, visitId) => updateScrollPosition(scrollY, visitId)}
            />
          ) : (
            <div className="browser-empty">
              <h3>No page loaded</h3>
              <p>Select a person or open an address to begin browsing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
