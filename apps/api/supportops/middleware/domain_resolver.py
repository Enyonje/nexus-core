from fastapi import Request

async def resolve_tenant_from_domain(request: Request):
    host = request.headers.get("host")

    # Example:
    # support.acme.com -> acme
    if host and "." in host:
        return host.split(".")[0]

    return "demo-tenant"
