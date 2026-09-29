import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

export function requireAuth(req, reply, done) {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies?.authToken || req.query?.token;

    if (!token) {
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    req.identity = payload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      org_id: payload.org_id,
      company: payload.company,
    };

    done();
  } catch (err) {
    return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
  }
}

export function requireRole(role) {
  return (req, reply, done) => {
    if (!req.identity || req.identity.role !== role) {
      return reply.code(403).send({ error: "AUTH_FORBIDDEN_ROLE" });
    }
    done();
  };
}