"""End-to-end integration tests for analyzer behavior without heavy ML dependencies (Issue #263)."""

import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_analyzer_matching_runs_without_ml_dependencies(monkeypatch):
    """Verify that /api/v1/matching works end-to-end using keyword/TF-IDF scoring."""
    monkeypatch.delenv("OSM_USE_EMBEDDINGS", raising=False)

    mock_user = {
        "login": "octocat",
        "name": "The Octocat",
        "public_repos": 5,
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
        "html_url": "https://github.com/octocat",
    }
    mock_repos = [
        {
            "name": "fastapi-sample",
            "language": "Python",
            "fork": False,
            "stargazers_count": 25,
            "updated_at": "2026-01-01T00:00:00Z",
            "html_url": "https://github.com/octocat/fastapi-sample",
        }
    ]
    mock_issues = {
        "total_count": 1,
        "items": [
            {
                "id": 101,
                "title": "Add async route handlers with FastAPI",
                "html_url": "https://github.com/org/repo/issues/101",
                "repository_url": "https://api.github.com/repos/org/repo",
                "state": "open",
                "comments": 2,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-02T00:00:00Z",
                "labels": [{"name": "good first issue"}, {"name": "python"}],
                "body": "Looking for python contributors to help integrate async endpoints.",
            }
        ],
    }

    with (
        patch("app.api.routes.matching.get_user_repositories", AsyncMock(return_value=mock_repos)),
        patch("app.api.routes.matching.search_github_issues", AsyncMock(return_value=mock_issues["items"])),
    ):
        res = client.get("/api/v1/matching/octocat?difficulty=beginner")
        assert res.status_code == 200
        data = res.json()
        assert "issues" in data
        assert isinstance(data["issues"], list)
