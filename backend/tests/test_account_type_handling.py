"""Tests for specialized GitHub account type handling (Issue #261).

Tests detection and distinct exception handling for:
- Organization accounts (returns 422 with clear message to provide personal username)
- Suspended user accounts (returns 403)
- Renamed user accounts / redirects (returns 301/308 redirect or informative renamed message)
- Missing / invalid accounts (returns 404 / 400 respectively)
"""

import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch

from app.exceptions import (
    OrganizationAccountError,
    SuspendedAccountError,
    RenamedAccountError,
    InvalidUsernameError,
)
from app.services.github_service import get_github_user
from tests.fixture_loader import load_fixture


@pytest.mark.asyncio
async def test_detects_organization_account_and_raises():
    org_data = load_fixture("users/organization_account.json")
    mock_response = Response(status_code=200, json=org_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        with pytest.raises(OrganizationAccountError) as exc_info:
            await get_github_user("octo-org", refresh=True)

        err = exc_info.value
        assert err.status_code == 422
        assert err.code == "ORGANIZATION_ACCOUNT"
        assert "organization account" in err.message.lower()
        assert "personal developer username" in err.message.lower()
        assert err.details["account_type"] == "Organization"


@pytest.mark.asyncio
async def test_detects_suspended_account_and_raises():
    suspended_data = load_fixture("users/suspended_account.json")
    mock_response = Response(status_code=200, json=suspended_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        with pytest.raises(SuspendedAccountError) as exc_info:
            await get_github_user("suspended-dev", refresh=True)

        err = exc_info.value
        assert err.status_code == 403
        assert err.code == "ACCOUNT_SUSPENDED"
        assert "suspended" in err.message.lower()


@pytest.mark.asyncio
async def test_detects_renamed_account_via_http_redirect():
    # GitHub returns 301 with new Location header when username is renamed
    mock_response = Response(
        status_code=301,
        headers={"Location": "https://api.github.com/users/new-handle"},
    )

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        with pytest.raises(RenamedAccountError) as exc_info:
            await get_github_user("old-handle", refresh=True)

        err = exc_info.value
        assert err.status_code == 301
        assert err.code == "ACCOUNT_RENAMED"
        assert "renamed to 'new-handle'" in err.message
        assert err.details["new_username"] == "new-handle"


@pytest.mark.asyncio
async def test_detects_renamed_account_via_payload_login_mismatch():
    renamed_data = load_fixture("users/renamed_account.json")
    mock_response = Response(status_code=200, json=renamed_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        with pytest.raises(RenamedAccountError) as exc_info:
            # Querying with old username "old-handle", but GitHub payload has "new-handle"
            await get_github_user("old-handle", refresh=True)

        err = exc_info.value
        assert err.code == "ACCOUNT_RENAMED"
        assert err.details["new_username"] == "new-handle"


@pytest.mark.asyncio
async def test_standard_user_account_succeeds_without_error():
    user_data = load_fixture("users/user_standard.json")
    mock_response = Response(status_code=200, json=user_data)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        user = await get_github_user("octocat", refresh=True)
        assert user is not None
        assert user["login"] == "octocat"
        assert user.get("type", "User") == "User"


@pytest.mark.asyncio
async def test_missing_account_returns_none_gracefully():
    mock_response = Response(status_code=404)

    with patch("app.services.github_service.github_get", AsyncMock(return_value=mock_response)):
        user = await get_github_user("nonexistent-user-xyz", refresh=True)
        assert user is None
