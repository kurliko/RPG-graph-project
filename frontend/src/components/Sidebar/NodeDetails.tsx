import React from 'react';
import type { Node } from '../../types';
import { IconSearch, IconTools, IconSwords } from '../icons';

interface NodeDetailsProps {
  selectedNode: Node;
  recommendedEquipment: Node[];
  activeRecipe: any[] | null;
  recipeItemName: string;
  activeObtainInfo: any[] | null;
  obtainSkillName: string;
  materialUsages: any[] | null;
  
  onExpandNode: () => void;
  onDoubleClickExpand: () => void;
  onRecommend: () => void;
  onShowRecipe: (item: Node) => void;
  onShowObtain: (skill: Node) => void;
  onShowUsages: (material: Node) => void;
  
  onClearRecipe: () => void;
  onClearObtain: () => void;
  onClearUsages: () => void;
  
  getNodeColor: (node: Node) => string;
  translateLabel: (label: string) => string;
  translateRelation: (type: string) => string;
  translateDetailKey: (key: string) => string;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  selectedNode,
  recommendedEquipment,
  activeRecipe,
  recipeItemName,
  activeObtainInfo,
  obtainSkillName,
  materialUsages,
  onExpandNode,
  onDoubleClickExpand,
  onRecommend,
  onShowRecipe,
  onShowObtain,
  onShowUsages,
  onClearRecipe,
  onClearObtain,
  onClearUsages,
  getNodeColor,
  translateLabel,
  translateRelation,
  translateDetailKey
}) => {
  return (
    <>
      <h2>{selectedNode.name || selectedNode.title || 'Unknown Object'}</h2>
      <span className="badge" style={{backgroundColor: getNodeColor(selectedNode)}}>
        {translateLabel(selectedNode.label as string)}
      </span>
      
      <div className="details-list">
        {Object.entries(selectedNode)
          .filter(([key]) => !key.startsWith('_') && !['id', 'x', 'y', 'vx', 'vy', 'fx', 'fy', 'index', 'name', 'title', 'label', 'game_id', 'color'].includes(key))
          .map(([key, value]) => (
            <div className="detail-item" key={key}>
              <span className="detail-key">{translateDetailKey(key)}:</span>
              <span className="detail-value">{String(value)}</span>
            </div>
          ))}
      </div>

      <button className="action-button expand-btn" onClick={onExpandNode}>
          <IconSearch /> Explore Connections
      </button>
      <button className="action-button expand-btn" onClick={onDoubleClickExpand}>
          <IconSearch /> Fetch Connections (Expand)
      </button>
      
      {selectedNode.label === 'Monster' && (
        <button className="action-button expand-btn" style={{backgroundColor: '#4a1515', color: '#ffb3b3', marginTop: '10px', border: '1px solid #ffb3b3'}} onClick={onRecommend}>
          <IconSwords /> Find Equipment for Monster
        </button>
      )}
      {selectedNode.label === 'Item' && (
        <button className="action-button expand-btn" style={{backgroundColor: '#3a2800', color: '#d4af37', marginTop: '10px', border: '1px solid #d4af37'}} onClick={() => onShowRecipe(selectedNode)}>
          <IconTools /> Show How to Craft (Recipe)
        </button>
      )}
      {selectedNode.label === 'Skill' && (
        <button className="action-button expand-btn" style={{backgroundColor: '#101d2b', color: '#58a6ff', marginTop: '10px', border: '1px solid #58a6ff'}} onClick={() => onShowObtain(selectedNode)}>
          <IconSearch /> Show How to Obtain
        </button>
      )}
      {selectedNode.label === 'Material' && (
        <button className="action-button expand-btn" style={{backgroundColor: '#1f2937', color: '#a3c9a8', marginTop: '10px', border: '1px solid #a3c9a8'}} onClick={() => onShowUsages(selectedNode)}>
          <IconTools /> What Is It Used For
        </button>
      )}
      
      {/* Recommended Equipment */}
      {recommendedEquipment.length > 0 && (
        <div style={{ marginTop: '15px', border: '1px solid #d4af37', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
          <h4 style={{ color: '#d4af37', margin: '0 0 12px 0', fontFamily: 'Cinzel Decorative', letterSpacing: '1px' }}>Recommended Equipment:</h4>
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
                  onClick={(e) => { e.stopPropagation(); onShowRecipe(item); }}
                >
                  <IconTools size={12} /> Recipe
                </button>
              )}
              {item.label === 'Skill' && (
                <button 
                  className="recipe-btn"
                  style={{ marginLeft: 'auto', backgroundColor: '#101d2b', border: '1px solid #58a6ff', color: '#58a6ff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'Cinzel Decorative', display: 'flex', alignItems: 'center' }}
                  onClick={(e) => { e.stopPropagation(); onShowObtain(item); }}
                >
                  <IconSearch size={12} /> How to obtain
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Recipe Panel */}
      {activeRecipe && (
        <div style={{ marginTop: '15px', border: '1px solid #7cb342', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(124, 179, 66, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#aed581', margin: 0, fontFamily: 'Cinzel Decorative', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}><IconTools size={16} style={{marginRight: '8px'}} /> {activeRecipe.length > 0 ? `Ingredients: ${recipeItemName}` : `No Recipe: ${recipeItemName}`}</h4>
            <button onClick={onClearRecipe} style={{ background: 'none', border: 'none', color: '#aed581', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>✕</button>
          </div>
          {activeRecipe.length > 0 ? (
            activeRecipe.map((ingred, idx) => (
              <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < activeRecipe.length - 1 ? '1px dotted rgba(124, 179, 66, 0.3)' : 'none' }}>
                <div style={{ color: '#e8e4c9', fontWeight: 'bold' }}>
                  {ingred.quantity}x {ingred.material}
                </div>
                {ingred.sources && ingred.sources.length > 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px' }}>
                    Obtained from: <span style={{color: '#ffb3b3'}}>{ingred.sources.join(', ')}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px', fontStyle: 'italic' }}>
                    Unknown source (seek out legendary craftsmen)
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: '#e8e4c9', fontStyle: 'italic', fontSize: '0.9rem' }}>
              This item has no crafting recipe. It likely drops as whole loot.
            </div>
          )}
        </div>
      )}

      {/* Obtain Info Panel */}
      {activeObtainInfo && (
        <div style={{ marginTop: '15px', border: '1px solid #58a6ff', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(88, 166, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#58a6ff', margin: 0, fontFamily: 'Cinzel Decorative', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}><IconSearch size={16} /> Source: {obtainSkillName}</h4>
            <button onClick={onClearObtain} style={{ background: 'none', border: 'none', color: '#58a6ff', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>✕</button>
          </div>
          {activeObtainInfo.map((src, idx) => (
            <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < activeObtainInfo.length - 1 ? '1px dotted rgba(88, 166, 255, 0.3)' : 'none' }}>
              <div style={{ color: '#e8e4c9', fontWeight: 'bold' }}>
                {src.name} <span style={{fontSize: '0.75rem', color: '#a3c9a8', fontWeight: 'normal'}}>({translateLabel(src.label)})</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px' }}>
                Relation: <span style={{color: '#58a6ff'}}>{translateRelation(src.type)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Usages Panel */}
      {materialUsages && (
        <div style={{ marginTop: '15px', border: '1px solid #a3c9a8', padding: '15px', borderRadius: '8px', backgroundColor: 'rgba(163, 201, 168, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ color: '#a3c9a8', margin: 0, fontFamily: 'Cinzel Decorative', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}><IconTools size={16} style={{marginRight: '8px'}} /> Required for:</h4>
            <button onClick={onClearUsages} style={{ background: 'none', border: 'none', color: '#a3c9a8', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}>✕</button>
          </div>
          {materialUsages.map((item: any, idx) => (
            <div key={item.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: idx < materialUsages.length - 1 ? '1px dotted rgba(163, 201, 168, 0.3)' : 'none' }}>
              <div style={{ color: '#e8e4c9', fontWeight: 'bold' }}>
                {item.name || item.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#bcaaa4', marginTop: '4px' }}>
                Category: <span style={{color: '#ffd700'}}>Item {item.rarity ? `(${item.rarity})` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
