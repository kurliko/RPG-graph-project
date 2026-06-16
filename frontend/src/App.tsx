import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ForceGraph2D from 'react-force-graph-2d';
import './index.css';

interface Node {
  id: string;
  label: string;
  name?: string;
  title?: string;
  game_id?: string;
  [key: string]: any;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: string;
  [key: string]: any;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

function App() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const fgRef = useRef<any>();

  // Inicjalne załadowanie grafu
  useEffect(() => {
    axios.get('http://localhost:8000/api/graph')
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Błąd API:", error);
        setLoading(false);
      });
  }, []);

  // Endpoint do ekspansji (rozszerzania) węzła
  const handleExpandNode = async () => {
    if (!selectedNode) return;
    
    try {
      const res = await axios.get(`http://localhost:8000/api/nodes/${encodeURIComponent(selectedNode.id)}/expand`);
      const { nodes: newNodes, links: newLinks } = res.data;
      
      setData((prevData) => {
        // Unikanie duplikatów
        const nodeMap = new Map(prevData.nodes.map(n => [n.id, n]));
        newNodes.forEach((n: Node) => nodeMap.set(n.id, n));
        
        const linkMap = new Map(prevData.links.map(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return [`${sourceId}-${l.type}-${targetId}`, l];
        }));
        
        newLinks.forEach((l: Link) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          linkMap.set(`${sourceId}-${l.type}-${targetId}`, l);
        });

        return {
          nodes: Array.from(nodeMap.values()),
          links: Array.from(linkMap.values())
        };
      });
    } catch (error) {
      console.error("Błąd podczas rozszerzania węzła:", error);
    }
  };

  const getNodeColor = (node: Node) => {
    switch (node.label) {
      case 'Item': return '#FFD700';
      case 'Material': return '#C0C0C0';
      case 'Monster': return '#FF4500';
      case 'NPC': return '#1E90FF';
      case 'Zone': return '#32CD32';
      case 'Quest': return '#9370DB';
      default: return '#A9A9A9';
    }
  };

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    fgRef.current.centerAt(node.x, node.y, 1000);
    fgRef.current.zoom(3, 2000);
  }, []);

  if (loading) return <div className="loading">Ładowanie grafu...</div>;

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">
          <h1>🛡️ RPG Graph: Mitologia Nordycka</h1>
        </div>
        <div className="legend">
          <span style={{color: '#FFD700'}}>● Item</span>
          <span style={{color: '#C0C0C0'}}>● Material</span>
          <span style={{color: '#FF4500'}}>● Monster</span>
          <span style={{color: '#1E90FF'}}>● NPC</span>
          <span style={{color: '#32CD32'}}>● Zone</span>
          <span style={{color: '#9370DB'}}>● Quest</span>
        </div>
      </header>
      
      <div className="main-content">
        <div className="graph-wrapper">
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeLabel={(node: any) => `${node.label}: ${node.name || node.title || node.game_id}`}
            nodeColor={(node: any) => getNodeColor(node)}
            nodeRelSize={7}
            linkColor={() => '#444'}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkLabel={(link: any) => link.type}
            onNodeClick={handleNodeClick}
            // Zaznaczanie klikniętego węzła
            nodeCanvasObjectMode={node => node.id === selectedNode?.id ? 'before' : undefined}
            nodeCanvasObject={(node, ctx) => {
              if (node.id === selectedNode?.id && node.x && node.y) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
              }
            }}
          />
        </div>
        
        {/* Panel boczny */}
        <div className={`sidebar ${selectedNode ? 'open' : ''}`}>
          {selectedNode ? (
            <div className="sidebar-content">
              <h2>{selectedNode.name || selectedNode.title || 'Nieznany Obiekt'}</h2>
              <span className="badge" style={{backgroundColor: getNodeColor(selectedNode)}}>
                {selectedNode.label}
              </span>
              
              <div className="details-list">
                {Object.entries(selectedNode)
                  .filter(([key]) => !['id', 'x', 'y', 'vx', 'vy', 'index', 'name', 'title', 'label'].includes(key))
                  .map(([key, value]) => (
                    <div className="detail-item" key={key}>
                      <span className="detail-key">{key}:</span>
                      <span className="detail-value">{String(value)}</span>
                    </div>
                  ))}
              </div>

              <button className="action-button expand-btn" onClick={handleExpandNode}>
                🔍 Eksploruj powiązania
              </button>
              
              <button className="action-button close-btn" onClick={() => setSelectedNode(null)}>
                Zamknij panel
              </button>
            </div>
          ) : (
            <div className="sidebar-empty">
              Wybierz węzeł, aby zobaczyć szczegóły.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
