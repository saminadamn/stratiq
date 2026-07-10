"""Product Recommendation.

A popularity + content-similarity hybrid, not collaborative filtering — with
CSV-scale order histories, co-purchase signal is too sparse for matrix
factorization to find anything meaningful, while popularity (what sells) and
category affinity (what this customer already buys into) are both legible,
explainable, and available from day one for a brand-new organization with a
single uploaded dataset.
"""

TOP_N_PER_CUSTOMER = 3
POPULARITY_WEIGHT = 0.5
CATEGORY_AFFINITY_WEIGHT = 0.5


def train(customer_purchases: list[dict], product_catalog: list[dict]) -> tuple[dict, str, dict]:
    max_units_sold = max((p["unitsSold"] for p in product_catalog), default=0) or 1.0
    model = {
        "product_catalog": product_catalog,
        "max_units_sold": max_units_sold,
    }
    metrics = {"catalogSize": len(product_catalog), "customerCount": len(customer_purchases)}
    return model, "popularity_category_affinity_hybrid", metrics


def predict(model: dict, customer_purchases: list[dict]) -> list[dict]:
    catalog = model["product_catalog"]
    max_units_sold = model["max_units_sold"]

    results = []
    for customer in customer_purchases:
        purchased_ids = set(customer["productIds"])
        purchased_categories = {
            p["category"]
            for p in catalog
            if p["productId"] in purchased_ids and p.get("category")
        }

        scored = []
        for product in catalog:
            if product["productId"] in purchased_ids:
                continue
            popularity_score = product["unitsSold"] / max_units_sold
            category_affinity = 1.0 if product.get("category") in purchased_categories else 0.0
            score = POPULARITY_WEIGHT * popularity_score + CATEGORY_AFFINITY_WEIGHT * category_affinity
            reason = (
                "Frequently bought within a category you already purchase from"
                if category_affinity > popularity_score
                else "One of the best-selling products overall"
            )
            scored.append((score, product, reason))

        scored.sort(key=lambda item: item[0], reverse=True)
        for score, product, reason in scored[:TOP_N_PER_CUSTOMER]:
            results.append(
                {
                    "customerId": customer["customerId"],
                    "recommendedProductId": product["productId"],
                    "recommendedProductName": product.get("productName"),
                    "score": round(float(score), 4),
                    "reason": reason,
                }
            )
    return results
