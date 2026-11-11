import jwt from 'jsonwebtoken';

const SO_JWT_SECRET = process.env.SO_JWT_SECRET || process.env.JWT_SECRET;
const SUPPORTOPS_COOKIE_NAME = 'supportops_session';

export const verifySupportOpsAuth = (req, res, next) => {
    try {
        let token = req.cookies?.[SUPPORTOPS_COOKIE_NAME];

        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization.split(' ');
            if (authHeader[0] === 'Bearer' && req.headers['x-client-context'] === 'supportops') {
                token = authHeader[1];
            }
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No SupportOps session token found.' });
        }

        const decoded = jwt.verify(token, SO_JWT_SECRET);
        req.supportOpsUser = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired SupportOps session token.' });
    }
};