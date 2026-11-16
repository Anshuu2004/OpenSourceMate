# Backend Account Classification & Handling

## Overview
As specified in Issue #261, OpenSourceMate implements explicit recognition and handling for various GitHub account states:
- **Organizations**: Users occasionally enter team, university, or corporate organization handles (e.g. `google`, `facebook`, `octo-org`) into the personal profile analyzer.
- **Suspended / Unavailable Accounts**: Accounts flagged or blocked by GitHub.
- **Renamed Accounts**: Users who changed their handle, where GitHub redirects (301/308) to the canonical new handle.
- **Missing / Invalid Accounts**: Handled with targeted error structures rather than generic error fallbacks.

---

## Error Codes and Response Format

When non-standard accounts are submitted, the backend raises typed `APIException` instances that translate into standard JSON responses:

### 1. Organization Account (`ORGANIZATION_ACCOUNT` - HTTP 422)
```json
{
  "error": {
    "code": "ORGANIZATION_ACCOUNT",
    "message": "'octo-org' is an organization account. Please enter a personal developer username.",
    "details": {
      "username": "octo-org",
      "account_type": "Organization"
    }
  }
}
```

### 2. Suspended Account (`ACCOUNT_SUSPENDED` - HTTP 403)
```json
{
  "error": {
    "code": "ACCOUNT_SUSPENDED",
    "message": "The account 'suspended-dev' has been suspended or unavailable on GitHub.",
    "details": {
      "username": "suspended-dev"
    }
  }
}
```

### 3. Renamed Account (`ACCOUNT_RENAMED` - HTTP 301)
```json
{
  "error": {
    "code": "ACCOUNT_RENAMED",
    "message": "User 'old-handle' has been renamed to 'new-handle'. Please use 'new-handle'.",
    "details": {
      "old_username": "old-handle",
      "new_username": "new-handle"
    }
  }
}
```

---

## Frontend Integration Guidelines
When a user inputs a GitHub handle that triggers one of these responses:
1. `ORGANIZATION_ACCOUNT`: The UI surfaces an amber notification explaining that organizations have team repositories and issues rather than individual skill distributions, prompting for a personal developer handle.
2. `ACCOUNT_SUSPENDED`: The UI shows a red security alert indicating that the account is suspended on GitHub.
3. `ACCOUNT_RENAMED`: The UI provides a 1-click button or auto-fills the redirected username so the user does not have to retype the query.


---

## Test Fixtures & Coverage
Dedicated sanitized fixtures have been placed in:
- `fixtures/users/organization_account.json`
- `fixtures/users/suspended_account.json`
- `fixtures/users/renamed_account.json`

Automated test contracts in `backend/tests/test_account_type_handling.py` test:
- Organization account detection and messaging.
- Suspended flag identification.
- 301 Location header redirects and payload login mismatch renames.
- Standard user pass-through.
- Missing account 404 handling.
