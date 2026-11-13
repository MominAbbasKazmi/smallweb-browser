import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../config/database.js';
import { BrowserSession } from '../models/BrowserSession.js';
import { Person } from '../models/Person.js';
import { Site } from '../models/Site.js';
import { Visit } from '../models/Visit.js';
import { normalizeAddress } from '../utils/normalizeAddress.js';
import { extractPlainText } from '../utils/extractPlainText.js';
import { sanitizeMiniWebHtml } from '../security/sanitizeHtml.js';
import { PEOPLE } from './data/people.js';
import { SITE_DEFS } from './data/sites.js';
import { VISIT_DEFS } from './data/visits.js';

export async function seedDatabase() {
  await connectDatabase();

  const seededPeople = [];
  for (const personRecord of PEOPLE) {
    const person = await Person.findOneAndUpdate(
      { name: personRecord.name },
      { $setOnInsert: { name: personRecord.name } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seededPeople.push(person);
  }

  const peopleByName = new Map(seededPeople.map((person) => [person.name, person]));
  const siteMap = new Map();

  for (const siteDef of SITE_DEFS) {
    const author = peopleByName.get(siteDef.author);
    if (!author) {
      throw new Error(`Unknown author in seed data: ${siteDef.author}`);
    }

    const normalizedAddress = normalizeAddress(siteDef.address);
    const sanitizedHtml = sanitizeMiniWebHtml(siteDef.html);
    const plainText = extractPlainText(sanitizedHtml);

    const site = await Site.findOneAndUpdate(
      { address: normalizedAddress },
      {
        $set: {
          title: siteDef.title,
          address: normalizedAddress,
          html: sanitizedHtml,
          plainText,
          authorId: author._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    siteMap.set(normalizedAddress, site);
  }

  for (const visitDef of VISIT_DEFS) {
    const person = peopleByName.get(visitDef.person);
    if (!person) {
      throw new Error(`Unknown person in visit seed: ${visitDef.person}`);
    }

    const normalizedAddress = normalizeAddress(visitDef.address);
    const site = siteMap.get(normalizedAddress) || null;

    await Visit.findOneAndUpdate(
      {
        personId: person._id,
        address: normalizedAddress,
        visitedAt: new Date(visitDef.visitedAt)
      },
      {
        $set: {
          personId: person._id,
          address: normalizedAddress,
          siteId: site ? site._id : null,
          visitedAt: new Date(visitDef.visitedAt),
          navigationType: visitDef.navigationType,
          status: visitDef.status,
          fromAddress: visitDef.fromAddress ? normalizeAddress(visitDef.fromAddress) : null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const person of seededPeople) {
    const personVisits = await Visit.find({ personId: person._id }).sort({ visitedAt: 1 }).lean();
    const entries = personVisits.map((visit) => ({
      address: visit.address,
      visitId: visit._id,
      scrollY: 0,
      title: siteMap.get(visit.address)?.title || 'Unknown page',
      status: visit.status
    }));

    await BrowserSession.findOneAndUpdate(
      { personId: person._id },
      {
        $set: {
          personId: person._id,
          entries,
          currentIndex: Math.max(entries.length - 1, -1)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return {
    people: seededPeople.length,
    sites: SITE_DEFS.length,
    visits: VISIT_DEFS.length
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await seedDatabase();
    console.log(`Seeded ${result.people} people, ${result.sites} sites, and ${result.visits} visits.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
    await mongoose.disconnect();
  }
}
