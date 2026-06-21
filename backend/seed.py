import json
import os
from database import db, Neo4jConnection

def run_seed():
    print("Rozpoczęto wczytywanie danych...")
    with open('seed_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    
    db.query("MATCH (n) DETACH DELETE n")
    print("Poprzednia baza danych została wyczyszczona.")

    
    for node in data['nodes']:
        node_id = node.pop('id')
        label = node.pop('type')
        node['game_id'] = node_id
        
        
        props = ", ".join([f"{k}: ${k}" for k in node.keys()])
        query = f"CREATE (n:{label} {{ {props} }})"
        
        db.query(query, parameters=node)

    print(f"Dodano {len(data['nodes'])} węzłów.")

    
    for link in data['links']:
        source_id = link.pop('source')
        target_id = link.pop('target')
        rel_type = link.pop('type')
        
        props = ", ".join([f"{k}: ${k}" for k in link.keys()])
        props_str = f" {{ {props} }}" if props else ""
        
        query = f"""
        MATCH (a) WHERE a.game_id = $source_id
        MATCH (b) WHERE b.game_id = $target_id
        CREATE (a)-[r:{rel_type}{props_str}]->(b)
        """
        
        parameters = {"source_id": source_id, "target_id": target_id, **link}
        db.query(query, parameters=parameters)

    print(f"Dodano {len(data['links'])} relacji.")
    print("Baza danych zaktualizowana pomyślnie!")

if __name__ == "__main__":
    run_seed()
