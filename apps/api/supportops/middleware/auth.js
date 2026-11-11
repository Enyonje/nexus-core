import jwt from 'jsonwebtoken';

const SO_JWT_SECRET = process.env.SO_JWT_SECRET || process.env.JWT_SECRET;
const SUPPORTOPS_COOKIE_NAME = 'supportops_session';

export const verifySupportOpsAuth = (req, res, next) => {
    try {
        let token = req.cookies?.[SUPPORTOPS_COOKIE_NAME];

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization.split(' ');
            if (authHeader[0] === 'Bearer') {
                token = authHeader[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No SupportOps session token found.' });
        }

        const decoded = jwt.verify(token, SO_JWT_SECRET);
        req.supportOpsUser = decoded;
        req.user = decoded; // Alias for standard compatibility
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired SupportOps session token.' });
    }
};

export const optionalAuth = (req, res, next) => {
    try {
        let token = req.cookies?.[SUPPORTOPS_COOKIE_NAME];

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization.split(' ');
            if (authHeader[0] === 'Bearer') {
                token = authHeader[1];
            }
        }

        if (token) {
            const decoded = jwt.verify(token, SO_JWT_SECRET);
            req.supportOpsUser = decoded;
            req.user = decoded;
        }
    } catch (err) {
        // Silently ignore for optional routes
    }
    next();
};

export const requireAuth = verifySupportOpsAuth;

// Default export mapping to support default imports (e.g., import auth from "../middleware/auth.js")
export default verifySupportOpsAuth;