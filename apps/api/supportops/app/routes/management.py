from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse

router = APIRouter()

ADMIN_USERNAME = "support@admin.com"
ADMIN_PASSWORD = "atimmy22"

@router.get("/admin/login", response_class=HTMLResponse)
async def admin_login_form():
    return """
    <html>
        <head><title>Admin Login</title></head>
        <body>
            <h2>Admin Login (No Auth Required)</h2>
            <form action="/admin/login" method="post">
                <input type="text" name="username" value="admin" readonly /><br>
                <input type="password" name="password" value="letmein" readonly /><br>
                <button type="submit">Login</button>
            </form>
            <p>Use username: <b>admin</b> and password: <b>letmein</b></p>
        </body>
    </html>
    """

@router.post("/admin/login")
async def admin_login(username: str = Form(...), password: str = Form(...)):
    # Bypass authentication for management
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        response = RedirectResponse(url="/admin/dashboard", status_code=302)
        response.set_cookie("admin", "true")
        return response
    return HTMLResponse("<h3>Invalid credentials</h3>", status_code=401)

@router.get("/admin/dashboard", response_class=HTMLResponse)
async def admin_dashboard(request: Request):
    # No auth check, accessible if you know the URL or after login
    return """
    <html>
        <head><title>Admin Dashboard</title></head>
        <body>
            <h1>Welcome to the Admin Dashboard</h1>
            <ul>
                <li><a href="/admin/users">Manage Users</a></li>
                <li><a href="/admin/settings">App Settings</a></li>
                <li><a href="/">Home</a></li>
            </ul>
            <p><b>Note:</b> This dashboard is accessible without authentication for management purposes.</p>
        </body>
    </html>
    """

@router.get("/admin/users", response_class=HTMLResponse)
async def admin_users():
    return "<h2>User Management (Demo Page)</h2><a href='/admin/dashboard'>Back</a>"

@router.get("/admin/settings", response_class=HTMLResponse)
async def admin_settings():
    return "<h2>App Settings (Demo Page)</h2><a href='/admin/dashboard'>Back</a>"