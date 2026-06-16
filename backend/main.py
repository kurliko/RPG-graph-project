from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db

app = FastAPI(title="RPG Graph API")

# Pozwala na zapytania z przeglądarki (React będzie działał na porcie 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # W celach deweloperskich zezwalamy na wszystko
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/graph")
def get_graph():
    # Proste zapytanie Cypher pobierające węzły i połączone z nimi węzły
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
            
            # Funkcja pomocnicza do serializacji węzła
            def serialize_node(node):
                props = dict(node.items())
                # Zabezpieczenie przed nadpisaniem systemowego "id" przez customowe "id" z naszej bazy RPG
                if 'id' in props:
                    props['game_id'] = props.pop('id')
                    
                return {
                    "id": node.element_id, # Główne unikalne ID grafowe z Neo4j
                    "label": list(node.labels)[0] if node.labels else "Unknown",
                    **props
                }
            
            if n.element_id not in nodes_dict:
                nodes_dict[n.element_id] = serialize_node(n)
            
            if m.element_id not in nodes_dict:
                nodes_dict[m.element_id] = serialize_node(m)
                
            # Serializacja relacji (krawędzi w grafie)
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

@app.get("/api/search")
def search_nodes(q: str):
    # Wyszukujemy węzły, których właściwość name lub title zawiera szukaną frazę (ignorując wielkość liter)
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
            node = record['n']
            props = dict(node.items())
            if 'id' in props:
                props['game_id'] = props.pop('id')
                
            nodes.append({
                "id": node.element_id,
                "label": list(node.labels)[0] if node.labels else "Unknown",
                **props
            })
            
    return {"nodes": nodes}

@app.get("/api/nodes/{node_id}/expand")
def expand_node(node_id: str):
    # Wyszukujemy węzeł po ID i dobieramy wszystkich jego sąsiadów dookoła (bez względu na kierunek relacji)
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
            
            def serialize_node(node):
                props = dict(node.items())
                if 'id' in props:
                    props['game_id'] = props.pop('id')
                return {
                    "id": node.element_id,
                    "label": list(node.labels)[0] if node.labels else "Unknown",
                    **props
                }
            
            if n.element_id not in nodes_dict:
                nodes_dict[n.element_id] = serialize_node(n)
            
            if m.element_id not in nodes_dict:
                nodes_dict[m.element_id] = serialize_node(m)
                
            # W relacjach w Python driver element [0] to źródło, a [1] to cel
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

@app.get("/api/path")
def shortest_path(source: str, target: str):
    # Wykorzystanie natywnego algorytmu grafowego: shortestPath
    query = """
    MATCH (start) WHERE elementId(start) = $source
    MATCH (end) WHERE elementId(end) = $target
    MATCH p = shortestPath((start)-[*]-(end))
    RETURN nodes(p) as path_nodes, relationships(p) as path_rels
    """
    
    results = db.query(query, parameters={"source": source, "target": target})
    
    nodes_dict = {}
    links = []
    
    if results and len(results) > 0:
        record = results[0]
        path_nodes = record['path_nodes']
        path_rels = record['path_rels']
        
        def serialize_node(node):
            props = dict(node.items())
            if 'id' in props:
                props['game_id'] = props.pop('id')
            return {
                "id": node.element_id,
                "label": list(node.labels)[0] if node.labels else "Unknown",
                **props
            }
            
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
