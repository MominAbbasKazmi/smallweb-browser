import { asyncHandler } from '../../utils/asyncHandler.js';
import { getSessionForPerson, saveSessionForPerson, updateScrollForPerson } from './sessions.service.js';

export const loadSession = asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const session = await getSessionForPerson(personId);

  res.status(200).json({
    success: true,
    data: session
  });
});

export const saveSession = asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const session = await saveSessionForPerson(personId, req.body);

  res.status(200).json({
    success: true,
    data: session
  });
});

export const updateScroll = asyncHandler(async (req, res) => {
  const { personId } = req.params;
  const session = await updateScrollForPerson(personId, req.body);

  res.status(200).json({
    success: true,
    data: session
  });
});
