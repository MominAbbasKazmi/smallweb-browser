import { z } from 'zod';
import { Person } from '../../models/Person.js';
import { Site } from '../../models/Site.js';
import { Visit } from '../../models/Visit.js';
import { ApiError } from '../../utils/ApiError.js';
import { normalizeAddress } from '../../utils/normalizeAddress.js';

const visitSchema = z.object({
  personId: z.string().min(1),
  address: z.string().trim().min(1),
  navigationType: z.enum(['typed', 'link', 'history', 'publish']).optional().default('typed'),
  fromAddress: z.string().trim().nullable().optional()
});

export async function recordVisit(payload) {
  const validated = visitSchema.safeParse(payload);
  if (!validated.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid visit payload.', validated.error.issues.map((issue) => issue.message));
  }

  const person = await Person.findById(validated.data.personId);
  if (!person) {
    throw new ApiError(404, 'NOT_FOUND', 'Person not found.');
  }

  const address = normalizeAddress(validated.data.address);
  const site = await Site.findOne({ address }).lean();
  const visit = await Visit.create({
    personId: person._id,
    address,
    siteId: site ? site._id : null,
    visitedAt: new Date(),
    navigationType: validated.data.navigationType,
    status: site ? 'success' : 'not_found',
    fromAddress: validated.data.fromAddress ? normalizeAddress(validated.data.fromAddress) : null
  });

  return {
    id: visit._id,
    personId: visit.personId,
    address: visit.address,
    siteId: visit.siteId,
    visitedAt: visit.visitedAt,
    navigationType: visit.navigationType,
    status: visit.status,
    fromAddress: visit.fromAddress,
    page: site ? {
      id: site._id,
      title: site.title,
      address: site.address,
      authorId: site.authorId
    } : null
  };
}

export async function getHistoryForPerson(personId, limit = 100) {
  const person = await Person.findById(personId);
  if (!person) {
    throw new ApiError(404, 'NOT_FOUND', 'Person not found.');
  }

  const visits = await Visit.find({ personId: person._id })
    .sort({ visitedAt: -1 })
    .limit(limit)
    .populate('siteId', 'title address')
    .lean();

  return visits.map((visit) => ({
    id: visit._id,
    address: visit.address,
    title: visit.siteId ? visit.siteId.title : null,
    status: visit.status,
    navigationType: visit.navigationType,
    visitedAt: visit.visitedAt,
    fromAddress: visit.fromAddress
  }));
}
