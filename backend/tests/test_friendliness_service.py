"""Unit and route tests for repository contributor-friendliness check (Issue #270)."""

import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient

from app.main import app
from app.services.friendliness_service import (
    parse_repo_owner_name,
    evaluate_contributor_friendliness,
)

client = TestClient(app)


def test_parse_repo_owner_name_slug_and_urls():
    assert parse_repo_owner_name("torvalds/linux") == ("torvalds", "linux")
    assert parse_repo_owner_name("https://github.com/facebook/react") == ("facebook", "react")
    assert parse_repo_owner_name("http://github.com/vercel/next.js/") == ("vercel", "next.js")

    with pytest.raises(ValueError):
        parse_repo_owner_name("invalid-slug")


@pytest.mark.asyncio
async def test_evaluate_contributor_friendliness_full_checklist():
    mock_repo_payload = {
        "name": "react",
        "full_name": "facebook/react",
        "private": False,
        "archived": False,
        "description": "The library for web and native user interfaces",
        "stargazers_count": 220000,
        "language": "JavaScript",
        "license": {"spdx_id": "MIT"},
    }

    mock_community_payload = {
        "files": {
            "contributing": {"url": "https://..."},
            "code_of_conduct": {"url": "https://..."},
            "license": {"url": "https://..."},
        }
    }

    mock_commits_payload = [{"sha": "abc1234", "commit": {"message": "Update docs"}}]

    mock_issues_search = {"total_count": 14}

    mock_recent_issues = [
        {
            "id": 1,
            "comments": 3,
            "created_at": "2026-11-01T10:00:00Z",
            "updated_at": "2026-11-01T18:00:00Z",
        }
    ]

    async def mock_github_get(url: str, params=None):
        if "/community/profile" in url:
            return Response(200, json=mock_community_payload)
        if "/commits" in url:
            return Response(200, json=mock_commits_payload)
        if "/search/issues" in url:
            return Response(200, json=mock_issues_search)
        if "/issues" in url:
            return Response(200, json=mock_recent_issues)
        return Response(200, json=mock_repo_payload)

    with patch("app.services.friendliness_service.github_get", side_effect=mock_github_get):
        result = await evaluate_contributor_friendliness("facebook/react")

        assert result["exists"] is True
        assert result["is_accessible"] is True
        assert result["is_archived"] is False
        assert result["good_first_issues_count"] == 14
        assert len(result["checks"]) == 6

        # Check all 6 checks are present
        check_ids = [c["id"] for c in result["checks"]]
        assert "contributing_guide" in check_ids
        assert "code_of_conduct" in check_ids
        assert "open_source_license" in check_ids
        assert "active_development" in check_ids
        assert "beginner_issues" in check_ids
        assert "maintainer_response_time" in check_ids

        # Passed count check
        assert result["passed_checks_count"] == 6


@pytest.mark.asyncio
async def test_evaluate_nonexistent_or_private_repository():
    async def mock_github_get(url: str, params=None):
        return Response(404)

    with patch("app.services.friendliness_service.github_get", side_effect=mock_github_get):
        result = await evaluate_contributor_friendliness("unknown/nonexistent-repo")
        assert result["exists"] is False
        assert result["is_accessible"] is False
        assert "private" in result["message"].lower()


def test_endpoint_get_repository_friendliness():
    mock_result = {
        "repository": "octocat/Hello-World",
        "exists": True,
        "is_accessible": True,
        "is_archived": False,
        "is_private": False,
        "stars": 1500,
        "primary_language": "Python",
        "median_response_hours": 12.0,
        "good_first_issues_count": 3,
        "passed_checks_count": 5,
        "total_checks_count": 6,
        "checks": [
            {
                "id": "contributing_guide",
                "label": "Contributing Guide",
                "passed": True,
                "explanation": "Clear guidelines are provided.",
            }
        ],
    }

    with patch("app.api.routes.friendliness.evaluate_contributor_friendliness", AsyncMock(return_value=mock_result)):
        res = client.get("/api/v1/repositories/friendliness?repo=octocat/Hello-World")
        assert res.status_code == 200
        body = res.json()
        assert body["repository"] == "octocat/Hello-World"
        assert body["passed_checks_count"] == 5
