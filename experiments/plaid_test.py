#!/usr/bin/env python3
"""
Test script for Plaid Transactions Enrich API
"""

import os
import requests
import json
from typing import Any
from dotenv import load_dotenv

load_dotenv()

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")


def test_plaid_enrich() -> None:
    """Test the Plaid Transactions Enrich endpoint"""

    url = "https://production.plaid.com/transactions/enrich"

    headers = {"Content-Type": "application/json"}

    payload = {
        "client_id": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
        "account_type": "depository",
        "transactions": [
            {
                "id": "6135818adda16500147e7c1d",
                "description": "Uniqlo",
                "amount": 84.47,
                "direction": "OUTFLOW",
                "iso_currency_code": "USD",
                "location": {"city": "McLean", "region": "VA"},
                "date_posted": "2022-07-05",
            },
        ],
    }

    try:
        print("Making request to Plaid Transactions Enrich API...")
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print("\n" + "=" * 50 + "\n")

        response = requests.post(url, headers=headers, json=payload)

        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print("\n" + "=" * 50 + "\n")

        if response.headers.get("content-type", "").startswith("application/json"):
            response_data = response.json()
            print("Response Body:")
            print(json.dumps(response_data, indent=2))
        else:
            print("Response Body (raw):")
            print(response.text)

        response.raise_for_status()
        print("\n✅ Request successful!")

    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request failed: {e}")
        if hasattr(e, "response") and e.response is not None:
            print(f"Status Code: {e.response.status_code}")
            try:
                print(f"Error Response: {json.dumps(e.response.json(), indent=2)}")
            except:
                print(f"Error Response (raw): {e.response.text}")
        raise
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    test_plaid_enrich()
