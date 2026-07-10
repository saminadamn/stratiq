from app.registry.model_registry import ModelRegistry


def test_saves_and_loads_an_artifact(tmp_path):
    registry = ModelRegistry(root=tmp_path)
    record = registry.save("org-1", "CHURN", "version-1", {"weights": [1, 2, 3]}, "logistic_regression", {"accuracy": 0.9})
    assert record.version == 1

    loaded = registry.load("org-1", "CHURN", record.version)
    assert loaded == {"weights": [1, 2, 3]}


def test_finds_existing_artifact_for_the_same_dataset_version(tmp_path):
    registry = ModelRegistry(root=tmp_path)
    registry.save("org-1", "CHURN", "version-1", "model-a", "logistic_regression", {})

    found = registry.find_for_dataset_version("org-1", "CHURN", "version-1")
    assert found is not None
    assert found.version == 1

    not_found = registry.find_for_dataset_version("org-1", "CHURN", "version-2")
    assert not_found is None


def test_version_increments_across_dataset_versions(tmp_path):
    registry = ModelRegistry(root=tmp_path)
    first = registry.save("org-1", "CHURN", "version-1", "model-a", "logistic_regression", {})
    second = registry.save("org-1", "CHURN", "version-2", "model-b", "logistic_regression", {})
    assert first.version == 1
    assert second.version == 2

    # A later dataset version's model doesn't disturb an earlier one.
    assert registry.find_for_dataset_version("org-1", "CHURN", "version-1").version == 1


def test_list_all_reports_every_trained_model(tmp_path):
    registry = ModelRegistry(root=tmp_path)
    registry.save("org-1", "CHURN", "version-1", "model-a", "logistic_regression", {"accuracy": 0.8})
    registry.save("org-1", "FORECAST", "version-1", {"slope": 1.0}, "linear_trend", {"rSquared": 0.7})

    models = registry.list_all("org-1")
    keys = {m["modelKey"] for m in models}
    assert keys == {"CHURN", "FORECAST"}
