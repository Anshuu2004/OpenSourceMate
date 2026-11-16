"""Unit tests validating split Python requirements and lazy ML loading (Issue #263)."""

from pathlib import Path
import pytest
from app.services.embedding_service import (
    embeddings_enabled,
    _load_model,
    similarities,
    profile_text,
    issue_text,
)


def test_requirements_files_exist_and_are_pinned():
    base_dir = Path(__file__).resolve().parent.parent / "requirements"
    assert (base_dir / "base.txt").exists(), "requirements/base.txt missing"
    assert (base_dir / "dev.txt").exists(), "requirements/dev.txt missing"
    assert (base_dir / "ml.txt").exists(), "requirements/ml.txt missing"

    # Base requirements must not contain heavy ML packages
    base_text = (base_dir / "base.txt").read_text()
    assert "sentence-transformers" not in base_text
    assert "torch" not in base_text
    assert "transformers" not in base_text
    assert "fastapi" in base_text
    assert "pydantic" in base_text

    # ML requirements must contain heavy semantic dependencies
    ml_text = (base_dir / "ml.txt").read_text()
    assert "sentence-transformers" in ml_text
    assert "torch" in ml_text


def test_root_requirements_pointers():
    backend_dir = Path(__file__).resolve().parent.parent
    req_txt = (backend_dir / "requirements.txt").read_text()
    assert "requirements/base.txt" in req_txt

    req_dev = (backend_dir / "requirements-dev.txt").read_text()
    assert "requirements/dev.txt" in req_dev

    req_opt = (backend_dir / "requirements-optional.txt").read_text()
    assert "requirements/ml.txt" in req_opt


def test_embeddings_disabled_by_default(monkeypatch):
    monkeypatch.delenv("OSM_USE_EMBEDDINGS", raising=False)
    assert not embeddings_enabled()


def test_similarities_fallback_without_ml_model(monkeypatch):
    # When OSM_USE_EMBEDDINGS is false or unset, similarities returns None gracefully
    monkeypatch.delenv("OSM_USE_EMBEDDINGS", raising=False)
    skills = [{"name": "python"}, {"name": "react"}]
    issues = [{"title": "Fix React bug", "body": "details", "labels": ["bug"]}]

    scores = similarities(skills, issues)
    assert scores is None, "Should fallback to None without error when ML is disabled"


def test_lazy_load_model_gracefully_handles_missing_sentence_transformers(monkeypatch):
    import app.services.embedding_service as emb
    # Reset module state
    emb._model = None
    emb._model_failed = False

    # Mock import failure for sentence_transformers
    import builtins
    real_import = builtins.__import__

    def mock_import(name, *args, **kwargs):
        if "sentence_transformers" in name:
            raise ImportError("No module named 'sentence_transformers'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", mock_import)

    model = _load_model()
    assert model is None
    assert emb._model_failed is True


def test_text_helpers_format_correctly():
    user_skills = [{"name": "Python"}, {"name": "Docker"}]
    text = profile_text(user_skills)
    assert "Developer skilled in Python, Docker" in text

    issue = {
        "title": "Add Dockerfile",
        "body": "Containerize the FastAPI application",
        "labels": ["devops", "docker"],
    }
    assert "Add Dockerfile" in issue_text(issue)
    assert "Containerize" in issue_text(issue)
    assert "devops docker" in issue_text(issue)
