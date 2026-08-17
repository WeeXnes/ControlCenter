# API Reference: Authentication

The authentication endpoints handle initial administrator onboarding, credential verification, session token generation, and logout.

---

## `GET /api/auth/status`

Checks if the server has been initialized and whether the current client session is authenticated.

### Authentication
- **Required:** No (Public endpoint)

### Response
```json
{
  "onboarded": true,
  "authenticated": false
}
```

---

## `POST /api/auth/setup`

Initializes the administrator password and generates the initial JWT secret on first install.

### Authentication
- **Required:** No (Only allowed if `onboarded === false`)

### Request Body
```json
{
  "password": "supersecretpassword"
}
```

### Response
```json
{
  "success": true,
  "message": "Admin account created successfully."
}
```

---

## `POST /api/auth/login`

Authenticates credentials and sets an `HttpOnly` JWT session cookie.

### Authentication
- **Required:** No

### Request Body
```json
{
  "password": "supersecretpassword"
}
```

### Response
- **Status:** `200 OK`
- **Set-Cookie Header:** `token=<jwt_string>; HttpOnly; Path=/; SameSite=Strict; Max-Age=2592000`
```json
{
  "success": true
}
```

---

## `GET /api/auth/logout`

Clears the authentication cookie and ends the active session.

### Authentication
- **Required:** Yes (`token` cookie)

### Response
- **Set-Cookie Header:** `token=; HttpOnly; Path=/; Max-Age=0`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
