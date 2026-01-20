import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing auth" });

  const token = auth.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.identity = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
