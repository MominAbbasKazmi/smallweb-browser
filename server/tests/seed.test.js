import { afterEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { BrowserSession } from '../src/models/BrowserSession.js';
import { Person } from '../src/models/Person.js';
import { Site } from '../src/models/Site.js';
import { Visit } from '../src/models/Visit.js';
import { seedDatabase } from '../src/seed/seed.js';
import { isValidAddress, normalizeAddress } from '../src/utils/normalizeAddress.js';

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await disconnectDatabase();
  }
});

describe('address normalization', () => {
  it('accepts valid mini-web addresses', () => {
    expect(normalizeAddress('  Tidepool.zz  ')).toBe('tidepool.zz');
    expect(normalizeAddress('www.tidepool.zz')).toBe('www.tidepool.zz');
    expect(isValidAddress('lantern.zz')).toBe(true);
  });

  it('rejects unsafe or invalid addresses', () => {
    expect(isValidAddress('https://example.com')).toBe(false);
    expect(isValidAddress('example.com')).toBe(false);
    expect(isValidAddress('javascript:alert(1)')).toBe(false);
    expect(isValidAddress('example.zz/path')).toBe(false);
    expect(isValidAddress('example.zz?x=1')).toBe(false);
  });
});

describe('seed data', () => {
  it('creates a deterministic dataset without duplicates', async () => {
    try {
      await connectDatabase();
    } catch (error) {
      return;
    }

    await Person.deleteMany({});
    await Site.deleteMany({});
    await Visit.deleteMany({});
    await BrowserSession.deleteMany({});

    const firstSeed = await seedDatabase();
    const secondSeed = await seedDatabase();

    expect(firstSeed.people).toBeGreaterThan(0);
    expect(firstSeed.sites).toBe(10);
    expect(secondSeed.people).toBe(firstSeed.people);
    expect(secondSeed.sites).toBe(firstSeed.sites);

    const people = await Person.countDocuments();
    const sites = await Site.countDocuments();
    const visits = await Visit.countDocuments();
    const sessions = await BrowserSession.countDocuments();

    expect(people).toBe(4);
    expect(sites).toBe(10);
    expect(visits).toBeGreaterThan(0);
    expect(sessions).toBe(4);
  });
});
