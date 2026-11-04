from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class SlipExtractionResponse(BaseModel):
    weight: Optional[float] = Field(None, description="Gross weight in grams (3 decimal precision)")
    purity: Optional[float] = Field(None, description="Gold purity percentage (2 decimal precision)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence score from 0.0 to 1.0")
    status: str = Field(..., description="HIGH_CONFIDENCE_DRAFT or LOW_CONFIDENCE_MANUAL_REQUIRED")
    notice: str = Field(
        "Draft reading only. The issue clerk must visually verify and confirm the weights prior to saving.",
        description="Operational advisory"
    )
    requires_human_confirmation: bool = Field(True, description="Strict rule: AI values require human confirmation")
    missing_fields: List[str] = Field(default_factory=list, description="Missing or uncertain fields")
    extracted_fields: Dict[str, Any] = Field(default_factory=dict, description="Detailed parsed tokens and cues")
