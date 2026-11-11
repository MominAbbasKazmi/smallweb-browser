import { useCallback, useReducer, useRef } from 'react';
import { browserReducer, initialBrowserState } from '../features/navigation/browserReducer.js';
import { savePersonSession, saveSessionScroll, recordVisit } from '../services/apiClient.js';
import { normalizeAddress } from '../utils/address.js';

export function useBrowserNavigation(personId) {
  const [state, dispatch] = useReducer(browserReducer, initialBrowserState);
  const requestId = useRef(0);
  const personIdRef = useRef(personId);
  if (personIdRef.current !== personId) {
    personIdRef.current = personId;
    requestId.current += 1;
  }

  const persistSession = useCallback(async (entries, currentIndex) => {
    if (!personId || !Array.isArray(entries)) {
      return;
    }

    try {
      await savePersonSession(personId, { entries, currentIndex });
    } catch (error) {
      console.warn('Failed to persist browser session', error.message);
    }
  }, [personId]);

  const restoreSession = useCallback((session) => {
    requestId.current += 1;
    dispatch({
      type: 'RESTORE_SESSION',
      entries: session?.entries || [],
      currentIndex: Number.isInteger(session?.currentIndex) ? session.currentIndex : -1
    });
  }, []);

  const navigateToAddress = useCallback(async (rawAddress, options = {}) => {
    const resolvedAddress = normalizeAddress(rawAddress);
    const activeRequestId = ++requestId.current;
    if (!resolvedAddress) {
      dispatch({
        type: 'NAVIGATION_STARTED',
        requestId: activeRequestId
      });
      dispatch({
        type: 'NAVIGATION_FAILED',
        requestId: activeRequestId,
        error: 'Enter a valid .zz address to continue.'
      });
      return null;
    }

    const nextEntries = [...state.entries];
    dispatch({ type: 'NAVIGATION_STARTED', requestId: activeRequestId });

    try {
      const visit = await recordVisit({
        personId,
        address: resolvedAddress,
        navigationType: options.navigationType || 'typed',
        fromAddress: options.fromAddress || null
      });

      if (!visit) {
        throw new Error('Could not record the visit.');
      }

      if (activeRequestId !== requestId.current) {
        return null;
      }

      const nextEntry = {
        address: visit.address,
        visitId: visit.id,
        title: visit.page?.title || resolvedAddress,
        status: visit.status || 'success',
        scrollY: 0
      };

      const trimmedEntries = nextEntries.slice(0, state.currentIndex + 1);
      const finalEntries = [...trimmedEntries, nextEntry];

      dispatch({
        type: 'NAVIGATION_SUCCEEDED',
        requestId: activeRequestId,
        entries: finalEntries,
        page: visit.page ? {
          ...visit.page,
          address: visit.address,
          title: visit.page.title || resolvedAddress,
          status: visit.status || 'success',
          html: null
        } : {
          address: visit.address,
          title: nextEntry.title,
          status: visit.status || 'success',
          html: null
        }
      });

      await persistSession(finalEntries, finalEntries.length - 1);
      return visit;
    } catch (error) {
      if (activeRequestId !== requestId.current) {
        return null;
      }

      dispatch({
        type: 'NAVIGATION_FAILED',
        requestId: activeRequestId,
        error: error.message || 'Navigation failed.'
      });
      return null;
    }
  }, [state.currentIndex, state.entries, personId, persistSession]);

  const goBack = useCallback(async () => {
    if (state.currentIndex <= 0) {
      return false;
    }

    requestId.current += 1;
    const nextEntries = [...state.entries];
    const nextIndex = state.currentIndex - 1;
    const currentEntry = nextEntries[state.currentIndex];
    if (currentEntry) {
      currentEntry.scrollY = currentEntry.scrollY ?? 0;
    }

    dispatch({ type: 'GO_BACK' });
    await persistSession(nextEntries, nextIndex);
    return true;
  }, [persistSession, state.currentIndex, state.entries]);

  const goForward = useCallback(async () => {
    if (state.currentIndex >= state.entries.length - 1) {
      return false;
    }

    requestId.current += 1;
    const nextEntries = [...state.entries];
    const currentEntry = nextEntries[state.currentIndex];
    if (currentEntry) {
      currentEntry.scrollY = currentEntry.scrollY ?? 0;
    }

    const nextIndex = state.currentIndex + 1;
    dispatch({ type: 'GO_FORWARD' });
    await persistSession(nextEntries, nextIndex);
    return true;
  }, [persistSession, state.currentIndex, state.entries]);

  const updateScrollPosition = useCallback(async (scrollY, visitId) => {
    if (!Number.isFinite(scrollY)) {
      return;
    }

    dispatch({ type: 'UPDATE_SCROLL', scrollY, visitId });

    const entry = visitId
      ? state.entries.find((candidate) => candidate.visitId === visitId)
      : state.entries[state.currentIndex];
    if (!personId || !entry) {
      return;
    }

    try {
      await saveSessionScroll(personId, {
        address: entry.address,
        visitId: entry.visitId,
        scrollY
      });
    } catch (error) {
      console.warn('Failed to save scroll position', error.message);
    }
  }, [personId, state.currentIndex, state.entries]);

  const setCurrentPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', page });
  }, []);

  return {
    state,
    restoreSession,
    navigateToAddress,
    goBack,
    goForward,
    updateScrollPosition,
    setCurrentPage
  };
}
