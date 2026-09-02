"""Every third-party package the pipeline needs must be importable.

This exists because `google-cloud-storage` was imported by ingest.py and
state_store.py but never listed in requirements.txt. It was present in local
virtualenvs, so everything worked on a workstation — but the container image is
built from requirements.txt alone, and every scheduled Cloud Run ingest from
2026-08-03 onward died instantly with:

    ImportError: cannot import name 'storage' from 'google.cloud'

The transform job kept succeeding against the stale lake, so the pipeline
looked healthy while ingesting nothing for a month.

`compileall` cannot catch this: the storage imports are deliberately lazy, so
the module compiles and even imports fine without the package installed. Only
an actual import attempt fails. CI installs *only* requirements.txt, so a
dependency that is missing there fails here.
"""
import importlib

import pytest

# Third-party modules imported anywhere in the pipeline.
REQUIRED = [
    "requests",
    "bs4",
    "dotenv",
    "google.cloud.storage",
    "google.cloud.bigquery",
    "urllib3",
]


@pytest.mark.parametrize("module", REQUIRED)
def test_dependency_is_installed(module):
    try:
        importlib.import_module(module)
    except ImportError as exc:
        pytest.fail(
            f"{module!r} is imported by the pipeline but not installed. "
            f"Add it to requirements.txt. Original error: {exc}"
        )


def test_storage_client_is_constructible():
    """The exact import that broke production, in the form the code uses."""
    from google.cloud import storage

    assert hasattr(storage, "Client")
