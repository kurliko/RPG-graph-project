from fastapi import APIRouter, HTTPException
from database import db
from schemas.models import LinkCreate
import re

router = APIRouter(prefix="/api/links", tags=["links"])

@router.post("")
def create_link(link: LinkCreate):
    rel_type = link.type
    if not re.match(r"^[a-zA-Z0-9_]+$", rel_type):
        raise HTTPException(status_code=400, detail="Invalid relationship type")
        
    props = ", ".join([f"{k}: ${k}" for k in link.properties.keys()])
    props_str = f" {{ {props} }}" if props else ""
    
    query = f"""
    MATCH (a) WHERE elementId(a) = $source_id
    MATCH (b) WHERE elementId(b) = $target_id
    CREATE (a)-[r:{rel_type}{props_str}]->(b)
    RETURN a, r, b
    """
    params = {"source_id": link.source_id, "target_id": link.target_id, **link.properties}
    results = db.query(query, parameters=params)
    
    if results and len(results) > 0:
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to create link (nodes might not exist)")

@router.delete("")
def delete_link(source_id: str, target_id: str, rel_type: str):
    if not re.match(r"^[a-zA-Z0-9_]+$", rel_type):
        raise HTTPException(status_code=400, detail="Invalid relationship type")
        
    query = f"""
    MATCH (a)-[r:{rel_type}]->(b)
    WHERE elementId(a) = $source_id AND elementId(b) = $target_id
    DELETE r
    """
    db.query(query, parameters={"source_id": source_id, "target_id": target_id})
    return {"success": True}
