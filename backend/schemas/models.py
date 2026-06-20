from pydantic import BaseModel
from typing import Dict, Any, Optional

class NodeCreate(BaseModel):
    label: str
    properties: Dict[str, Any]

class NodeUpdate(BaseModel):
    properties: Dict[str, Any]

class LinkCreate(BaseModel):
    source_id: str
    target_id: str
    type: str
    properties: Dict[str, Any] = {}
