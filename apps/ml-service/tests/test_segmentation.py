from app.models import segmentation


def test_single_segment_for_a_tiny_customer_base():
    customers = [
        {"customerId": "C1", "customerName": "Alice", "recencyDays": 5.0, "frequency": 3, "monetary": 300.0, "avgOrderValue": 100.0},
    ]
    model, algorithm, metrics = segmentation.train(customers)
    assert algorithm == "single_segment"
    result = segmentation.predict(model, customers)
    assert len(result["segments"]) == 1
    assert result["segments"][0]["customerCount"] == 1


def test_clusters_high_and_low_value_customers_separately():
    high_value = [
        {"customerId": f"H{i}", "customerName": None, "recencyDays": 5.0, "frequency": 20, "monetary": 5000.0, "avgOrderValue": 250.0}
        for i in range(5)
    ]
    low_value = [
        {"customerId": f"L{i}", "customerName": None, "recencyDays": 60.0, "frequency": 1, "monetary": 50.0, "avgOrderValue": 50.0}
        for i in range(5)
    ]
    customers = high_value + low_value

    model, algorithm, metrics = segmentation.train(customers)
    assert algorithm == "kmeans"
    assert metrics["clusters"] >= 2

    result = segmentation.predict(model, customers)
    # The highest-ranked segment (by average spend) should be the high-value group.
    top_segment = result["segments"][0]
    assert top_segment["averageSpend"] > result["segments"][-1]["averageSpend"]

    assignments_by_customer = {a["customerId"]: a["segmentId"] for a in result["assignments"]}
    high_value_segment_ids = {assignments_by_customer[c["customerId"]] for c in high_value}
    low_value_segment_ids = {assignments_by_customer[c["customerId"]] for c in low_value}
    assert high_value_segment_ids.isdisjoint(low_value_segment_ids)
