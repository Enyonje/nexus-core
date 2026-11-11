import jwt from 'jsonwebtoken';

const NEXUS_JWT_SECRET = process.env.NEXUS_JWT_SECRET || process.env.JWT_SECRET;
const SESSION_COOKIE_NAME = 'nexus_core_session';

export const verifyNexusAuth = (req, res, next) => {
  try {
    // Extract token strictly from the Nexus Core cookie or authorization header
    let token = req.cookies?.[SESSION_COOKIE_NAME];

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization.split(' ');
      if (authHeader[0] === 'Bearer') {
        token = authHeader[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No Nexus Core session token found.' });
    }

    const decoded = jwt.verify(token, NEXUS_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or expired Nexus Core session token.' });
  }
};