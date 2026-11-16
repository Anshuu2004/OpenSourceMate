# OpenAPI TypeScript Type Generation

## Overview
As specified in Issue #268, OpenSourceMate features an automated code generation workflow that converts the backend's OpenAPI 3.1 schema into strongly-typed TypeScript interfaces (`frontend/types/generated-api.ts`).

This bridges the frontend and backend contracts:
- Changing or removing a response field on the backend immediately surfaces a static TypeScript compilation error in the frontend.
- API Client methods and UI components receive autocomplete and type checking directly from backend serializers.

---

## Architecture & Workflow

```
Backend (/openapi.json)
        │
        ▼ (read by)
frontend/scripts/generate-types.mjs
        │
        ▼ (generates)
frontend/types/generated-api.ts
        │
        ▼ (consumed by)
frontend/utils/apiClient.ts & UI Components
```

---

## Commands

### 1. Generate Types
Generates `frontend/types/generated-api.ts` directly from the OpenAPI schema:
```bash
npm --prefix frontend run codegen:types
```

### 2. CI Verification Check
Fails with exit code 1 if `frontend/types/generated-api.ts` is missing or out of sync with backend schema changes:
```bash
npm --prefix frontend run codegen:check
```

---

## CI Pipeline Integration
In `.github/workflows/ci.yml`:
```yaml
- name: Verify TypeScript types are in sync with OpenAPI
  run: npm run codegen:check
```
If a pull request introduces a schema modification without updating `frontend/types/generated-api.ts`, CI flags it before merging.

---

## Unit Testing
The code generator and type outputs are verified in `frontend/__tests__/openApiCodegen.test.ts`:
- Nested property types, primitives, nullables, arrays, and records.
- Enum conversions to TypeScript string union types.
- JSDoc comment extraction.
- Strong typing compliance with runtime objects.

Run tests:
```bash
npm --prefix frontend test -- __tests__/openApiCodegen.test.ts
```
