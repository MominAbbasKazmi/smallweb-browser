import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Person } from '../src/models/Person.js';
import { Site } from '../src/models/Site.js';
import { Visit } from '../src/models/Visit.js';
import { createApp } from '../src/app.js';

const app = createApp();

beforeAll(async () => {
  await connectDatabase();
  await Site.init();
});

beforeEach(async () => {
  await Promise.all([
    Person.deleteMany({}),
    Site.deleteMany({}),
    Visit.deleteMany({})
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await disconnectDatabase();
  }
});

describe('history and search APIs', () => {
  it('finds body-only matches and returns an excerpt around the match without HTML', async () => {
    const author = await Person.create({ name: 'Search Author' });
    const longPrefix = 'A quiet collection of notes about tides, shorelines, weather, and the changing seasons. '.repeat(5);
    const publishResponse = await request(app)
      .post('/api/sites')
      .send({
        title: 'Harbor Notes',
        address: 'harbor-notes.zz',
        html: `<p>${longPrefix}luminiferous plankton brighten the water after sunset.</p>`,
        authorId: String(author._id)
      });

    expect(publishResponse.status).toBe(201);

    const response = await request(app).get('/api/search').query({ q: 'luminiferous' });

    expect(response.status).toBe(200);
    expect(response.body.data.results).toHaveLength(1);
    expect(response.body.data.results[0]).toMatchObject({
      title: 'Harbor Notes',
      address: 'harbor-notes.zz',
      author: 'Search Author'
    });
    expect(response.body.data.results[0].excerpt.toLowerCase()).toContain('luminiferous');
    expect(response.body.data.results[0]).not.toHaveProperty('html');
  });

  it('sanitizes published HTML before storing and returning it', async () => {
    const author = await Person.create({ name: 'Safety Author' });
    const response = await request(app)
      .post('/api/sites')
      .send({
        title: 'Safe Harbor',
        address: 'safe-harbor.zz',
        html: '<h1>Safe harbor</h1><script>window.parent.alert(1)</script><p onclick="alert(1)">Open water ahead.</p>',
        authorId: String(author._id)
      });

    expect(response.status).toBe(201);
    expect(response.body.data.site.html).not.toMatch(/<script|onclick|window\.parent/i);

    const fetched = await request(app).get('/api/sites/safe-harbor.zz');
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.site.html).toBe(response.body.data.site.html);
    expect(fetched.body.data.site.plainText).toBe('Safe harbor Open water ahead.');
  });

  it('keeps visit history scoped to the selected person and includes broken visits', async () => {
    const [firstPerson, secondPerson] = await Person.create([
      { name: 'History Reader One' },
      { name: 'History Reader Two' }
    ]);

    const firstVisit = await request(app)
      .post('/api/visits')
      .send({
        personId: String(firstPerson._id),
        address: 'unpublished.zz',
        navigationType: 'typed'
      });
    const secondVisit = await request(app)
      .post('/api/visits')
      .send({
        personId: String(secondPerson._id),
        address: 'another-missing.zz',
        navigationType: 'typed'
      });

    expect(firstVisit.status).toBe(201);
    expect(firstVisit.body.data.visit.status).toBe('not_found');
    expect(secondVisit.status).toBe(201);

    const response = await request(app).get(`/api/people/${firstPerson._id}/history`);

    expect(response.status).toBe(200);
    expect(response.body.data.history).toHaveLength(1);
    expect(response.body.data.history[0]).toMatchObject({
      address: 'unpublished.zz',
      title: null,
      status: 'not_found',
      navigationType: 'typed'
    });
  });

  it('rejects empty and excessively long search queries', async () => {
    const empty = await request(app).get('/api/search').query({ q: '   ' });
    const tooLong = await request(app).get('/api/search').query({ q: 'a'.repeat(101) });

    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
  });
});
