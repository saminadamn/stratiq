from app.models import churn


def make_customers(n: int) -> list[dict]:
    customers = []
    for i in range(n):
        customers.append(
            {
                "customerId": f"C{i}",
                "customerName": f"Customer {i}",
                "recencyDays": float(i * 10),
                "frequency": 10 - i if i < 10 else 1,
                "monetary": float((10 - i) * 100) if i < 10 else 50.0,
                "avgOrderValue": 50.0,
            }
        )
    return customers


def test_trains_a_classifier_with_enough_customers():
    customers = make_customers(20)
    model, algorithm, metrics = churn.train(customers)
    assert algorithm == "logistic_regression"
    assert model is not None
    assert metrics["sampleSize"] == 20

    predictions = churn.predict(model, customers)
    assert len(predictions) == 20
    for prediction in predictions:
        assert 0.0 <= prediction["churnProbability"] <= 1.0
        assert prediction["explanation"]["method"] == "logistic_regression_coefficients"
        assert len(prediction["explanation"]["topFeatures"]) == 3


def test_falls_back_to_heuristic_with_too_few_customers():
    customers = make_customers(3)
    model, algorithm, metrics = churn.train(customers)
    assert model is None
    assert algorithm == "recency_percentile_heuristic"

    predictions = churn.predict(model, customers)
    assert len(predictions) == 3
    for prediction in predictions:
        assert prediction["explanation"]["method"] == "recency_percentile_heuristic"
        assert prediction["confidence"] == 0.5


def test_falls_back_to_heuristic_when_all_customers_same_recency_bucket():
    # Every customer has identical recency, so the proxy label is degenerate
    # (single class) even though there are plenty of customers.
    customers = [
        {"customerId": f"C{i}", "customerName": None, "recencyDays": 10.0, "frequency": i, "monetary": float(i * 10), "avgOrderValue": 20.0}
        for i in range(10)
    ]
    model, algorithm, _ = churn.train(customers)
    assert model is None
    assert algorithm == "recency_percentile_heuristic"
