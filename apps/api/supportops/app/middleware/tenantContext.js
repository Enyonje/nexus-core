export default function tenantContext(req, res, next) {
  const tenantId =
    req.headers["x-tenant-id"] || req.user?.tenantId;

  if (!tenantId) {
    return res.status(403).json({
      error: "Tenant context missing"
    });
  }

  req.tenantId = tenantId;
  next();
}
