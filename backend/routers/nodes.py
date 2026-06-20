from fastapi import APIRouter, HTTPException
from database import db
from schemas.models import NodeCreate, NodeUpdate
from services.neo4j_service import serialize_node

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

@router.get("/{node_id}/expand")
def expand_node(node_id: str):
    query = """
    MATCH (n)-[r]-(m)
    WHERE elementId(n) = $node_id
    RETURN n, r, m
    LIMIT 50
    """
    results = db.query(query, parameters={"node_id": node_id})
    nodes_dict = {}
    links = []
    
    if results:
        for record in results:
            n = record['n']
            m = record['m']
            r = record['r']
            
            if n.element_id not in nodes_dict:
                nodes_dict[n.element_id] = serialize_node(n)
            
            if m.element_id not in nodes_dict:
                nodes_dict[m.element_id] = serialize_node(m)
                
            links.append({
                "source": r.nodes[0].element_id,
                "target": r.nodes[1].element_id,
                "type": r.type,
                **dict(r.items())
            })
            
    return {
        "nodes": list(nodes_dict.values()),
        "links": links
    }

@router.post("")
def create_node(node: NodeCreate):
    label = node.label
    if not label.isalnum():
        raise HTTPException(status_code=400, detail="Invalid label")
    
    props = ", ".join([f"{k}: ${k}" for k in node.properties.keys()])
    query = f"CREATE (n:{label} {{ {props} }}) RETURN n"
    
    results = db.query(query, parameters=node.properties)
    if results and len(results) > 0:
        return serialize_node(results[0]['n'])
    raise HTTPException(status_code=500, detail="Failed to create node")

@router.put("/{node_id}")
def update_node(node_id: str, node: NodeUpdate):
    props = ", ".join([f"n.{k} = ${k}" for k in node.properties.keys()])
    if not props:
        raise HTTPException(status_code=400, detail="No properties provided")
        
    query = f"""
    MATCH (n) WHERE elementId(n) = $node_id
    SET {props}
    RETURN n
    """
    params = {"node_id": node_id, **node.properties}
    results = db.query(query, parameters=params)
    if results and len(results) > 0:
        return serialize_node(results[0]['n'])
    raise HTTPException(status_code=404, detail="Node not found")

@router.delete("/{node_id}")
def delete_node(node_id: str):
    query = "MATCH (n) WHERE elementId(n) = $node_id DETACH DELETE n"
    db.query(query, parameters={"node_id": node_id})
    return {"success": True}
