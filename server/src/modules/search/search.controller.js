import { asyncHandler } from '../../utils/asyncHandler.js';
import { searchSites } from './search.service.js';

export const searchController = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const results = await searchSites(Array.isArray(q) ? q[0] : q ?? '');

  res.status(200).json({
    success: true,
    data: { query: Array.isArray(q) ? q[0] : q ?? '', results }
  });
});
