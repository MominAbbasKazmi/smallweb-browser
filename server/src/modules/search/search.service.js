import { z } from 'zod';
import { Site } from '../../models/Site.js';
import { ApiError } from '../../utils/ApiError.js';

const querySchema = z.object({
  q: z.string().trim().min(1).max(100)
});

export async function searchSites(rawQuery) {
  const validated = querySchema.safeParse({ q: rawQuery });
  if (!validated.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Search query must be between 1 and 100 characters.', validated.error.issues.map((issue) => issue.message));
  }

  const query = validated.data.q;
  const sites = await Site.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .populate('authorId', 'name')
    .sort({ score: { $meta: 'textScore' }, address: 1 })
    .limit(20)
    .lean();

  return sites.map((site) => ({
    id: site._id,
    title: site.title,
    address: site.address,
    author: site.authorId ? site.authorId.name : 'Unknown',
    score: site.score ?? 0,
    excerpt: (site.plainText || '').slice(0, 180)
  }));
}
