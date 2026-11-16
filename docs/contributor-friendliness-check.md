# Repository Contributor-Friendliness Checklist

## Overview
As introduced in Issue #270, OpenSourceMate provides a repository-level friendliness evaluation service and UI checklist component.

Beginners and first-time contributors often struggle to choose which project to contribute to. Even if an issue looks easy, an inactive, unlicensed, or slow-to-respond repository can lead to frustration and stalled PRs. This feature evaluates key friendliness signals and presents them as a transparent checklist with short contextual explanations rather than an opaque score.

---

## Architecture & Signals

### 1. Backend Service & Endpoint
Located in:
- `backend/app/services/friendliness_service.py`
- `backend/app/api/routes/friendliness.py`
- `GET /api/v1/repositories/friendliness?repo={owner/repo}`

### 2. Evaluation Criteria

| Check | Signal Source | Welcoming Criteria | Explanation Provided |
| :--- | :--- | :--- | :--- |
| **Contributing Guide** | `/community/profile` | `CONTRIBUTING.md` exists | Explains whether branching, commit rules, and setup instructions are documented. |
| **Code of Conduct** | `/community/profile` | `CODE_OF_CONDUCT.md` exists | Outlines inclusive community expectations. |
| **Open Source License** | `/repos/{owner}/{repo}` | OSI License detected | Confirms legal protection for public contributions. |
| **Recent Commits** | `/commits?since=90d` | Commits in past 90 days | Verifies repository is actively maintained and not abandoned. |
| **Good First Issues** | `/search/issues` | Open `good first issue` > 0 | Shows count of curated newcomer issues ready for work. |
| **Maintainer Response Time** | `/issues?state=all` | Median response < 72h | Calculates median duration to initial comment or review. |

---

## Frontend Component: `ContributorFriendlinessChecklist`
Located in `frontend/components/ContributorFriendlinessChecklist.tsx`.

### Features
- Accepts GitHub URL or `owner/repo` slug.
- Gracefully displays informative guidance if a repository is private, archived, or not found.
- Renders responsive cards with green checks (✓) or neutral indicators (✕) with full explanations.
- Supports Dark and Light themes.

---

## Testing & Verification
- Backend unit & route tests: `backend/tests/test_friendliness_service.py`
- Frontend React tests: `frontend/__tests__/ContributorFriendlinessChecklist.test.tsx`

Run tests:
```bash
# Frontend
npm --prefix frontend test -- __tests__/ContributorFriendlinessChecklist.test.tsx

# Backend
pytest backend/tests/test_friendliness_service.py
```
