# API Reference: SSH Key Management

Endpoints for listing, generating, and deleting managed OpenSSH keypairs in `~/.ssh/ControlCenterKeys/`.

---

## `GET /api/ssh-keys`

Lists all available OpenSSH keypairs found in the key directory.

### Authentication
- **Required:** Yes

### Response
```json
{
  "keys": [
    {
      "name": "id_ed25519",
      "publicKey": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... ControlCenter-AutoKey",
      "path": "/home/weexnes/.ssh/ControlCenterKeys/id_ed25519",
      "createdAt": "2026-08-17T00:53:21.000Z"
    }
  ],
  "defaultKey": "id_ed25519"
}
```

---

## `POST /api/ssh-keys/generate`

Generates a new secure **Ed25519** SSH keypair on the server without passphrases.

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "name": "node_cluster_key"
}
```

### Response
```json
{
  "success": true,
  "key": {
    "name": "node_cluster_key",
    "publicKey": "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... ControlCenter-AutoKey",
    "path": "/home/weexnes/.ssh/ControlCenterKeys/node_cluster_key"
  }
}
```

---

## `DELETE /api/ssh-keys/[name]`

Deletes an existing private and public key file pair.

### Authentication
- **Required:** Yes

### Response
```json
{
  "success": true,
  "message": "SSH key deleted successfully."
}
```
