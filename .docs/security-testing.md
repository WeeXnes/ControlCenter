# Security Architecture & Test Suite

This document covers the security controls, authentication rules, and automated security test suite enforced across ControlCenter.

---

## 1. Security Principles

1. **Zero-Trust Network Model:** Nodes never open listening ports to the public internet or local network; they establish outbound TLS WebSocket connections.
2. **HttpOnly Cookie Isolation:** Browser sessions never expose JWT tokens to client-side scripts, completely mitigating XSS token theft.
3. **Strict Parameter Validation:** All UUIDs, CIDR subnets, IP addresses, and SSH filenames are sanitized against path traversal and command injection.
4. **Certificate Fingerprint Pinning:** Supports pinning the 256-bit SHA-256 SSL fingerprint to prevent MITM attacks on self-signed certificates.

---

## 2. Automated Test Suite (`tests/security/`)

ControlCenter includes an extensive automated test suite run via `Vitest`. The suite executes 82 automated test cases across 6 security domains:

### Test Suites:
1. **`auth-security.test.ts` (24 tests):**
   - Verifies 401 Unauthorized rejection across all protected `/api/*` endpoints when unauthenticated.
   - Verifies rejection of empty passwords, forged tokens, and expired JWT signatures.
   - Verifies that `POST /api/auth/login` never returns tokens in the response body.

2. **`machines-security.test.ts` (19 tests):**
   - Verifies unauthenticated blocking on all machine CRUD endpoints.
   - Validates UUID format sanitization and malformed ID error handling.

3. **`infrastructure-security.test.ts` (13 tests):**
   - Verifies 401 blocking on device creation, deletion, service monitoring, and probe endpoints.
   - Comprehensive unit tests for CIDR bitmask math and IPv4 parsing (`/24`, `/16`, `/8`, exact IPs, comma-separated subnets).
   - Verifies multi-homed IP matching across multiple network subnets.

4. **`ssh-key-management-security.test.ts` (15 tests):**
   - Validates unauthenticated 401 rejection on key endpoints.
   - Tests automated Ed25519 key generation, file system permissions (`0700`/`0600`), and directory isolation.

5. **`daemon-ws-security.test.ts` (3 tests):**
   - Tests WebSocket handshake validation on `/ws/daemon`.
   - Tests auto-enrollment for new machine IDs and token verification for configured machines.

6. **`ssh-security.test.ts` (8 tests):**
   - Validates rejection of unauthenticated WebSocket handshakes on `/ws/ssh`.
   - Verifies protection against machine ID enumeration and credential forgery.

---

## 3. Running Security Tests

```bash
# Start server in test mode
PORT=3000 node .output/server/index.mjs &

# Run all test suites
npx vitest run
```
