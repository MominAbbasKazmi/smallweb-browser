import { describe, expect, it } from 'vitest';
import { browserReducer, initialBrowserState } from './browserReducer.js';

const entries = [
  { address: 'one.zz', visitId: 'visit-1', title: 'One', status: 'success', scrollY: 120 },
  { address: 'missing.zz', visitId: 'visit-2', title: 'missing.zz', status: 'not_found', scrollY: 0 },
  { address: 'three.zz', visitId: 'visit-3', title: 'Three', status: 'success', scrollY: 0 }
];

function navigate(state, nextEntries, requestId) {
  const started = browserReducer(state, { type: 'NAVIGATION_STARTED', requestId });
  return browserReducer(started, {
    type: 'NAVIGATION_SUCCEEDED',
    requestId,
    entries: nextEntries
  });
}

describe('browserReducer', () => {
  it('starts with an empty browser session', () => {
    expect(initialBrowserState.entries).toEqual([]);
    expect(initialBrowserState.currentIndex).toBe(-1);
    expect(initialBrowserState.currentPage).toBeNull();
  });

  it('restores a session and clamps an invalid current index', () => {
    const restored = browserReducer(initialBrowserState, {
      type: 'RESTORE_SESSION',
      entries,
      currentIndex: 99
    });

    expect(restored.currentIndex).toBe(2);
    expect(restored.currentPage.address).toBe('three.zz');
  });

  it('moves backward and forward without changing the visit entries', () => {
    const state = navigate(initialBrowserState, entries, 1);
    const back = browserReducer(state, { type: 'GO_BACK' });
    const forward = browserReducer(back, { type: 'GO_FORWARD' });

    expect(back.currentIndex).toBe(1);
    expect(back.currentPage.status).toBe('not_found');
    expect(forward.currentIndex).toBe(2);
    expect(forward.entries).toEqual(entries);
  });

  it('updates scroll on the matching entry, even after navigation moves', () => {
    const state = navigate(initialBrowserState, entries, 1);
    const updated = browserReducer(state, {
      type: 'UPDATE_SCROLL',
      visitId: 'visit-2',
      scrollY: 340
    });

    expect(updated.entries[1].scrollY).toBe(340);
    expect(updated.entries[2].scrollY).toBe(0);
    expect(updated.currentIndex).toBe(2);
  });

  it('ignores stale navigation responses', () => {
    const state = browserReducer(initialBrowserState, {
      type: 'NAVIGATION_STARTED',
      requestId: 2
    });
    const stale = browserReducer(state, {
      type: 'NAVIGATION_SUCCEEDED',
      requestId: 1,
      entries
    });

    expect(stale).toBe(state);
  });

  it('does not move beyond either end of the session', () => {
    const state = navigate(initialBrowserState, entries, 1);
    const atStart = browserReducer({ ...state, currentIndex: 0 }, { type: 'GO_BACK' });
    const atEnd = browserReducer(state, { type: 'GO_FORWARD' });

    expect(atStart.currentIndex).toBe(0);
    expect(atEnd.currentIndex).toBe(2);
  });
});
