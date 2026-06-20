export interface Node {
  id: string;
  label: string;
  name?: string;
  title?: string;
  game_id?: string;
  [key: string]: any;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  type: string;
  [key: string]: any;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}
