import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPeople } from './people.service.js';

export const listPeople = asyncHandler(async (req, res) => {
  const people = await getPeople();

  res.status(200).json({
    success: true,
    data: people.map((person) => ({
      id: person._id,
      name: person.name,
      createdAt: person.createdAt
    }))
  });
});
