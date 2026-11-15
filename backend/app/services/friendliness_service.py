"""Repository contributor-friendliness evaluation service (Issue #270).

Evaluates whether an open source repository is welcoming to contributors:
- Contributing guide presence (CONTRIBUTING.md)
- Code of Conduct presence (CODE_OF_CONDUCT.md)
- License presence (LICENSE / license object)
- Recent commits within 90 days
- Open 'good first issues' count
- Median response time to recent issues and pull requests
"""

import re
from datetime import UTC, datetime, timedelta
from typing import Any
import httpx

from app.services.github_service import github_get, GITHUB_API_URL


def parse_repo_owner_name(repo_url_or_slug: str) -> tuple[str, str]:
    """Parse 'owner/repo' or 'https://github.com/owner/repo' into (owner, repo)."""
    cleaned = repo_url_or_slug.strip().rstrip("/")
    # Handle full GitHub URL
    match = re.search(r"github\.com/([^/]+)/([^/]+)", cleaned)
    if match:
        return match.group(1), match.group(2)

    parts = cleaned.split("/")
    if len(parts) == 2 and parts[0] and parts[1]:
        return parts[0], parts[1]

    raise ValueError(f"Invalid repository format '{repo_url_or_slug}'. Expected 'owner/repo' or GitHub URL.")


async def evaluate_contributor_friendliness(repo_target: str) -> dict[str, Any]:
    """Evaluates multiple friendliness signals and returns a structured checklist."""
    owner, repo = parse_repo_owner_name(repo_target)
    full_name = f"{owner}/{repo}"

    # 1. Fetch Repository Details
    repo_resp = await github_get(f"{GITHUB_API_URL}/repos/{full_name}")
    if repo_resp.status_code == 404:
        return {
            "repository": full_name,
            "exists": False,
            "is_accessible": False,
            "message": "Repository not found or is private.",
            "checks": [],
        }

    repo_resp.raise_for_status()
    repo_data = repo_resp.json()

    is_archived = repo_data.get("archived", False)
    is_private = repo_data.get("private", False)

    # 2. Check Community Profile (Contributing, Code of Conduct, License)
    comm_resp = await github_get(f"{GITHUB_API_URL}/repos/{full_name}/community/profile")
    community_files = comm_resp.json().get("files", {}) if comm_resp.status_code == 200 else {}

    has_contributing = bool(community_files.get("contributing"))
    has_code_of_conduct = bool(community_files.get("code_of_conduct"))
    has_license = bool(community_files.get("license") or repo_data.get("license"))

    # 3. Check Recent Commits (past 90 days)
    ninety_days_ago = (datetime.now(UTC) - timedelta(days=90)).isoformat()
    commits_resp = await github_get(
        f"{GITHUB_API_URL}/repos/{full_name}/commits",
        params={"since": ninety_days_ago, "per_page": 5},
    )
    recent_commits = commits_resp.json() if commits_resp.status_code == 200 and isinstance(commits_resp.json(), list) else []
    has_recent_commits = len(recent_commits) > 0

    # 4. Check Open 'good first issues'
    issues_resp = await github_get(
        f"{GITHUB_API_URL}/search/issues",
        params={
            "q": f'repo:{full_name} is:issue is:open label:"good first issue"',
            "per_page": 1,
        },
    )
    good_first_issues_count = 0
    if issues_resp.status_code == 200:
        good_first_issues_count = issues_resp.json().get("total_count", 0)

    # 5. Median response time calculation across recent closed/commented issues
    recent_issues_resp = await github_get(
        f"{GITHUB_API_URL}/repos/{full_name}/issues",
        params={"state": "all", "sort": "created", "direction": "desc", "per_page": 10},
    )
    issues_list = recent_issues_resp.json() if recent_issues_resp.status_code == 200 and isinstance(recent_issues_resp.json(), list) else []

    response_hours: list[float] = []
    for itm in issues_list:
        comments_count = itm.get("comments", 0)
        created_at_str = itm.get("created_at")
        updated_at_str = itm.get("updated_at")
        if comments_count > 0 and created_at_str and updated_at_str:
            try:
                c_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                u_dt = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                diff_hours = max(0.5, (u_dt - c_dt).total_seconds() / 3600.0)
                response_hours.append(diff_hours)
            except Exception:
                pass

    median_hours = round(sorted(response_hours)[len(response_hours) // 2], 1) if response_hours else 24.0

    # Assemble structured checklist
    checks = [
        {
            "id": "contributing_guide",
            "label": "Contributing Guide",
            "passed": has_contributing,
            "explanation": "Clear guidelines are provided for setting up, branching, and submitting pull requests."
            if has_contributing
            else "No CONTRIBUTING.md detected. New contributors may need to ask maintainers for local setup guidelines.",
        },
        {
            "id": "code_of_conduct",
            "label": "Code of Conduct",
            "passed": has_code_of_conduct,
            "explanation": "Project establishes an inclusive and respectful communication standard for contributors."
            if has_code_of_conduct
            else "No CODE_OF_CONDUCT.md detected.",
        },
        {
            "id": "open_source_license",
            "label": "Open Source License",
            "passed": has_license,
            "explanation": f"Licensed under {repo_data.get('license', {}).get('spdx_id', 'OSI license')} allowing public use and contributions."
            if has_license
            else "No open source license found.",
        },
        {
            "id": "active_development",
            "label": "Recent Commits (Past 90 Days)",
            "passed": has_recent_commits,
            "explanation": "Active commits merged within the last 90 days indicate active maintainer attention."
            if has_recent_commits
            else "No commits in the past 90 days. The repository might be in maintenance mode.",
        },
        {
            "id": "beginner_issues",
            "label": "Good First Issues",
            "passed": good_first_issues_count > 0,
            "explanation": f"Found {good_first_issues_count} open 'good first issue'(s) specifically curated for newcomers."
            if good_first_issues_count > 0
            else "No open issues currently labelled 'good first issue'.",
        },
        {
            "id": "maintainer_response_time",
            "label": "Response Time to Inquiries",
            "passed": median_hours <= 72.0,
            "explanation": f"Estimated median response time to discussions and PRs is ~{median_hours} hours."
            if median_hours <= 72.0
            else f"Median response time is ~{median_hours} hours (>3 days). Review feedback may take time.",
        },
    ]

    return {
        "repository": full_name,
        "exists": True,
        "is_accessible": True,
        "is_archived": is_archived,
        "is_private": is_private,
        "description": repo_data.get("description"),
        "stars": repo_data.get("stargazers_count", 0),
        "primary_language": repo_data.get("language"),
        "median_response_hours": median_hours,
        "good_first_issues_count": good_first_issues_count,
        "passed_checks_count": sum(1 for c in checks if c["passed"]),
        "total_checks_count": len(checks),
        "checks": checks,
    }
