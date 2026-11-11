import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { findSiteByAddress, siteExists, createSite } from './sites.service.js';

export const getSite = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const site = await findSiteByAddress(address);

  if (!site) {
    throw new ApiError(404, 'NOT_FOUND', 'Page not found.');
  }

  res.status(200).json({
    success: true,
    data: { site }
  });
});

export const existsSite = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const exists = await siteExists(address);

  res.status(200).json({
    success: true,
    data: { exists }
  });
});

export const publishSite = asyncHandler(async (req, res) => {
  const site = await createSite(req.body);

  res.status(201).json({
    success: true,
    data: { site },
    message: 'Page published successfully.'
  });
});
