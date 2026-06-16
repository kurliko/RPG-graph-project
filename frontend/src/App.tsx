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

const ICONS: Record<string, HTMLImageElement> = {};

// Przygotowanie ikon SVG (kodowane do Base64 dla elementu Image w Canvas)
const svgStrings: Record<string, string> = {
  Item: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"/></svg>',
  Material: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M6 2L2 8L12 22L22 8L18 2H6ZM6.83 4H17.17L19.5 7.5H4.5L6.83 4ZM12 19L5.45 9.5H18.55L12 19Z"/></svg>',
  Monster: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.69 2 6 4.69 6 8V22L8.5 19.5L11 22L13.5 19.5L16 22L18.5 19.5L21 22V8C21 4.69 18.31 2 15 2H12ZM10 10C8.9 10 8 9.1 8 8C8 6.9 8.9 6 10 6C11.1 6 12 6.9 12 8C12 9.1 11.1 10 10 10ZM16 10C14.9 10 14 9.1 14 8C14 6.9 14.9 6 16 6C17.1 6 18 6.9 18 8C18 9.1 17.1 10 16 10Z"/></svg>',
  NPC: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/></svg>',
  Zone: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M14 6L10 4V16L14 18M14 6V18M14 6L21 4V16L14 18M10 4L3 6V18L10 16M10 4V16"/></svg>',
  Quest: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M11 15H13V17H11V15ZM11 7H13V13H11V7ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"/></svg>',
  Skill: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M7 2V13H10V22L17 10H13L17 2H7Z"/></svg>',
  Element: '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>'
};

Object.entries(svgStrings).forEach(([key, svg]) => {
  const img = new Image();
  img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  ICONS[key] = img;
});

// Słowniki tłumaczeń dla interfejsu użytkownika
const translateLabel = (label: string): string => {
  const dict: Record<string, string> = {
    'Item': 'Przedmiot',
    'Material': 'Materiał',
    'Monster': 'Potwór',
    'NPC': 'Postać (NPC)',
    'Zone': 'Lokalizacja',
    'Quest': 'Zadanie',
    'Skill': 'Umiejętność',
    'Element': 'Żywioł'
  };
  return dict[label] || label;
};

const translateRelation = (type: string): string => {
  const dict: Record<string, string> = {
    'RESIDES_IN': 'Zamieszkuje',
    'SPAWNS_IN': 'Pojawia się w',
    'GIVES': 'Zleca',
    'TAKES_PLACE_IN': 'Odbywa się w',
    'PRE_REQUISITE': 'Wymaga',
    'REQUIRES': 'Potrzebuje',
    'DROPS': 'Upuszcza',
    'UNLOCKS': 'Odblokowuje',
    'TEACHES': 'Uczy',
    'GRANTS_SKILL': 'Daje umiejętność',
    'USES_SKILL': 'Używa',
    'WEAK_AGAINST': 'Wrażliwy na',
    'RESISTANT_TO': 'Odporny na',
    'IMBUED_WITH': 'Nasycony',
    'USES_ELEMENT': 'Wykorzystuje'
  };
  return dict[type] || type;
};

const translateDetailKey = (key: string): string => {
  const dict: Record<string, string> = {
    'details': 'Opis',
    'min_level': 'Min. poziom',
    'level': 'Poziom',
    'faction': 'Frakcja',
    'category': 'Kategoria',
    'rarity': 'Rzadkość',
    'exp_reward': 'Nagroda EXP',
    'weaknesses': 'Wrażliwość',
    'resistances': 'Odporność',
    'cooldown': 'Czas Odnowienia'
  };
  return dict[key] || key;
};

