import { asyncHandler } from '../../utils/asyncHandler.js';
import { getHistoryForPerson, recordVisit } from './visits.service.js';

export const createVisit = asyncHandler(async (req, res) => {
  const visit = await recordVisit(req.body);

  res.status(201).json({
    success: true,
    data: { visit }
  });
});

export const historyForPerson = asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const history = await getHistoryForPerson(personId, 100);

  res.status(200).json({
    success: true,
    data: { history }
  });
});
