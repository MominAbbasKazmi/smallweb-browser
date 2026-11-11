import { z } from 'zod';
import { BrowserSession } from '../../models/BrowserSession.js';
import { Person } from '../../models/Person.js';
import { ApiError } from '../../utils/ApiError.js';

const entrySchema = z.object({
  address: z.string().trim().min(1),
  visitId: z.string().min(1),
  scrollY: z.number().min(0).max(100000).default(0),
  title: z.string().trim().min(1).max(200),
  status: z.enum(['success', 'not_found'])
});

const saveSessionSchema = z.object({
  entries: z.array(entrySchema).default([]),
  currentIndex: z.number().int().min(-1).default(-1)
});

export async function getSessionForPerson(personId) {
  const person = await Person.findById(personId);
  if (!person) throw new ApiError(404, 'NOT_FOUND', 'Person not found.');

  const session = await BrowserSession.findOne({ personId: person._id }).lean();
  return session ? {
    personId: session.personId,
    entries: session.entries,
    currentIndex: session.currentIndex
  } : {
    personId: person._id,
    entries: [],
    currentIndex: -1
  };
}

export async function saveSessionForPerson(personId, payload) {
  const person = await Person.findById(personId);
  if (!person) throw new ApiError(404, 'NOT_FOUND', 'Person not found.');

  const validated = saveSessionSchema.safeParse(payload);
  if (!validated.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid browser session payload.', validated.error.issues.map((issue) => issue.message));
  }

  const session = await BrowserSession.findOneAndUpdate(
    { personId: person._id },
    {
      personId: person._id,
      entries: validated.data.entries,
      currentIndex: validated.data.currentIndex
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    personId: session.personId,
    entries: session.entries,
    currentIndex: session.currentIndex
  };
}

export async function updateScrollForPerson(personId, payload) {
  const person = await Person.findById(personId);
  if (!person) throw new ApiError(404, 'NOT_FOUND', 'Person not found.');

  const scrollSchema = z.object({
    address: z.string().trim().min(1),
    visitId: z.string().min(1).optional(),
    scrollY: z.number().min(0).max(100000).default(0)
  });

  const validated = scrollSchema.safeParse(payload);
  if (!validated.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid scroll payload.', validated.error.issues.map((issue) => issue.message));
  }

  const session = await BrowserSession.findOne({ personId: person._id });
  if (!session) {
    throw new ApiError(404, 'NOT_FOUND', 'No saved session for this person.');
  }

  const entryIndex = validated.data.visitId
    ? session.entries.findIndex((entry) => String(entry.visitId) === validated.data.visitId)
    : session.entries.findIndex((entry) => entry.address === validated.data.address);
  if (entryIndex === -1) {
    throw new ApiError(404, 'NOT_FOUND', 'Address not found in the saved session.');
  }

  session.entries[entryIndex].scrollY = validated.data.scrollY;
  await session.save();

  return {
    personId: session.personId,
    entries: session.entries,
    currentIndex: session.currentIndex
  };
}
