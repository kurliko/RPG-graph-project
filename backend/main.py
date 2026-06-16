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

@app.get("/api/recommend/{monster_id}")
def recommend_equipment(monster_id: str):
    # Zapytanie rekomendujące ekwipunek: znajduje słabości potwora i dopasowuje bronie oraz umiejętności
    query = """
    MATCH (m)-[w:WEAK_AGAINST]->(e:Element)
    WHERE elementId(m) = $monster_id
    OPTIONAL MATCH (i:Item)-[r1:IMBUED_WITH]->(e)
    OPTIONAL MATCH (s:Skill)-[r2:USES_ELEMENT]->(e)
    RETURN m, w, e, i, r1, s, r2
    LIMIT 100
    """
    
    results = db.query(query, parameters={"monster_id": monster_id})
    
    nodes_dict = {}
    links = []
    
    def serialize_node(node):
        props = dict(node.items())
        if 'id' in props:
            props['game_id'] = props.pop('id')
        return {
            "id": node.element_id,
            "label": list(node.labels)[0] if node.labels else "Unknown",
            **props
        }
            
    if results:
        for record in results:
            m = record['m']
            e = record['e']
            w = record['w']
            i = record['i']
            r1 = record['r1']
            s = record['s']
            r2 = record['r2']
            
            if m and m.element_id not in nodes_dict:
                nodes_dict[m.element_id] = serialize_node(m)
            if e and e.element_id not in nodes_dict:
                nodes_dict[e.element_id] = serialize_node(e)
            if w:
                links.append({"source": w.nodes[0].element_id, "target": w.nodes[1].element_id, "type": w.type, **dict(w.items())})
                
            if i and i.element_id not in nodes_dict:
                nodes_dict[i.element_id] = serialize_node(i)
            if r1:
                links.append({"source": r1.nodes[0].element_id, "target": r1.nodes[1].element_id, "type": r1.type, **dict(r1.items())})
                
            if s and s.element_id not in nodes_dict:
                nodes_dict[s.element_id] = serialize_node(s)
            if r2:
                links.append({"source": r2.nodes[0].element_id, "target": r2.nodes[1].element_id, "type": r2.type, **dict(r2.items())})
                
    unique_links = {f"{l['source']}-{l['type']}-{l['target']}": l for l in links}
    
    return {
        "nodes": list(nodes_dict.values()),
        "links": list(unique_links.values())
    }

@app.get("/api/nodes/{node_id}/details")
def get_node_details(node_id: str):
    query = """
    MATCH (n) WHERE elementId(n) = $node_id
    OPTIONAL MATCH (n)-[:WEAK_AGAINST]->(w:Element)
    OPTIONAL MATCH (n)-[:RESISTANT_TO]->(r:Element)
    RETURN 
        [x IN collect(DISTINCT w.name) WHERE x IS NOT NULL] as weaknesses,
        [x IN collect(DISTINCT r.name) WHERE x IS NOT NULL] as resistances
    """
    results = db.query(query, parameters={"node_id": node_id})
    if results and len(results) > 0:
        record = results[0]
        return {
            "weaknesses": ", ".join(record["weaknesses"]) if record["weaknesses"] else "",
            "resistances": ", ".join(record["resistances"]) if record["resistances"] else ""
        }
    return {"weaknesses": "", "resistances": ""}

@app.get("/api/crafting/{item_id}")
def get_crafting_recipe(item_id: str):
    query = """
    MATCH (i:Item)-[req:REQUIRES]->(mat:Material)
    WHERE elementId(i) = $item_id
    OPTIONAL MATCH (mat)<-[drop:DROPS]-(m:Monster)
    RETURN 
        elementId(mat) as mat_id,
        mat.name as material_name,
        req.quantity as quantity,
        collect({monster: m.name, chance: drop.chance}) as drops
    """
    results = db.query(query, parameters={"item_id": item_id})
    recipe = []
    if results:
        for record in results:
            drops = []
            for d in record["drops"]:
                if d.get("monster"):
                    chance_pct = int(d["chance"] * 100) if d.get("chance") else 0
                    drops.append(f"{d['monster']} ({chance_pct}%)")
            
            recipe.append({
                "id": record["mat_id"],
                "material": record["material_name"],
                "quantity": record["quantity"],
                "sources": list(set(drops))
            })
    return {"recipe": recipe}
