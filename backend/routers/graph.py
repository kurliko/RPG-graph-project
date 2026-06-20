from fastapi import APIRouter
from database import db
from services.neo4j_service import serialize_node

router = APIRouter(prefix="/api", tags=["graph"])

@router.get("/graph")
def get_graph():
    query = """
    MATCH (n)-[r]->(m)
    RETURN n, r, m
    LIMIT 100
    """
    results = db.query(query)
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
                "source": n.element_id,
                "target": m.element_id,
                "type": r.type,
                **dict(r.items())
            })
            
    return {
        "nodes": list(nodes_dict.values()),
        "links": links
    }

@router.get("/search")
def search_nodes(q: str):
    query = """
    MATCH (n)
    WHERE toLower(n.name) CONTAINS toLower($q) OR toLower(n.title) CONTAINS toLower($q)
    RETURN n
    LIMIT 20
    """
    results = db.query(query, parameters={"q": q})
    nodes = []
    if results:
        for record in results:
            nodes.append(serialize_node(record['n']))
            
    return {"nodes": nodes}

@router.get("/path")
def shortest_path(source_id: str, target_id: str):
    query = """
    MATCH (start) WHERE elementId(start) = $source
    MATCH (end) WHERE elementId(end) = $target
    MATCH p = shortestPath((start)-[*]-(end))
    RETURN nodes(p) as path_nodes, relationships(p) as path_rels
    """
    results = db.query(query, parameters={"source": source_id, "target": target_id})
    nodes_dict = {}
    links = []
    
    if results and len(results) > 0:
        record = results[0]
        path_nodes = record['path_nodes']
        path_rels = record['path_rels']
            
        for n in path_nodes:
            if n.element_id not in nodes_dict:
                nodes_dict[n.element_id] = serialize_node(n)
                
        for r in path_rels:
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
