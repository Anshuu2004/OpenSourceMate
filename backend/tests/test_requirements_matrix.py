"""Comprehensive requirements matrix validation and safety checks (Issue #263)."""

from pathlib import Path
import re


def test_requirements_matrix_formatting_and_constraints():
    req_dir = Path(__file__).resolve().parent.parent / "requirements"

    for req_file in ["base.txt", "dev.txt", "ml.txt"]:
        file_path = req_dir / req_file
        assert file_path.exists()
        lines = [
            line.strip()
            for line in file_path.read_text().splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]

        for line in lines:
            if line.startswith("-r"):
                # Reference pointer line
                assert line.endswith(".txt")
            else:
                # Package line: check pinned or bounded version
                assert any(op in line for op in ["==", ">=", "<=", "~="]), (
                    f"Requirement '{line}' in {req_file} must have explicit version constraint"
                )


def test_no_unpinned_critical_packages():
    req_dir = Path(__file__).resolve().parent.parent / "requirements"
    base_text = (req_dir / "base.txt").read_text()

    # Verify crucial core packages are strictly pinned for reproducible builds
    assert re.search(r"fastapi==\d+\.\d+", base_text)
    assert re.search(r"uvicorn==\d+\.\d+", base_text)
    assert re.search(r"httpx==\d+\.\d+", base_text)
    assert re.search(r"pydantic==\d+\.\d+", base_text)
    assert re.search(r"pydantic_core==\d+\.\d+", base_text)
