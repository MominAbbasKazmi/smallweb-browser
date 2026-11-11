export const VISIT_DEFS = [
  { person: 'Ari', address: 'tidepool.zz', status: 'success', navigationType: 'typed', visitedAt: '2026-03-01T09:00:00.000Z' },
  { person: 'Ari', address: 'harbor.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:12:00.000Z', fromAddress: 'tidepool.zz' },
  { person: 'Ari', address: 'orchard.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:27:00.000Z', fromAddress: 'harbor.zz' },
  { person: 'Ari', address: 'missing-lighthouse.zz', status: 'not_found', navigationType: 'link', visitedAt: '2026-03-01T09:40:00.000Z', fromAddress: 'tidepool.zz' },
  { person: 'Ari', address: 'tidepool.zz', status: 'success', navigationType: 'history', visitedAt: '2026-03-01T09:48:00.000Z', fromAddress: 'missing-lighthouse.zz' },

  { person: 'Mina', address: 'drift.zz', status: 'success', navigationType: 'typed', visitedAt: '2026-03-01T09:05:00.000Z' },
  { person: 'Mina', address: 'lantern.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:18:00.000Z', fromAddress: 'drift.zz' },
  { person: 'Mina', address: 'archive.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:32:00.000Z', fromAddress: 'lantern.zz' },
  { person: 'Mina', address: 'station.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:43:00.000Z', fromAddress: 'archive.zz' },
  { person: 'Mina', address: 'missing-rail.zz', status: 'not_found', navigationType: 'link', visitedAt: '2026-03-01T09:52:00.000Z', fromAddress: 'station.zz' },

  { person: 'Jun', address: 'creek.zz', status: 'success', navigationType: 'typed', visitedAt: '2026-03-01T09:08:00.000Z' },
  { person: 'Jun', address: 'summit.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:20:00.000Z', fromAddress: 'creek.zz' },
  { person: 'Jun', address: 'meadow.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:35:00.000Z', fromAddress: 'summit.zz' },
  { person: 'Jun', address: 'missing-mill.zz', status: 'not_found', navigationType: 'link', visitedAt: '2026-03-01T09:56:00.000Z', fromAddress: 'meadow.zz' },
  { person: 'Jun', address: 'creek.zz', status: 'success', navigationType: 'history', visitedAt: '2026-03-01T10:03:00.000Z', fromAddress: 'missing-mill.zz' },

  { person: 'Sora', address: 'lantern.zz', status: 'success', navigationType: 'typed', visitedAt: '2026-03-01T09:11:00.000Z' },
  { person: 'Sora', address: 'archive.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:26:00.000Z', fromAddress: 'lantern.zz' },
  { person: 'Sora', address: 'meadow.zz', status: 'success', navigationType: 'link', visitedAt: '2026-03-01T09:41:00.000Z', fromAddress: 'archive.zz' },
  { person: 'Sora', address: 'missing-folder.zz', status: 'not_found', navigationType: 'link', visitedAt: '2026-03-01T09:58:00.000Z', fromAddress: 'meadow.zz' },
  { person: 'Sora', address: 'lantern.zz', status: 'success', navigationType: 'history', visitedAt: '2026-03-01T10:05:00.000Z', fromAddress: 'missing-folder.zz' }
];
