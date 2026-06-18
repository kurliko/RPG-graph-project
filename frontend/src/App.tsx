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

import itemNodeRaw from './assets/icons/item-node.svg?raw';
import materialNodeRaw from './assets/icons/material-node.svg?raw';
import monsterNodeRaw from './assets/icons/monster-node.svg?raw';
import npcNodeRaw from './assets/icons/npc-node.svg?raw';
import zoneNodeRaw from './assets/icons/zone-node.svg?raw';
import questNodeRaw from './assets/icons/quest-node.svg?raw';
import skillNodeRaw from './assets/icons/skill-node.svg?raw';
import elementNodeRaw from './assets/icons/element-node.svg?raw';

const ICONS: Record<string, HTMLImageElement> = {};

const svgStrings: Record<string, string> = {
  Item: itemNodeRaw,
  Material: materialNodeRaw,
  Monster: monsterNodeRaw,
  NPC: npcNodeRaw,
  Zone: zoneNodeRaw,
  Quest: questNodeRaw,
  Skill: skillNodeRaw,
  Element: elementNodeRaw
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

import iconSearchRaw from './assets/icons/archive-research.svg?raw';
import iconShieldRaw from './assets/icons/viking-shield.svg?raw';
import iconSwordsRaw from './assets/icons/crossed-swords.svg?raw';
import iconToolsRaw from './assets/icons/sword-smithing.svg?raw';
import iconStartRaw from './assets/icons/compass.svg?raw';
import iconTargetRaw from './assets/icons/bullseye.svg?raw';
import iconRefreshRaw from './assets/icons/cycle.svg?raw';

const IconBase = ({ raw, size = 16, style = {}, color = 'currentColor' }: any) => (
  <span
    className="rpg-icon"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      color: color,
      verticalAlign: 'middle',
      marginTop: '-2px',
      marginRight: '6px',
      flexShrink: 0,
      ...style
    }}
    dangerouslySetInnerHTML={{ __html: raw }}
  />
);