const IconSearch = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px'}}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconStart = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const IconTarget = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px'}}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const IconShield = () => <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '5px'}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const IconRefresh = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px', verticalAlign: 'middle', marginTop: '-2px'}}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

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
  const [recommendedEquipment, setRecommendedEquipment] = useState<Node[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<any[] | null>(null);
  const [recipeItemName, setRecipeItemName] = useState<string>('');
  
  // Referencje do śledzenia podwójnego kliknięcia i efektów poświaty
  const fgRef = useRef<any>();
  const clickTimeout = useRef<any>(null);
  const lastClickedNode = useRef<string | null>(null);
  const highlightsRef = useRef<{id: string, timestamp: number}[]>([]);

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
      
      setData({
        nodes: newNodes,
        links: newLinks
      });
      
      // Możemy też wycentrować graf ponownie, żeby się ładnie ułożył
      setTimeout(() => {
        fgRef.current.zoomToFit(1000, 50);
      }, 300);
      
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
      case 'Skill': return '#FF1493';
      case 'Element': return node.color || '#00FFFF';
      default: return '#A9A9A9';
    }
  };

  const handleDoubleClickExpand = async (node: Node) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/nodes/${encodeURIComponent(node.id)}/expand`);
      const { nodes: newNodes, links: newLinks } = res.data;
      
      const newAddedIds = new Set<string>();

      setData((prevData) => {
        const nodeMap = new Map(prevData.nodes.map(n => [n.id, n]));
        newNodes.forEach((n: Node) => {
          if (!nodeMap.has(n.id)) {
            nodeMap.set(n.id, n);
            newAddedIds.add(n.id);
          }
        });
        
        const linkMap = new Map(prevData.links.map(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return [`${sourceId}-${l.type}-${targetId}`, l];
        }));
        
        newLinks.forEach((l: Link) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const key = `${sourceId}-${l.type}-${targetId}`;
          if (!linkMap.has(key)) {
            linkMap.set(key, l);
          }
        });

        return {
          nodes: Array.from(nodeMap.values()),
          links: Array.from(linkMap.values())
        };
      });

      if (newAddedIds.size > 0) {
        const now = Date.now();
        const newHighlights = Array.from(newAddedIds).map(id => ({ id, timestamp: now }));
        highlightsRef.current = [...highlightsRef.current, ...newHighlights];
        
        setTimeout(() => {
           highlightsRef.current = highlightsRef.current.filter(h => Date.now() - h.timestamp < 3000);
        }, 3000);
      } else {
        // Dajmy feedback nawet jeśli nie pobrano nowych węzłów (podświetl sam węzeł główny)
        const now = Date.now();
        highlightsRef.current = [...highlightsRef.current, { id: node.id, timestamp: now }];
        setTimeout(() => {
           highlightsRef.current = highlightsRef.current.filter(h => Date.now() - h.timestamp < 3000);
        }, 3000);
      }
      
      // Wymuś podgrzanie symulacji, by klatki animacji poświaty nie zamarzały
      if (fgRef.current) {
        fgRef.current.d3ReheatSimulation();
      }
      
    } catch (error) {
      console.error("Błąd podczas rozszerzania węzła:", error);
    }
  };

  const handleNodeClick = useCallback((node: Node) => {
    if (lastClickedNode.current === node.id && clickTimeout.current) {
      // Wykryto podwójne kliknięcie
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      lastClickedNode.current = null;
      handleDoubleClickExpand(node);
    } else {
      // Pojedyncze kliknięcie
      lastClickedNode.current = node.id as string;
      clickTimeout.current = setTimeout(async () => {
        if (selectedNode?.id !== node.id) {
          setRecommendedEquipment([]); // Wyczyść rekomendacje przy zmianie węzła
          setActiveRecipe(null); // Wyczyść przepis
        }
        
        let nodeData = { ...node };
        
        // Jeśli kliknięto potwora, dynamicznie dociągamy jego słabości i odporności
        if (node.label === 'Monster') {
          try {
            const res = await axios.get(`http://localhost:8000/api/nodes/${encodeURIComponent(node.id as string)}/details`);
            if (res.data.weaknesses) nodeData.weaknesses = res.data.weaknesses;
            if (res.data.resistances) nodeData.resistances = res.data.resistances;
          } catch(e) {
            console.error("Błąd podczas pobierania detali węzła", e);
          }
        }
        
        setSelectedNode(nodeData);
        fgRef.current.centerAt(nodeData.x, nodeData.y, 1000);
        fgRef.current.zoom(3, 2000);
        clickTimeout.current = null;
        lastClickedNode.current = null;
      }, 400); // 400ms okienko na łatwiejsze wykonanie podwójnego kliknięcia
    }
  }, [selectedNode]);

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
        res.data.nodes.forEach((n: Node) => {
          if (!nodeMap.has(n.id)) {
            nodeMap.set(n.id, n);
          }
        });
        
        const linkMap = new Map(prevData.links.map(l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return [`${s}-${l.type}-${t}`, l];
        }));
        
        res.data.links.forEach((l: Link) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          const key = `${s}-${l.type}-${t}`;
          if (!linkMap.has(key)) {
            linkMap.set(key, l);
          }
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

  const handleRecommend = async () => {
    if (!selectedNode || selectedNode.label !== 'Monster') return;
    
    try {
      const res = await axios.get(`http://localhost:8000/api/recommend/${encodeURIComponent(selectedNode.id)}`);
      const { nodes: newNodes, links: newLinks } = res.data;
      
      if (newNodes.length === 0) {
        alert("Brak danych o słabościach i rekomendacjach dla tego potwora.");
        return;
      }
      
      const itemsAndSkills = newNodes.filter((n: any) => n.label === 'Item' || n.label === 'Skill');
      setRecommendedEquipment(itemsAndSkills);
      
      const newAddedIds = new Set<string>();

      setData((prevData) => {
        const nodeMap = new Map(prevData.nodes.map(n => [n.id, n]));
        newNodes.forEach((n: Node) => {
          if (!nodeMap.has(n.id)) {
            nodeMap.set(n.id, n);
            newAddedIds.add(n.id);
          }
        });
        
        const linkMap = new Map(prevData.links.map(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return [`${sourceId}-${l.type}-${targetId}`, l];
        }));
        
        newLinks.forEach((l: Link) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const key = `${sourceId}-${l.type}-${targetId}`;
          if (!linkMap.has(key)) {
            linkMap.set(key, l);
          }
        });

        return {
          nodes: Array.from(nodeMap.values()),
          links: Array.from(linkMap.values())
        };
      });

      if (newAddedIds.size > 0) {
        const now = Date.now();
        const newHighlights = Array.from(newAddedIds).map(id => ({ id, timestamp: now }));
        highlightsRef.current = [...highlightsRef.current, ...newHighlights];
        
        setTimeout(() => {
           highlightsRef.current = highlightsRef.current.filter(h => Date.now() - h.timestamp < 3000);
        }, 3000);
      } else {
        const now = Date.now();
        highlightsRef.current = [...highlightsRef.current, { id: selectedNode.id, timestamp: now }];
        setTimeout(() => {
           highlightsRef.current = highlightsRef.current.filter(h => Date.now() - h.timestamp < 3000);
        }, 3000);
      }
      
      if (fgRef.current) {
        fgRef.current.d3ReheatSimulation();
        // Zamiast oddalać całą mapę, zróbmy zbliżenie na potwora, by zobaczyć rekomendowany sprzęt obok niego
        if (selectedNode.x !== undefined && selectedNode.y !== undefined) {
          fgRef.current.centerAt(selectedNode.x, selectedNode.y, 1000);
          fgRef.current.zoom(3.5, 1000);
        }
      }
      
    } catch (error) {
      console.error("Błąd rekomendacji:", error);
      alert("Wystąpił błąd podczas szukania rekomendacji.");
    }
  };

  const handleShowRecipe = async (item: Node) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/crafting/${encodeURIComponent(item.id as string)}`);
      if (res.data.recipe && res.data.recipe.length > 0) {
        setActiveRecipe(res.data.recipe);
        setRecipeItemName((item.name || item.title || 'Przedmiot') as string);
      } else {
        alert("Ten przedmiot nie posiada znanego schematu craftingu (może wylecieć jako cały przedmiot).");
      }
    } catch (e) {
      console.error(e);
      alert("Błąd podczas pobierania przepisu z bazy.");
    }
  };

  if (loading) return <div className="loading">Ładowanie grafu...</div>;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          RPG Graph
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
        
        <button 
          className="action-button close-btn" 
          style={{marginLeft: '15px', padding: '5px 15px'}}
          onClick={() => window.location.reload()}
        >
          <IconRefresh /> Resetuj Graf
        </button>

        <div className="legend">
          {Object.entries(svgStrings).map(([label, svg]) => (
            <span key={label} style={{ color: getNodeColor({ label } as Node), display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span 
                style={{ width: '16px', height: '16px', display: 'inline-block' }} 
                dangerouslySetInnerHTML={{ __html: svg.replace('fill="white"', `fill="${getNodeColor({ label } as Node)}"`) }} 
              />
              {translateLabel(label)}
            </span>
          ))}
        </div>
      </header>
      
      <div className="main-content">
        <div className="graph-wrapper">
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            nodeLabel={(node: any) => `${translateLabel(node.label)}: ${node.name || node.title || node.game_id || 'Nieznany'}`}
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
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkLabel={(link: any) => translateRelation(link.type)}
            onNodeClick={handleNodeClick}
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              if (node.x === undefined || node.y === undefined) return;
              
              const isSelected = node.id === selectedNode?.id;
              const isPath = pathNodes.has(node.id as string);
              const isRecommended = recommendedEquipment.some(r => r.id === node.id);
              const highlight = highlightsRef.current.find(h => h.id === node.id);
              const size = 6;
              
              // Animacja poświaty dla nowo dodanych węzłów
              if (highlight) {
                const elapsed = Date.now() - highlight.timestamp;
                const duration = 2500; // Poświata trwa 2.5 sekundy
                if (elapsed < duration) {
                  const progress = elapsed / duration;
                  const alpha = 0.8 * (1 - progress); // Znika płynnie od 0.8 do 0
                  const glowSize = size + 15 * (1 - progress); // Pulsuje z zewnątrz do wewnątrz
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI, false);
                  ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
                  ctx.fill();
                }
              }

              // Podświetlenie dla selekcji lub ścieżki
              if (isSelected || isPath) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
                ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 215, 0, 0.4)';
                ctx.fill();
              }
              
              // Czerwono-Złoty krąg oznaczający rekomendowany sprzęt na potwora
              if (isRecommended) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 8, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#D4AF37'; // Nordyckie złoto
                ctx.lineWidth = 1.5;
                ctx.stroke();
                
                // Poświata
                ctx.shadowColor = '#FF4500'; // Ognista czerwień
                ctx.shadowBlur = 15;
              }

              // Rysowanie kółka węzła
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
              ctx.fillStyle = getNodeColor(node as Node);
              ctx.fill();
              
              // Reset shadowBlur po narysowaniu tła węzła, żeby ikona SVG nie była rozmazana
              ctx.shadowBlur = 0;

              // Rysowanie ikony SVG
              const img = ICONS[(node as Node).label];
              if (img) {
                const imgSize = size * 1.3; // Ikona dopasowana wielkością do kółka
                ctx.drawImage(img, node.x - imgSize/2, node.y - imgSize/2, imgSize, imgSize);
              }
            }}
          />
        </div>
        
        {/* Panel boczny */}
        <div className={`sidebar ${selectedNode || pathSource || pathTarget ? 'open' : ''}`}>
          <div className="sidebar-content" style={{ height: '100%', overflowY: 'auto' }}>
            {selectedNode ? (
              <>
                <h2>{selectedNode.name || selectedNode.title || 'Nieznany Obiekt'}</h2>
                <span className="badge" style={{backgroundColor: getNodeColor(selectedNode)}}>
                  {translateLabel(selectedNode.label as string)}
                </span>
                
                <div className="details-list">
                  {Object.entries(selectedNode)
                    .filter(([key]) => !key.startsWith('_') && !['id', 'x', 'y', 'vx', 'vy', 'fx', 'fy', 'index', 'name', 'title', 'label', 'game_id'].includes(key))
                    .map(([key, value]) => (
                      <div className="detail-item" key={key}>
                        <span className="detail-key">{translateDetailKey(key)}:</span>
                        <span className="detail-value">{String(value)}</span>
                      </div>
                    ))}
                </div>

                <button className="action-button expand-btn" onClick={handleExpandNode}>
                  <IconSearch /> Eksploruj powiązania
                </button>
                <button className="action-button expand-btn" onClick={() => handleDoubleClickExpand(selectedNode)}>
                  <IconSearch /> Wyizoluj sąsiadów
                </button>
                {selectedNode.label === 'Monster' && (
                  <button className="action-button" style={{backgroundColor: '#4a1515', color: '#ffb3b3', marginTop: '10px'}} onClick={handleRecommend}>
                    ⚔️ Znajdź wyposażenie na potwora
                  </button>
                )}
                
                {recommendedEquipment.length > 0 && (
                  <div style={{ marginTop: '15px', border: '1px solid #d4af37', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <h4 style={{ color: '#d4af37', margin: '0 0 12px 0', fontFamily: 'Cinzel Decorative', letterSpacing: '1px' }}>Zalecany Ekwipunek:</h4>
                    {recommendedEquipment.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dotted rgba(212, 175, 55, 0.3)' }}>
                        <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>⚔️</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#e8e4c9', fontWeight: 600, fontSize: '0.95rem' }}>{item.name || item.title}</span>
                          <span style={{ color: '#a3c9a8', fontSize: '0.75rem', textTransform: 'uppercase' }}>{translateLabel(item.label as string)}</span>
                        </div>
                        {item.label === 'Item' && (
                          <button 
                            className="recipe-btn"
                            style={{ marginLeft: 'auto', backgroundColor: '#3a2800', border: '1px solid #d4af37', color: '#d4af37', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Cinzel Decorative' }}
                            onClick={(e) => { e.stopPropagation(); handleShowRecipe(item); }}
                          >
                            🛠️ Przepis
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {activeRecipe && (
                  <div style={{ marginTop: '15px', border: '1px solid #7cb342', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(124, 179, 66, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ color: '#aed581', margin: 0, fontFamily: 'Cinzel Decorative', letterSpacing: '1px' }}>🛠️ Składniki: {recipeItemName}</h4>
                      <button onClick={() => setActiveRecipe(null)} style={{ background: 'none', border: 'none', color: '#aed581', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>✕</button>
                    </div>
                    {activeRecipe.map((ingred, idx) => (
                      <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < activeRecipe.length - 1 ? '1px dotted rgba(124, 179, 66, 0.3)' : 'none' }}>
                        <div style={{ color: '#e8e4c9', fontWeight: 'bold' }}>
                          {ingred.quantity}x {ingred.material}
                        </div>
                        {ingred.sources && ingred.sources.length > 0 ? (
                          <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px' }}>
                            Zdobywane z: <span style={{color: '#ffb3b3'}}>{ingred.sources.join(', ')}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px', fontStyle: 'italic' }}>
                            Nieznane źródło (poszukaj u legendarnych rzemieślników)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#8b949e', fontStyle: 'italic', marginBottom: '20px' }}>
                Wybierz węzeł, aby zobaczyć jego szczegóły.
              </div>
            )}
            
            <hr style={{ borderColor: '#30363d', margin: '20px 0', width: '100%' }} />
            
            {/* Sekcja Pathfindera w panelu bocznym */}
            <div>
              <h3 style={{ color: '#FFD700', margin: '0 0 10px 0' }}>Narzędzie Ścieżki</h3>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <button 
                  className="action-button path-btn" 
                  onClick={() => selectedNode && setPathSource(selectedNode)} 
                  disabled={!selectedNode}
                  style={{flex: 1, opacity: selectedNode ? 1 : 0.5}}
                >
                  <IconStart /> Ustaw Start
                </button>
                <button 
                  className="action-button path-btn" 
                  onClick={() => selectedNode && setPathTarget(selectedNode)} 
                  disabled={!selectedNode}
                  style={{flex: 1, opacity: selectedNode ? 1 : 0.5}}
                >
                  <IconTarget /> Ustaw Cel
                </button>
              </div>

              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}><IconStart /> Start: <strong style={{color: '#fff'}}>{pathSource ? (pathSource.name || pathSource.title || pathSource.game_id) : '---'}</strong></p>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}><IconTarget /> Cel: <strong style={{color: '#fff'}}>{pathTarget ? (pathTarget.name || pathTarget.title || pathTarget.game_id) : '---'}</strong></p>
              
              <button 
                onClick={handleFindPath} 
                disabled={!pathSource || !pathTarget} 
                className="action-button expand-btn" 
                style={{width: '100%', marginTop: '15px'}}
              >
                Szukaj Ścieżki
              </button>
              
              {(pathSource || pathTarget || pathNodes.size > 0) && (
                <button onClick={clearPath} className="action-button close-btn" style={{width: '100%', marginTop: '10px'}}>
                  Wyczyść narzędzie ścieżki
                </button>
              )}
            </div>

            <button 
              className="action-button close-btn" 
              style={{marginTop: 'auto'}} 
              onClick={() => { setSelectedNode(null); clearPath(); setRecommendedEquipment([]); setActiveRecipe(null); }}
            >
              Zamknij cały panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
