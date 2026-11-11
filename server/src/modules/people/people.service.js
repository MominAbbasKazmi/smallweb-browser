import { Person } from '../../models/Person.js';

export async function getPeople() {
  return Person.find().sort({ name: 1 }).lean();
}
