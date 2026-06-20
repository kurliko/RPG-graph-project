from fastapi import APIRouter
from database import db
from services.neo4j_service import serialize_node, extract_links

router = APIRouter(prefix="/api", tags=["game_logic"])

@router.get("/recommend/{monster_id}")
def recommend_equipment(monster_id: str):
    query = """
    MATCH (m)-[w:WEAK_AGAINST]->(e:Element)
    WHERE elementId(m) = $monster_id
    OPTIONAL MATCH (i:Item)-[r1:IMBUED_WITH]->(e)
    OPTIONAL MATCH (s:Skill)-[r2:USES_ELEMENT]->(e)
    RETURN m, w, e, i, r1, s, r2
    LIMIT 100
    """
    results = db.query(query, parameters={"monster_id": monster_id})
    
    recommendations = {}
    if results:
        for record in results:
            i = record['i']
            s = record['s']
            if i is not None and i.element_id not in recommendations:
                recommendations[i.element_id] = serialize_node(i)
            if s is not None and s.element_id not in recommendations:
                recommendations[s.element_id] = serialize_node(s)
                
    return {"recommendations": list(recommendations.values())}

@router.get("/usages/{material_id}")
def get_usages(material_id: str):
    query = """
    MATCH (i:Item)-[r:REQUIRES]->(m:Material)
    WHERE elementId(m) = $material_id
    RETURN i, r, m
    """
    results = db.query(query, parameters={"material_id": material_id})
    nodes_dict = {}
    
    if results:
        for record in results:
            i = record['i']
            if i is not None and i.element_id not in nodes_dict:
                nodes_dict[i.element_id] = serialize_node(i)
                
    return {"usages": list(nodes_dict.values())}

@router.get("/nodes/{node_id}/details")
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

@router.get("/crafting/{item_id}")
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

@router.get("/obtain/{skill_id}")
def get_obtain_info(skill_id: str):
    query = """
    MATCH (n)-[r:TEACHES|GRANTS_SKILL|UNLOCKS|DROPS]->(s:Skill)
    WHERE elementId(s) = $skill_id
    RETURN 
        elementId(n) as source_id,
        n.name as source_name,
        labels(n)[0] as source_label,
        type(r) as relation_type
    """
    results = db.query(query, parameters={"skill_id": skill_id})
    sources = []
    if results:
        for record in results:
            sources.append({
                "id": record["source_id"],
                "name": record["source_name"],
                "label": record["source_label"],
                "type": record["relation_type"]
            })
    return {"sources": sources}