const IconSearch = ({ size = 16, style = {} }) => <IconBase raw={iconSearchRaw} size={size} style={style} />;
const IconStart = () => <IconBase raw={iconStartRaw} size={16} />;
const IconTarget = () => <IconBase raw={iconTargetRaw} size={16} />;
const IconShield = ({ size = 24, style = {} }) => <IconBase raw={iconShieldRaw} size={size} style={{marginRight: '5px', ...style}} />;
const IconRefresh = () => <IconBase raw={iconRefreshRaw} size={16} />;
const IconSwords = ({ size = 16, style = {} }) => <IconBase raw={iconSwordsRaw} size={size} style={style} />;
const IconTools = ({ size = 16, style = {} }) => <IconBase raw={iconToolsRaw} size={size} style={style} />;

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
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  
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
      const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
      const combinedNodes = [...data.nodes];
      
      newNodes.forEach((n: Node) => {
        if (!nodeMap.has(n.id)) {
          n.x = node.x !== undefined ? node.x + (Math.random() * 10 - 5) : 0;
          n.y = node.y !== undefined ? node.y + (Math.random() * 10 - 5) : 0;
          n.vx = 0;
          n.vy = 0;
          nodeMap.set(n.id, n);
          newAddedIds.add(n.id as string);
          combinedNodes.push(n);
        }
      });
      
      const linkMap = new Map(data.links.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return [`${sourceId}-${l.type}-${targetId}`, l];
      }));
      
      const combinedLinks = [...data.links];
      newLinks.forEach((l: Link) => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        const key = `${sourceId}-${l.type}-${targetId}`;
        if (!linkMap.has(key)) {
          linkMap.set(key, l);
          combinedLinks.push(l);
        }
      });

      setData({
        nodes: combinedNodes,
        links: combinedLinks
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
        highlightsRef.current = [...highlightsRef.current, { id: node.id as string, timestamp: now }];
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
      const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
      const combinedNodes = [...data.nodes];

      newNodes.forEach((n: Node) => {
        if (!nodeMap.has(n.id)) {
          n.x = selectedNode.x !== undefined ? selectedNode.x + (Math.random() * 10 - 5) : 0;
          n.y = selectedNode.y !== undefined ? selectedNode.y + (Math.random() * 10 - 5) : 0;
          n.vx = 0;
          n.vy = 0;
          nodeMap.set(n.id, n);
          newAddedIds.add(n.id as string);
          combinedNodes.push(n);
        }
      });
      
      const linkMap = new Map(data.links.map(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return [`${sourceId}-${l.type}-${targetId}`, l];
      }));
      
      const combinedLinks = [...data.links];
      newLinks.forEach((l: Link) => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        const key = `${sourceId}-${l.type}-${targetId}`;
        if (!linkMap.has(key)) {
          linkMap.set(key, l);
          combinedLinks.push(l);
        }
      });

      setData({
        nodes: combinedNodes,
        links: combinedLinks
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
        highlightsRef.current = [...highlightsRef.current, { id: selectedNode.id as string, timestamp: now }];
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
      {/* Ekran powitalny */}
      {showWelcome && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1005', border: '2px solid #d4af37', borderRadius: '8px',
            padding: '40px', maxWidth: '600px', color: '#e8e4c9',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(0,0,0,0.8)'
          }}>
            <h1 style={{ fontFamily: 'Cinzel Decorative', color: '#d4af37', textAlign: 'center', marginTop: 0, marginBottom: '10px' }}>
              Witaj w RPG Graph
            </h1>
            <h3 style={{ textAlign: 'center', color: '#a3c9a8', marginTop: 0, marginBottom: '30px', fontWeight: 'normal' }}>
              Interaktywnym Asystencie Nordyckich Wypraw
            </h3>
            
            <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>
              Ta aplikacja to wizualny silnik bazy danych grafowych (Neo4j), który pozwala na analizę zależności w świecie gry RPG. Użyj grafu, aby zdobyć przewagę w walce i planować swoje rzemiosło.
            </p>
            
            <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '30px' }}>
              <li style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '28px' }}><IconSearch size={22} style={{ color: '#a3c9a8' }} /></div>
                <div><strong>Eksploracja i Wyszukiwanie:</strong> Poruszaj się po interaktywnym grafie i korzystaj z paska wyszukiwania, by szybko namierzyć interesujące Cię potwory, postacie czy przedmioty.</div>
              </li>
              <li style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '28px' }}><IconShield size={22} style={{ color: '#a3c9a8' }} /></div>
                <div><strong>Analiza Walki:</strong> Kliknij potwora, aby odkryć jego ukryte słabości i odporności na różne żywioły.</div>
              </li>
              <li style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '28px' }}><IconSwords size={22} style={{ color: '#a3c9a8' }} /></div>
                <div><strong>Rekomendacje Wyposażenia:</strong> Użyj silnika rekomendacji, który przeszuka graf, by zasugerować najlepszą dostępną broń i magię na wybranego wroga.</div>
              </li>
              <li style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '28px' }}><IconTools size={22} style={{ color: '#a3c9a8' }} /></div>
                <div><strong>Kalkulator Craftingu:</strong> Znalazłeś potężną broń? Zobacz jej "Przepis", a silnik rekurencyjnie wskaże Ci, u jakich potworów szukać materiałów do jej wytworzenia.</div>
              </li>
            </ul>
            
            <div style={{ textAlign: 'center' }}>
              <button 
                className="action-button"
                style={{ backgroundColor: '#3a2800', border: '1px solid #d4af37', color: '#d4af37', padding: '12px 24px', fontSize: '1.1rem', fontFamily: 'Cinzel Decorative', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setShowWelcome(false)}
              >
                Rozpocznij Eksplorację
              </button>
            </div>
          </div>
        </div>
      )}

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
                className="rpg-icon"
                style={{ width: '16px', height: '16px', display: 'inline-block', color: getNodeColor({ label } as Node) }} 
                dangerouslySetInnerHTML={{ __html: svg }} 
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
                  <IconSearch /> Pobierz powiązania (Rozwiń)
                </button>
                {selectedNode.label === 'Monster' && (
                  <button className="action-button" style={{backgroundColor: '#4a1515', color: '#ffb3b3', marginTop: '10px'}} onClick={handleRecommend}>
                    <IconSwords /> Znajdź wyposażenie na potwora
                  </button>
                )}
                {selectedNode.label === 'Item' && (
                  <button className="action-button expand-btn" style={{backgroundColor: '#3a2800', color: '#d4af37', marginTop: '10px', border: '1px solid #d4af37'}} onClick={() => handleShowRecipe(selectedNode)}>
                    <IconTools /> Pokaż jak stworzyć (Przepis)
                  </button>
                )}
                
                {recommendedEquipment.length > 0 && (
                  <div style={{ marginTop: '15px', border: '1px solid #d4af37', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <h4 style={{ color: '#d4af37', margin: '0 0 12px 0', fontFamily: 'Cinzel Decorative', letterSpacing: '1px' }}>Zalecany Ekwipunek:</h4>
                    {recommendedEquipment.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dotted rgba(212, 175, 55, 0.3)' }}>
                        <span style={{ marginRight: '8px', display: 'flex', color: '#d4af37' }}><IconSwords size={18} style={{margin: 0}} /></span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#e8e4c9', fontWeight: 600, fontSize: '0.95rem' }}>{item.name || item.title}</span>
                          <span style={{ color: '#a3c9a8', fontSize: '0.75rem', textTransform: 'uppercase' }}>{translateLabel(item.label as string)}</span>
                        </div>
                        {item.label === 'Item' && (
                          <button 
                            className="recipe-btn"
                            style={{ marginLeft: 'auto', backgroundColor: '#3a2800', border: '1px solid #d4af37', color: '#d4af37', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Cinzel Decorative', display: 'flex', alignItems: 'center' }}
                            onClick={(e) => { e.stopPropagation(); handleShowRecipe(item); }}
                          >
                            <IconTools size={12} /> Przepis
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {activeRecipe && (
                  <div style={{ marginTop: '15px', border: '1px solid #7cb342', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(124, 179, 66, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ color: '#aed581', margin: 0, fontFamily: 'Cinzel Decorative', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}><IconTools size={16} /> Składniki: {recipeItemName}</h4>
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
