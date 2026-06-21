def serialize_node(node):
    """
    Serylizuje węzeł Neo4j na słownik bezpieczny do odesłania przez API.
    Zamienia 'id' na 'game_id', aby nie nadpisać systemowego identyfikatora węzła Neo4j.
    """
    props = dict(node.items())
    if 'id' in props:
        props['game_id'] = props.pop('id')
        
    return {
        "id": node.element_id,
        "label": list(node.labels)[0] if node.labels else "Unknown",
        **props
    }

def extract_links(results, link_records_index='r', source_idx=0, target_idx=1):
    """
    Ekstrahuje unikalne krawędzie (links) z wyników zapytania.
    """
    links = []
    if not results:
        return links
        
    for record in results:
        r = record.get(link_records_index)
        if r is not None:
            links.append({
                "source": r.nodes[source_idx].element_id,
                "target": r.nodes[target_idx].element_id,
                "type": r.type,
                **dict(r.items())
            })
            
    unique_links = {f"{l['source']}-{l['type']}-{l['target']}": l for l in links}
    return list(unique_links.values())
