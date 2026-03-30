"""Pytest hooks: set DB before app.config is imported by test modules."""

import os


def pytest_configure(config):
    # Default local Mongo; override with MONGO_URL / TEST_DB_NAME in the environment.
    os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
    os.environ.setdefault("DB_NAME", os.environ.get("TEST_DB_NAME", "tareas_hogar_pytest"))
