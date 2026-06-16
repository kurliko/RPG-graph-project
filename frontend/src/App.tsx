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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [pathSource, setPathSource] = useState<Node | null>(null);
  const [pathTarget, setPathTarget] = useState<Node | null>(null);
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set());
  const [pathLinks, setPathLinks] = useState<Set<string>>(new Set());
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

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 1) {
      try {
        const res = await axios.get(`http://localhost:8000/api/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data.nodes);
      } catch (error) {
        console.error("Błąd wyszukiwania:", error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (nodeId: string) => {
    const foundNode = data.nodes.find(n => n.id === nodeId);
    if (foundNode) {
      handleNodeClick(foundNode);
    } else {
      alert("Aby wycentrować ten węzeł, rozszerz graf w jego pobliżu (brak go w obecnym widoku).");
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleFindPath = async () => {
    if (!pathSource || !pathTarget) return;
    try {
      const res = await axios.get(`http://localhost:8000/api/path?source=${encodeURIComponent(pathSource.id)}&target=${encodeURIComponent(pathTarget.id)}`);
      
      const pNodes = new Set<string>();
      const pLinks = new Set<string>();
      res.data.nodes.forEach((n: any) => pNodes.add(n.id));
      res.data.links.forEach((l: any) => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source;
        const tid = typeof l.target === 'object' ? l.target.id : l.target;
        pLinks.add(`${sid}-${l.type}-${tid}`);
      });
      setPathNodes(pNodes);
      setPathLinks(pLinks);
      
      // Dodajemy do głównego grafu jeśli węzły lub relacje są nowe
      setData((prevData) => {
        const nodeMap = new Map(prevData.nodes.map(n => [n.id, n]));
        res.data.nodes.forEach((n: Node) => nodeMap.set(n.id, n));
        
        const linkMap = new Map(prevData.links.map(l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return [`${s}-${l.type}-${t}`, l];
        }));
        
        res.data.links.forEach((l: Link) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          linkMap.set(`${s}-${l.type}-${t}`, l);
        });
        return { nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) };
      });
    } catch (e) {
      console.error(e);
      alert("Nie znaleziono ścieżki!");
    }
  };

  const clearPath = () => {
    setPathSource(null);
    setPathTarget(null);
    setPathNodes(new Set());
    setPathLinks(new Set());
  };

  if (loading) return <div className="loading">Ładowanie grafu...</div>;

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-title">
          <h1>🛡️ RPG Graph</h1>
        </div>
        
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Szukaj (np. Mjolnir)..." 
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(n => (
                <div key={n.id} className="search-result-item" onClick={() => handleSelectSearchResult(n.id)}>
                  {n.name || n.title || n.game_id} <span style={{fontSize: '0.7rem', color: '#8b949e'}}>({n.label})</span>
                </div>
              ))}
            </div>
          )}
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
        {(pathSource || pathTarget) && (
          <div className="path-panel">
            <h3>Ścieżka</h3>
            <div className="path-endpoints">
              <p>📍 Start: {pathSource ? (pathSource.name || pathSource.title || pathSource.game_id) : '...'}</p>
              <p>🎯 Cel: {pathTarget ? (pathTarget.name || pathTarget.title || pathTarget.game_id) : '...'}</p>
            </div>
            <button onClick={handleFindPath} disabled={!pathSource || !pathTarget} className="action-button expand-btn" style={{width: '100%', marginBottom: '5px'}}>Szukaj Ścieżki</button>
            <button onClick={clearPath} className="action-button close-btn" style={{width: '100%'}}>Wyczyść</button>
          </div>
        )}
        <div className="graph-wrapper">
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeLabel={(node: any) => `${node.label}: ${node.name || node.title || node.game_id}`}
            nodeColor={(node: any) => getNodeColor(node)}
            nodeRelSize={7}
            linkColor={(link: any) => {
              const sid = typeof link.source === 'object' ? link.source.id : link.source;
              const tid = typeof link.target === 'object' ? link.target.id : link.target;
              return pathLinks.has(`${sid}-${link.type}-${tid}`) ? '#FFD700' : '#444';
            }}
            linkWidth={(link: any) => {
              const sid = typeof link.source === 'object' ? link.source.id : link.source;
              const tid = typeof link.target === 'object' ? link.target.id : link.target;
              return pathLinks.has(`${sid}-${link.type}-${tid}`) ? 3 : 1;
            }}
            linkDirectionalArrowLength={5}
            linkDirectionalArrowRelPos={1}
            linkLabel={(link: any) => link.type}
            onNodeClick={handleNodeClick}
            // Zaznaczanie klikniętego węzła
            nodeCanvasObjectMode={node => (node.id === selectedNode?.id || pathNodes.has(node.id as string)) ? 'before' : undefined}
            nodeCanvasObject={(node, ctx) => {
              if (node.x && node.y) {
                if (node.id === selectedNode?.id) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI, false);
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                  ctx.fill();
                }
                if (pathNodes.has(node.id as string)) {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
                  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                  ctx.fill();
                }
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
              
              <div className="pathfinder-actions">
                <h4 style={{margin: '0 0 5px 0', color: '#8b949e'}}>Narzędzie Ścieżki</h4>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button className="action-button path-btn" onClick={() => setPathSource(selectedNode)} style={{flex: 1}}>
                    📍 Ustaw Start
                  </button>
                  <button className="action-button path-btn" onClick={() => setPathTarget(selectedNode)} style={{flex: 1}}>
                    🎯 Ustaw Cel
                  </button>
                </div>
              </div>
              
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
