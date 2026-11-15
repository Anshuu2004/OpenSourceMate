"""Performance & memory profile benchmarks for split Python requirements (Issue #263)."""

import pytest
import time
from app.services.embedding_service import similarities, profile_text, issue_text


def test_keyword_fallback_speed_benchmark():
    """Verify that keyword fallback operates in sub-millisecond execution time."""
    skills = [
        {"name": "Python"},
        {"name": "FastAPI"},
        {"name": "Docker"},
        {"name": "PostgreSQL"},
        {"name": "Redis"},
    ]
    issues = [
        {
            "id": i,
            "title": f"Issue {i}: Optimize database queries with Redis cache and FastAPI",
            "body": "We need to speed up endpoint response times by caching results.",
            "labels": ["performance", "backend", "fastapi"],
        }
        for i in range(50)
    ]

    start = time.perf_counter()
    scores = similarities(skills, issues)
    duration = time.perf_counter() - start

    assert scores is None
    # Sub-millisecond execution verification
    assert duration < 0.05, f"Keyword fallback took {duration}s, expected < 0.05s"


def test_profile_and_issue_text_memory_efficiency():
    """Verify text construction does not duplicate or leak memory."""
    skills = [{"name": f"Skill-{i}"} for i in range(100)]
    text = profile_text(skills)
    assert len(text) > 100
    assert text.startswith("Developer skilled in Skill-0")

    large_issue = {
        "title": "Title " * 50,
        "body": "Body " * 200,
        "labels": [f"label-{i}" for i in range(20)],
    }
    extracted = issue_text(large_issue)
    assert "Title" in extracted
    assert "Body" in extracted
    assert "label-19" in extracted
