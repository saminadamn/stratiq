from app.models import recommendation


def make_catalog() -> list[dict]:
    return [
        {"productId": "P1", "productName": "Widget", "category": "Widgets", "unitsSold": 100.0, "revenue": 5000.0},
        {"productId": "P2", "productName": "Gadget", "category": "Gadgets", "unitsSold": 10.0, "revenue": 500.0},
        {"productId": "P3", "productName": "Widget Pro", "category": "Widgets", "unitsSold": 50.0, "revenue": 3000.0},
    ]


def test_recommends_products_not_already_purchased():
    catalog = make_catalog()
    purchases = [{"customerId": "C1", "productIds": ["P1"]}]

    model, algorithm, metrics = recommendation.train(purchases, catalog)
    assert algorithm == "popularity_category_affinity_hybrid"
    assert metrics["catalogSize"] == 3

    results = recommendation.predict(model, purchases)
    recommended_ids = {r["recommendedProductId"] for r in results}
    assert "P1" not in recommended_ids
    assert recommended_ids.issubset({"P2", "P3"})


def test_prefers_same_category_over_pure_popularity():
    catalog = make_catalog()
    # This customer already buys Widgets — P3 (same category, less popular
    # than P2) should still outrank P2 (different category, more popular)
    # because of the category affinity term.
    purchases = [{"customerId": "C1", "productIds": ["P1"]}]

    model, _, _ = recommendation.train(purchases, catalog)
    results = recommendation.predict(model, purchases)
    ranked_ids = [r["recommendedProductId"] for r in results]
    assert ranked_ids.index("P3") < ranked_ids.index("P2")


def test_returns_no_recommendations_when_customer_owns_entire_catalog():
    catalog = make_catalog()
    purchases = [{"customerId": "C1", "productIds": ["P1", "P2", "P3"]}]
    model, _, _ = recommendation.train(purchases, catalog)
    results = recommendation.predict(model, purchases)
    assert results == []
