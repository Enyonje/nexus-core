export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.identity.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
