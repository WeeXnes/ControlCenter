# Project Guidelines & Rules

## Versioning Rules
- Always bump the version number in `package.json` when making changes:
  - Add **`+0.0.1`** for small changes, bug fixes, or minor tweaks.
  - Add **`+0.1.0`** for larger changes, new features, or architectural updates (and reset the last digit to `0`).

## Security & Testing
- Always analyze security tests and test suites when adding new endpoints, authentication changes, or UI workflows.
- If new changes are not covered by existing tests (e.g. in `tests/security/`), update or write security unit/integration tests to ensure proper coverage.
