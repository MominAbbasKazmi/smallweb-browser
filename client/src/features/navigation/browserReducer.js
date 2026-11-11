export const initialBrowserState = {
  entries: [],
  currentIndex: -1,
  currentPage: null,
  isLoading: false,
  error: null,
  activeRequestId: null
};

export function browserReducer(state, action) {
  switch (action.type) {
    case 'RESTORE_SESSION': {
      const entries = Array.isArray(action.entries) ? action.entries : [];
      const currentIndex = entries.length === 0
        ? -1
        : Number.isInteger(action.currentIndex)
          ? Math.min(Math.max(action.currentIndex, 0), entries.length - 1)
          : -1;
      const activeEntry = entries[currentIndex] ?? null;
      return {
        ...state,
        entries,
        currentIndex,
        currentPage: action.currentPage ?? (activeEntry ? {
          address: activeEntry.address,
          title: activeEntry.title,
          status: activeEntry.status,
          html: null
        } : null),
        isLoading: false,
        error: null,
        activeRequestId: null
      };
    }

    case 'NAVIGATION_STARTED':
      return {
        ...state,
        isLoading: true,
        error: null,
        activeRequestId: action.requestId
      };

    case 'NAVIGATION_SUCCEEDED': {
      if (action.requestId !== state.activeRequestId) {
        return state;
      }

      const entries = Array.isArray(action.entries) && action.entries.length > 0
        ? action.entries
        : [...state.entries];
      const lastEntry = entries[entries.length - 1] ?? null;
      return {
        ...state,
        entries,
        currentIndex: entries.length - 1,
        currentPage: action.page ?? (lastEntry ? {
          address: lastEntry.address,
          title: lastEntry.title,
          status: lastEntry.status,
          html: null
        } : null),
        isLoading: false,
        error: null,
        activeRequestId: null
      };
    }

    case 'NAVIGATION_FAILED':
      if (action.requestId !== state.activeRequestId) {
        return state;
      }

      return {
        ...state,
        isLoading: false,
        error: action.error || 'Navigation failed.',
        activeRequestId: null
      };

    case 'GO_BACK': {
      if (state.currentIndex <= 0) {
        return state;
      }

      const nextIndex = state.currentIndex - 1;
      const nextEntry = state.entries[nextIndex] ?? null;
      return {
        ...state,
        currentIndex: nextIndex,
        currentPage: nextEntry ? {
          address: nextEntry.address,
          title: nextEntry.title,
          status: nextEntry.status,
          html: null
        } : null,
        isLoading: false,
        error: null,
        activeRequestId: null
      };
    }

    case 'GO_FORWARD': {
      if (state.currentIndex >= state.entries.length - 1) {
        return state;
      }

      const nextIndex = state.currentIndex + 1;
      const nextEntry = state.entries[nextIndex] ?? null;
      return {
        ...state,
        currentIndex: nextIndex,
        currentPage: nextEntry ? {
          address: nextEntry.address,
          title: nextEntry.title,
          status: nextEntry.status,
          html: null
        } : null,
        isLoading: false,
        error: null,
        activeRequestId: null
      };
    }

    case 'UPDATE_SCROLL': {
      const entryIndex = action.visitId
        ? state.entries.findIndex((entry) => entry.visitId === action.visitId)
        : state.currentIndex;
      if (entryIndex < 0 || entryIndex >= state.entries.length) {
        return state;
      }

      const nextEntries = [...state.entries];
      nextEntries[entryIndex] = {
        ...(nextEntries[entryIndex] || {}),
        scrollY: Number.isFinite(action.scrollY) ? action.scrollY : 0
      };

      return {
        ...state,
        entries: nextEntries
      };
    }

    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.page ?? null,
        isLoading: false,
        error: null,
        activeRequestId: null
      };

    default:
      return state;
  }
}
