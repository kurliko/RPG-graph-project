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
