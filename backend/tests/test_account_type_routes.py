"""Route-level integration tests for specialized GitHub account type handling (Issue #261)."""

import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient

from app.main import app
from tests.fixture_loader import load_fixture

client = TestClient(app)


def test_route_get_user_organization_account_returns_422():
    org_data = load_fixture("users/organization_account.json")
    mock_response = Response(status_code=200, json=org_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        res = client.get("/api/v1/github/users/octo-org?refresh=true")
        assert res.status_code == 422
        body = res.json()
        assert body["error"]["code"] == "ORGANIZATION_ACCOUNT"
        assert "organization account" in body["error"]["message"].lower()


def test_route_get_user_suspended_account_returns_403():
    suspended_data = load_fixture("users/suspended_account.json")
    mock_response = Response(status_code=200, json=suspended_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        res = client.get("/api/v1/github/users/suspended-dev?refresh=true")
        assert res.status_code == 403
        body = res.json()
        assert body["error"]["code"] == "ACCOUNT_SUSPENDED"
        assert "suspended" in body["error"]["message"].lower()


def test_route_get_user_renamed_account_returns_301():
    mock_response = Response(
        status_code=301,
        headers={"Location": "https://api.github.com/users/new-handle"},
    )

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        res = client.get("/api/v1/github/users/old-handle?refresh=true")
        assert res.status_code == 301
        body = res.json()
        assert body["error"]["code"] == "ACCOUNT_RENAMED"
        assert body["error"]["details"]["new_username"] == "new-handle"
