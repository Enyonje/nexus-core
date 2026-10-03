import time
import random
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/compliance", tags=["Cross-Border Compliance"])

# ------------------------------------------------------------------
# Request & Response Schemas
# ------------------------------------------------------------------

class CommodityItemInput(BaseModel):
    description: str = Field(
        ..., 
        example="High-frequency wireless network router with encryption module"
    )
    declared_value_usd: float = Field(..., gt=0, example=1250.00)
    origin_country: str = Field(..., min_length=2, max_length=2, example="US")
    destination_country: str = Field(..., min_length=2, max_length=2, example="DE")


class ScreenRequest(BaseModel):
    tenant_id: str = Field(..., example="tenant_demo_123")
    declaration_id: str = Field(..., example="DEC-849201")
    items: List[CommodityItemInput]


class ItemAuditDossier(BaseModel):
    item_description: str
    inferred_hs_code: str
    sanctions_cleared: bool
    applicable_duty_rate: str
    estimated_tax_usd: float
    status: str


class ScreenResponse(BaseModel):
    declaration_id: str
    tenant_id: str
    overall_status: str  # "PASSED" or "FLAGGED"
    execution_time_ms: str
    audit_dossier: List[ItemAuditDossier]


# ------------------------------------------------------------------
# Mock Compliance Processing Engines
# ------------------------------------------------------------------

def infer_hs_code(description: str) -> str:
    """Mock HS Code inference based on keywords in description."""
    desc_lower = description.lower()
    if "router" in desc_lower or "network" in desc_lower or "wireless" in desc_lower:
        return "8517.62.00"
    elif "computer" in desc_lower or "processor" in desc_lower:
        return "8471.30.01"
    elif "textile" in desc_lower or "apparel" in desc_lower:
        return "6204.62.40"
    return "8543.70.99"


def evaluate_sanctions(origin: str, destination: str, description: str) -> bool:
    """Sanctions check against embargoed corridors or sensitive goods."""
    embargoed_countries = {"KP", "IR", "SY", "CU"}
    if origin in embargoed_countries or destination in embargoed_countries:
        return False
    if "weapon" in description.lower() or "radioactive" in description.lower():
        return False
    return True


def calculate_duty_and_tax(hs_code: str, declared_value: float) -> tuple[float, str]:
    """Retrieves statutory duty rates and computes tax burden in USD."""
    rate_map = {
        "8517.62.00": 0.025,  # 2.5%
        "8471.30.01": 0.000,  # 0.0% (ITA Agreement)
        "6204.62.40": 0.120,  # 12.0%
        "8543.70.99": 0.045,  # 4.5%
    }
    rate = rate_map.get(hs_code, 0.05)
    tax_usd = round(declared_value * rate, 2)
    rate_percentage_str = f"{round(rate * 100, 2)}%"
    return tax_usd, rate_percentage_str


# ------------------------------------------------------------------
# Route Handler
# ------------------------------------------------------------------

@router.post(
    "/screen",
    response_model=ScreenResponse,
    status_code=status.HTTP_200_OK,
    summary="Screen commodities for cross-border tariff and statutory compliance",
)
async def screen_compliance(
    payload: ScreenRequest,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
):
    start_time = time.perf_counter()

    # Verify tenant header alignment if passed
    tenant_id = x_tenant_id or payload.tenant_id
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing mandatory tenant context in request payload or X-Tenant-ID header.",
        )

    audit_dossiers: List[ItemAuditDossier] = []
    has_flagged_item = False

    for item in payload.items:
        # Step 1: Infer HS Harmonized Tariff Code
        hs_code = infer_hs_code(item.description)

        # Step 2: Screen against embargoes and restrictions
        cleared = evaluate_sanctions(
            item.origin_country, item.destination_country, item.description
        )

        if not cleared:
            has_flagged_item = True

        # Step 3: Compute Duty & Estimated Tax Burden
        tax_usd, rate_str = calculate_duty_and_tax(hs_code, item.declared_value_usd)

        audit_dossiers.append(
            ItemAuditDossier(
                item_description=item.description,
                inferred_hs_code=hs_code,
                sanctions_cleared=cleared,
                applicable_duty_rate=rate_str,
                estimated_tax_usd=tax_usd,
                status="CLEARED" if cleared else "FLAGGED_SANCTION_RISK",
            )
        )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return ScreenResponse(
        declaration_id=payload.declaration_id,
        tenant_id=tenant_id,
        overall_status="FLAGGED" if has_flagged_item else "PASSED",
        execution_time_ms=f"{elapsed_ms}ms",
        audit_dossier=audit_dossiers,
    )