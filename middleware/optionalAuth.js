// middlewares/optionalAuth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Use decoded.userId instead of decoded.id
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        req.user = null; // user not found in DB
      }
    } catch (err) {
      // Token invalid or expired
      req.user = null;
    }
  } else {
    // No token provided
    req.user = null;
  }

  next();
};

export default optionalAuth;
