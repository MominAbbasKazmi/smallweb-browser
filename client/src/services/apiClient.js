const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message || 'The request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export async function getPeople() {
  const payload = await request('/people');
  return payload?.data ?? [];
}

export async function getPersonSession(personId) {
  const payload = await request(`/people/${personId}/session`);
  return payload?.data ?? { entries: [], currentIndex: -1 };
}

export async function savePersonSession(personId, payload) {
  const response = await request(`/people/${personId}/session`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  return response?.data ?? payload;
}

export async function saveSessionScroll(personId, payload) {
  const response = await request(`/people/${personId}/session/scroll`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

  return response?.data ?? payload;
}

export async function getSiteByAddress(address) {
  const payload = await request(`/sites/${encodeURIComponent(address)}`);
  return payload?.data?.site ?? null;
}

export async function recordVisit(payload) {
  const response = await request('/visits', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response?.data?.visit ?? null;
}

export async function getHistoryForPerson(personId) {
  const response = await request(`/people/${personId}/history`);
  return response?.data?.history ?? [];
}

export async function searchSites(query) {
  const response = await request(`/search?q=${encodeURIComponent(query)}`);
  return response?.data?.results ?? [];
}

export async function publishSite(payload) {
  const response = await request('/sites', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return response?.data?.site ?? null;
}
