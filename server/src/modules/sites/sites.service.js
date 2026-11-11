import { z } from 'zod';
import { Person } from '../../models/Person.js';
import { Site } from '../../models/Site.js';
import { ApiError } from '../../utils/ApiError.js';
import { extractPlainText } from '../../utils/extractPlainText.js';
import { normalizeAddress } from '../../utils/normalizeAddress.js';
import { sanitizeMiniWebHtml } from '../../security/sanitizeHtml.js';

const publishSchema = z.object({
  title: z.string().trim().min(2).max(200),
  address: z.string().trim().min(1),
  html: z.string().max(100 * 1024),
  authorId: z.string().min(1)
});

export async function findSiteByAddress(address) {
  const normalized = normalizeAddress(address);
  const site = await Site.findOne({ address: normalized }).lean();
  return site ? {
    ...site,
    id: site._id,
    authorId: site.authorId
  } : null;
}

export async function siteExists(address) {
  const normalized = normalizeAddress(address);
  const site = await Site.exists({ address: normalized });
  return Boolean(site);
}

export async function createSite(payload) {
  const validated = publishSchema.safeParse(payload);
  if (!validated.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid site payload.', validated.error.issues.map((issue) => issue.message));
  }

  const author = await Person.findById(validated.data.authorId);
  if (!author) {
    throw new ApiError(404, 'NOT_FOUND', 'Author not found.');
  }

  const address = normalizeAddress(validated.data.address);
  const title = validated.data.title.trim();
  const rawHtml = validated.data.html;
  const sanitizedHtml = sanitizeMiniWebHtml(rawHtml);

  if (!sanitizedHtml || sanitizedHtml.length < 20) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Published page content is empty or too short.');
  }

  const plainText = extractPlainText(sanitizedHtml);
  if (!plainText || plainText.length < 10) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Published page content must contain readable text.');
  }

  try {
    const site = await Site.create({
      title,
      address,
      html: sanitizedHtml,
      plainText,
      authorId: author._id
    });

    return {
      id: site._id,
      title: site.title,
      address: site.address,
      html: site.html,
      authorId: site.authorId,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'RESOURCE_EXISTS', 'This address is already published.', []);
    }
    throw error;
  }
}
