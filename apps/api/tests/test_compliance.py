import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_compliance_screen_passed():
    """Test standard compliance screening that passes all sanctions and computes duty correctly."""
    payload = {
        "tenant_id": "tenant_demo_123",
        "declaration_id": "DEC-100200",
        "items": [
            {
                "description": "High-frequency wireless network router",
                "declared_value_usd": 1000.00,
                "origin_country": "US",
                "destination_country": "DE",
            }
        ],
    }

    response = client.post(
        "/api/v1/compliance/screen",
        json=payload,
        headers={"X-Tenant-ID": "tenant_demo_123"},
    )

    assert response.status_code == 200
    data = response.json()

    # Top-level assertions
    assert data["declaration_id"] == "DEC-100200"
    assert data["tenant_id"] == "tenant_demo_123"
    assert data["overall_status"] == "PASSED"
    assert "execution_time_ms" in data

    # Dossier item assertions
    assert len(data["audit_dossier"]) == 1
    item = data["audit_dossier"][0]
    assert item["inferred_hs_code"] == "8517.62.00"
    assert item["sanctions_cleared"] is True
    assert item["applicable_duty_rate"] == "2.5%"
    assert item["estimated_tax_usd"] == 25.00
    assert item["status"] == "CLEARED"


def test_compliance_screen_flagged_embargoed_country():
    """Test screening an item originating from an embargoed country (KP - North Korea)."""
    payload = {
        "tenant_id": "tenant_demo_123",
        "declaration_id": "DEC-999000",
        "items": [
            {
                "description": "Industrial textile material",
                "declared_value_usd": 500.00,
                "origin_country": "KP",
                "destination_country": "US",
            }
        ],
    }

    response = client.post(
        "/api/v1/compliance/screen",
        json=payload,
        headers={"X-Tenant-ID": "tenant_demo_123"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["declaration_id"] == "DEC-999000"
    assert data["overall_status"] == "FLAGGED"

    item = data["audit_dossier"][0]
    assert item["sanctions_cleared"] is False
    assert item["status"] == "FLAGGED_SANCTION_RISK"


def test_compliance_screen_flagged_prohibited_description():
    """Test screening an item containing prohibited/sensitive keywords."""
    payload = {
        "tenant_id": "tenant_demo_123",
        "declaration_id": "DEC-888111",
        "items": [
            {
                "description": "Radioactive material container",
                "declared_value_usd": 15000.00,
                "origin_country": "US",
                "destination_country": "FR",
            }
        ],
    }

    response = client.post(
        "/api/v1/compliance/screen",
        json=payload,
        headers={"X-Tenant-ID": "tenant_demo_123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["overall_status"] == "FLAGGED"

    item = data["audit_dossier"][0]
    assert item["sanctions_cleared"] is False
    assert item["status"] == "FLAGGED_SANCTION_RISK"


def test_compliance_screen_multi_item_partial_flag():
    """Test a multi-item batch where one item passes and another triggers a flag."""
    payload = {
        "tenant_id": "tenant_demo_123",
        "declaration_id": "DEC-444333",
        "items": [
            {
                "description": "Personal computer workstation",
                "declared_value_usd": 2000.00,
                "origin_country": "US",
                "destination_country": "DE",
            },
            {
                "description": "Illegal weapon component",
                "declared_value_usd": 300.00,
                "origin_country": "US",
                "destination_country": "DE",
            },
        ],
    }

    response = client.post(
        "/api/v1/compliance/screen",
        json=payload,
        headers={"X-Tenant-ID": "tenant_demo_123"},
    )

    assert response.status_code == 200
    data = response.json()

    # Overall batch is marked FLAGGED due to item #2
    assert data["overall_status"] == "FLAGGED"
    assert len(data["audit_dossier"]) == 2

    # Item 1 cleared
    assert data["audit_dossier"][0]["sanctions_cleared"] is True
    assert data["audit_dossier"][0]["status"] == "CLEARED"

    # Item 2 flagged
    assert data["audit_dossier"][1]["sanctions_cleared"] is False
    assert data["audit_dossier"][1]["status"] == "FLAGGED_SANCTION_RISK"


def test_compliance_screen_missing_tenant_context():
    """Test validation failure when tenant context is missing from payload and header."""
    payload = {
        "tenant_id": "",
        "declaration_id": "DEC-000000",
        "items": [
            {
                "description": "Standard computer monitor",
                "declared_value_usd": 300.00,
                "origin_country": "US",
                "destination_country": "CA",
            }
        ],
    }

    response = client.post("/api/v1/compliance/screen", json=payload)

    assert response.status_code == 400
    assert "Missing mandatory tenant context" in response.json()["detail"]