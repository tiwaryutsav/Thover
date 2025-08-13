import { ApiKey } from '../models/ApiKey.js';

export const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'API key missing' });
  }

  const keyDoc = await ApiKey.findOne({ key: apiKey });

  if (!keyDoc) {
    return res.status(403).json({ success: false, message: 'Invalid API key' });
  }

  req.partnerDomain = keyDoc.website;
  next();
};
