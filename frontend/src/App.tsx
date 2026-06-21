import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

// Types and APIs
import type { Node, GraphData } from './types';
import { api } from './services/api';

// Utils
import { translateLabel, translateRelation, translateDetailKey, getNodeColor } from './utils/graphUtils';

// Components
import { IconRefresh, IconTools, IconStart, IconTarget, IconSearch, IconSwords, IconShield } from './components/icons';
import { SearchBar } from './components/SearchBar';
import { GraphViewer, getSvgStrings } from './components/GraphViewer';
import { Sidebar } from './components/Sidebar/Sidebar';
import { NodeDetails } from './components/Sidebar/NodeDetails';
import { Pathfinder } from './components/Sidebar/Pathfinder';
import { GMEditor } from './components/Sidebar/GMEditor';

function App() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  
  // Pathfinder state
  const [pathSource, setPathSource] = useState<Node | null>(null);
  const [pathTarget, setPathTarget] = useState<Node | null>(null);
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set());
  const [pathLinks, setPathLinks] = useState<Set<string>>(new Set());
  
  // Detail Panels
  const [recommendedEquipment, setRecommendedEquipment] = useState<Node[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<any[] | null>(null);
  const [recipeItemName, setRecipeItemName] = useState<string>('');
  const [activeObtainInfo, setActiveObtainInfo] = useState<any[] | null>(null);
  const [obtainSkillName, setObtainSkillName] = useState<string>('');
  const [materialUsages, setMaterialUsages] = useState<any[] | null>(null);
  
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  // GM Mode State
  const [isGMMode, setIsGMMode] = useState<boolean>(false);
  const [linkingState, setLinkingState] = useState<{ active: boolean, targetNode: Node | null, targetLabel: string }>({ active: false, targetNode: null, targetLabel: "" });

  const handleConfirmLink = async () => {
    if (isGMMode && linkingState.active && selectedNode && linkingState.targetNode) {
      try {
        const typeStr = linkingState.targetLabel || 'NEW_LINK';
        await api.createLink(selectedNode.id as string, linkingState.targetNode.id as string, typeStr, {});
        setData(prev => ({
          ...prev,
          links: [...prev.links, { source: selectedNode.id, target: linkingState.targetNode?.id, type: typeStr }]
        }));
        setLinkingState({ active: false, targetNode: null, targetLabel: "" });
      } catch (e) {
        console.error(e);
        alert("Failed to create link.");
      }
    }
  };
  const [nodeFormData, setNodeFormData] = useState<any>({});
  const [newNodeLabel, setNewNodeLabel] = useState<string>("Monster");
  
  useEffect(() => {
    if (selectedNode) {
      const data = { ...selectedNode };
      delete data.x; delete data.y; delete data.vx; delete data.vy; delete data.index; delete data.color;
      setNodeFormData(data);
    } else {
      setNodeFormData({});
    }
  }, [selectedNode]);
  
  // References
  const fgRef = useRef<any>();
  const clickTimeout = useRef<any>(null);
  const lastClickedNode = useRef<string | null>(null);
  const highlightsRef = useRef<{id: string, timestamp: number}[]>([]);

  // Load Graph
  useEffect(() => {
    api.getGraph()
      .then(graphData => {
        setData(graphData);
        setLoading(false);
      })
      .catch(error => {
        console.error("API Error:", error);
        setLoading(false);
      });
  }, []);

  // --- Handlers ---
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const nodes = await api.searchNodes(query);
      setSearchResults(nodes);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectSearchResult = (nodeId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    const targetNode = data.nodes.find(n => n.id === nodeId);
    if (targetNode) {
      setSelectedNode(targetNode);
      if (targetNode.x !== undefined && targetNode.y !== undefined && fgRef.current) {
        fgRef.current.centerAt(targetNode.x, targetNode.y, 1000);
        fgRef.current.zoom(2, 1000);
      }
    }
  };

  const handleExpandNode = async () => {
    if (!selectedNode) return;
    try {
      const { nodes: newNodes, links: newLinks } = await api.expandNode(selectedNode.id as string);
      setData({ nodes: newNodes, links: newLinks });
      setTimeout(() => { if (fgRef.current) fgRef.current.zoomToFit(1000, 50); }, 300);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDoubleClickExpand = async (node: Node) => {
    try {
      const { nodes: newNodes, links: newLinks } = await api.expandNode(node.id as string);
      const newAddedIds = new Set<string>();
      const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
      const combinedNodes = [...data.nodes];
      
      newNodes.forEach((n: Node) => {
        if (!nodeMap.has(n.id)) {
          n.x = node.x !== undefined ? node.x + (Math.random() * 10 - 5) : 0;
          n.y = node.y !== undefined ? node.y + (Math.random() * 10 - 5) : 0;
          n.vx = 0; n.vy = 0;
          nodeMap.set(n.id, n);
          newAddedIds.add(n.id as string);
          combinedNodes.push(n);
        }
      });
      
      const linkMap = new Set(data.links.map(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return `${s}-${l.type}-${t}`;
      }));
      const combinedLinks = [...data.links];
      
      newLinks.forEach((l: any) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (!linkMap.has(`${s}-${l.type}-${t}`)) {
          combinedLinks.push(l);
        }
      });
      
      highlightsRef.current = highlightsRef.current.filter(h => Date.now() - h.timestamp < 2500);
      newAddedIds.forEach(id => {
        highlightsRef.current.push({ id, timestamp: Date.now() });
      });

      setData({ nodes: combinedNodes, links: combinedLinks });
    } catch (error) {
      console.error("Double click expand error", error);
    }
  };

  const handleNodeClick = useCallback(async (node: Node) => {
    if (isGMMode && linkingState.active && selectedNode) {
      if (!linkingState.targetNode) {
        setLinkingState(prev => ({ ...prev, targetNode: node, targetLabel: "NEW_LINK" }));
      }
      return;
    }

    if (lastClickedNode.current === node.id) {
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
      lastClickedNode.current = null;
      handleDoubleClickExpand(node);
      return;
    }
    
    lastClickedNode.current = node.id as string;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      lastClickedNode.current = null;
      setSelectedNode(node);
      if (node.x !== undefined && node.y !== undefined && fgRef.current && !isGMMode) {
        fgRef.current.centerAt(node.x, node.y, 800);
      }
    }, 250);
  }, [data, isGMMode, linkingState, selectedNode]);

  const handleNodeClickRef = useRef(handleNodeClick);
  useEffect(() => {
    handleNodeClickRef.current = handleNodeClick;
  }, [handleNodeClick]);

  const stableOnNodeClick = useCallback((node: Node) => {
    handleNodeClickRef.current(node);
  }, []);

  const handleFindPath = async () => {
    if (!pathSource || !pathTarget) return;
    try {
      const graph = await api.findPath(pathSource.id as string, pathTarget.id as string);
      if (graph.nodes.length === 0) {
        alert("No path found between these nodes.");
        return;
      }
      
      const newPathNodes = new Set<string>();
      graph.nodes.forEach(n => newPathNodes.add(n.id as string));
      setPathNodes(newPathNodes);
      
      const newPathLinks = new Set<string>();
      graph.links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        newPathLinks.add(`${s}-${l.type}-${t}`);
      });
      setPathLinks(newPathLinks);
      
      const combinedNodes = [...data.nodes];
      const nodeMap = new Map(combinedNodes.map(n => [n.id, n]));
      graph.nodes.forEach(n => { if (!nodeMap.has(n.id)) combinedNodes.push(n); });
      
      const combinedLinks = [...data.links];
      const linkMap = new Set(combinedLinks.map(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return `${s}-${l.type}-${t}`;
      }));
      graph.links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        if (!linkMap.has(`${s}-${l.type}-${t}`)) combinedLinks.push(l);
      });
      
      setData({ nodes: combinedNodes, links: combinedLinks });
      if (fgRef.current) fgRef.current.zoomToFit(1000, 50);
      
    } catch (error) {
      console.error(error);
      alert("Error finding path.");
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
      const recs = await api.getRecommendations(selectedNode.id as string);
      if (recs.length === 0) {
        alert("No specific equipment recommendations found for this monster.");
        return;
      }
      setRecommendedEquipment(recs);
      if (selectedNode.x !== undefined && selectedNode.y !== undefined && fgRef.current) {
        fgRef.current.centerAt(selectedNode.x, selectedNode.y, 1000);
        fgRef.current.zoom(3.5, 1000);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while fetching recommendations.");
    }
  };

  const handleShowRecipe = async (item: Node) => {
    try {
      const recipe = await api.getCraftingRecipe(item.id as string);
      setActiveRecipe(recipe || []);
      setRecipeItemName((item.name || item.title || 'Item') as string);
      setActiveObtainInfo(null);
      setMaterialUsages(null);
    } catch (e) {
      console.error(e);
      alert("Error fetching recipe from database.");
    }
  };

  const handleShowObtain = async (skill: Node) => {
    try {
      const sources = await api.getObtainInfo(skill.id as string);
      if (sources && sources.length > 0) {
        setActiveObtainInfo(sources);
        setObtainSkillName((skill.name || skill.title || 'Skill') as string);
        setActiveRecipe(null);
        setMaterialUsages(null);
      } else {
        alert("No information on how to obtain this skill.");
      }
    } catch (e) {
      console.error(e);
      alert("Error fetching source information.");
    }
  };

  const handleShowUsages = async (material: Node) => {
    try {
      const usages = await api.getMaterialUsages(material.id as string);
      const items = usages.filter((n: any) => n.label === 'Item');
      if (items.length > 0) {
        setMaterialUsages(items);
        setActiveRecipe(null);
        setActiveObtainInfo(null);
      } else {
        alert("No items found that can be crafted from this material.");
      }
    } catch (e) {
      console.error(e);
      alert("Error fetching material usage information.");
    }
  };

  // --- GM Handlers ---
  const handleCreateNode = async () => {
    try {
      const newNode = await api.createNode(newNodeLabel, {
        name: nodeFormData.name || "New Node", 
        details: nodeFormData.details || ""
      });
      setData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
      alert("Node created successfully!");
    } catch (e) {
      console.error(e);
      alert("Error creating node.");
    }
  };

  const handleUpdateNode = async () => {
    if (!selectedNode) return;
    try {
      const props = { ...nodeFormData };
      delete props.id; delete props.label; delete props.game_id; delete props.weaknesses; delete props.resistances;
      const updatedNode = await api.updateNode(selectedNode.id as string, props);
      
      setData(prev => {
        const newNodes = [...prev.nodes];
        const nodeIndex = newNodes.findIndex(n => n.id === updatedNode.id);
        if (nodeIndex !== -1) {
          Object.assign(newNodes[nodeIndex], updatedNode);
        }
        return { ...prev, nodes: newNodes };
      });
      
      setSelectedNode(prev => prev ? { ...prev, ...updatedNode } : null);
      alert("Node updated successfully!");
    } catch (e) {
      console.error(e);
      alert("Error updating node.");
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    if (window.confirm(`Are you sure you want to delete ${selectedNode.name || selectedNode.title}?`)) {
      try {
        await api.deleteNode(selectedNode.id as string);
        setData(prev => ({
          nodes: prev.nodes.filter(n => n.id !== selectedNode.id),
          links: prev.links.filter(l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return sid !== selectedNode.id && tid !== selectedNode.id;
          })
        }));
        setSelectedNode(null);
        alert("Node deleted!");
      } catch (e) {
        console.error(e);
        alert("Error deleting node.");
      }
    }
  };

  if (loading) return <div className="loading">Loading Graph Universe...</div>;

  const svgStrings = getSvgStrings();

  return (
    <div className="app-container">
      {showWelcome && (
        <div className="welcome-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 17, 13, 0.95)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="welcome-modal" style={{ backgroundColor: 'rgba(22, 36, 27, 0.9)', border: '1px solid #d4af37', borderRadius: '12px', padding: '40px', maxWidth: '600px', textAlign: 'left', color: '#e8e4c9', boxShadow: '0 0 50px rgba(212, 175, 55, 0.15)' }}>
            <h1 style={{ color: '#d4af37', fontFamily: 'Cinzel Decorative', textAlign: 'center', fontSize: '2.5rem', marginTop: 0 }}>Welcome to RPG Graph</h1>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>Navigate a vast universe of interconnected game lore, items, monsters, and characters. Uncover hidden relations and craft the ultimate build.</p>
            
            <ul style={{ paddingLeft: '0', margin: '25px 0', lineHeight: 1.8, listStyleType: 'none' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ color: '#d4af37', marginRight: '10px', marginTop: '4px' }}><IconRefresh size={18} /></span>
                <div><span style={{ color: '#d4af37', fontWeight: 'bold' }}>Double-click</span> any node to fetch its direct connections from the database.</div>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ color: '#d4af37', marginRight: '10px', marginTop: '4px' }}><IconSearch size={18} /></span>
                <div>Use the <span style={{ color: '#d4af37', fontWeight: 'bold' }}>Search Bar</span> to quickly locate specific elements.</div>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ color: '#d4af37', marginRight: '10px', marginTop: '4px' }}><IconTarget size={18} /></span>
                <div>Access the <span style={{ color: '#d4af37', fontWeight: 'bold' }}>Pathfinder</span> to discover the shortest route between two distant nodes (e.g., from a Material to the Monster that drops it).</div>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ color: '#d4af37', marginRight: '10px', marginTop: '4px' }}><IconShield size={18} /></span>
                <div>Click on nodes to view their <span style={{ color: '#d4af37', fontWeight: 'bold' }}>Detailed Stats</span> and unique interactions.</div>
              </li>
            </ul>
            
            <div style={{ textAlign: 'center' }}>
              <button 
                className="action-button"
                style={{ backgroundColor: '#3a2800', border: '1px solid #d4af37', color: '#d4af37', padding: '12px 24px', fontSize: '1.1rem', fontFamily: 'Cinzel Decorative', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setShowWelcome(false)}
              >
                Begin Exploration
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="brand">RPG Graph</div>
        <div className="legend">
          {Object.entries(svgStrings).map(([label, svg]) => (
            <span key={label} style={{ color: getNodeColor({ label } as Node), display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px', height: '24px', backgroundColor: getNodeColor({ label } as Node),
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 5px rgba(0,0,0,0.5)'
              }}>
                <span className="rpg-icon" style={{ width: '16px', height: '16px', display: 'block', color: 'white' }} dangerouslySetInnerHTML={{ __html: svg }} />
              </span>
              {translateLabel(label)}
            </span>
          ))}
        </div>
      </header>
      
      <div className="main-content">
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearch={handleSearch}
          onSelectResult={handleSelectSearchResult}
        />
        
        {/* GM Mode Toggle */}
        <div className="gm-toggle-container">
          <label className="gm-switch">
            <input type="checkbox" checked={isGMMode} onChange={(e) => setIsGMMode(e.target.checked)} />
            <span className="gm-slider"></span>
          </label>
          <span>Game Master Mode</span>
        </div>
        
        {/* Reset Graph Button Overlay */}
        <div style={{ position: 'absolute', bottom: '25px', right: '25px', zIndex: 100 }}>
          <button 
            className="action-button close-btn" 
            style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
            onClick={() => {
              api.getGraph().then(data => {
                setData(data);
                setSelectedNode(null);
                clearPath();
                setRecommendedEquipment([]);
                setActiveRecipe(null);
                setActiveObtainInfo(null);
                setMaterialUsages(null);
                setSearchQuery('');
                setSearchResults([]);
                setTimeout(() => { if (fgRef.current) fgRef.current.zoomToFit(800, 50); }, 300);
              });
            }}
          >
            <IconRefresh /> Reset Graph
          </button>
        </div>

        <GraphViewer 
          ref={fgRef}
          data={data}
          pathLinks={pathLinks}
          pathNodes={pathNodes}
          selectedNode={selectedNode}
          recommendedEquipment={recommendedEquipment}
          highlightsRef={highlightsRef}
          onNodeClick={stableOnNodeClick}
          getNodeColor={getNodeColor}
          translateLabel={translateLabel}
          translateRelation={translateRelation}
        />
        
        <Sidebar 
          isOpen={!!(selectedNode || pathSource || pathTarget || isGMMode)} 
          isGMMode={isGMMode}
          onClose={() => { setSelectedNode(null); clearPath(); setRecommendedEquipment([]); setActiveRecipe(null); }}
        >
          {isGMMode ? (
            <GMEditor 
              selectedNode={selectedNode}
              nodeFormData={nodeFormData}
              setNodeFormData={setNodeFormData}
              newNodeLabel={newNodeLabel}
              setNewNodeLabel={setNewNodeLabel}
              linkingState={linkingState}
              setLinkingState={setLinkingState}
              onConfirmLink={handleConfirmLink}
              onCreateNode={handleCreateNode}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
            />
          ) : selectedNode ? (
            <NodeDetails 
              selectedNode={selectedNode}
              recommendedEquipment={recommendedEquipment}
              activeRecipe={activeRecipe}
              recipeItemName={recipeItemName}
              activeObtainInfo={activeObtainInfo}
              obtainSkillName={obtainSkillName}
              materialUsages={materialUsages}
              onExpandNode={handleExpandNode}
              onDoubleClickExpand={() => handleDoubleClickExpand(selectedNode)}
              onRecommend={handleRecommend}
              onShowRecipe={handleShowRecipe}
              onShowObtain={handleShowObtain}
              onShowUsages={handleShowUsages}
              onClearRecipe={() => setActiveRecipe(null)}
              onClearObtain={() => setActiveObtainInfo(null)}
              onClearUsages={() => setMaterialUsages(null)}
              getNodeColor={getNodeColor}
              translateLabel={translateLabel}
              translateRelation={translateRelation}
              translateDetailKey={translateDetailKey}
            />
          ) : (
            <div style={{ color: '#8b949e', fontStyle: 'italic', marginBottom: '20px' }}>
              Select a node to view its details.
            </div>
          )}
          
          {!isGMMode && (
            <Pathfinder 
              selectedNode={selectedNode}
              pathSource={pathSource}
              pathTarget={pathTarget}
              pathNodes={pathNodes}
              setPathSource={setPathSource}
              setPathTarget={setPathTarget}
              onFindPath={handleFindPath}
              onClearPath={clearPath}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
}

export default App;
