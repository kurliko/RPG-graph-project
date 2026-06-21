import React from 'react';
import type { Node } from '../../types';
import { IconStart, IconTarget } from '../icons';

interface PathfinderProps {
  selectedNode: Node | null;
  pathSource: Node | null;
  pathTarget: Node | null;
  pathNodes: Set<string>;
  setPathSource: (node: Node | null) => void;
  setPathTarget: (node: Node | null) => void;
  onFindPath: () => void;
  onClearPath: () => void;
}

export const Pathfinder: React.FC<PathfinderProps> = ({
  selectedNode,
  pathSource,
  pathTarget,
  pathNodes,
  setPathSource,
  setPathTarget,
  onFindPath,
  onClearPath
}) => {
  return (
    <>
      <hr style={{ borderColor: '#30363d', margin: '20px 0', width: '100%' }} />
      <div>
        <h3 style={{ color: '#d4af37', textShadow: '0 2px 5px rgba(0,0,0,0.8)', margin: '0 0 10px 0' }}>Pathfinder</h3>
        
        <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
          <button 
            className="action-button path-btn" 
            onClick={() => selectedNode && setPathSource(selectedNode)} 
            disabled={!selectedNode}
            style={{flex: 1, opacity: selectedNode ? 1 : 0.5}}
          >
            <IconStart /> Set Start
          </button>
          <button 
            className="action-button path-btn" 
            onClick={() => selectedNode && setPathTarget(selectedNode)} 
            disabled={!selectedNode}
            style={{flex: 1, opacity: selectedNode ? 1 : 0.5}}
          >
            <IconTarget /> Set Target
          </button>
        </div>

        <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
          <IconStart /> Start: <strong style={{color: '#fff'}}>{pathSource ? (pathSource.name || pathSource.title || pathSource.game_id) : '---'}</strong>
        </p>
        <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
          <IconTarget /> Target: <strong style={{color: '#fff'}}>{pathTarget ? (pathTarget.name || pathTarget.title || pathTarget.game_id) : '---'}</strong>
        </p>
        
        <button 
          onClick={onFindPath} 
          disabled={!pathSource || !pathTarget} 
          className="action-button expand-btn" 
          style={{width: '100%', marginTop: '15px'}}
        >
          Find Path
        </button>
        
        {(pathSource || pathTarget || pathNodes.size > 0) && (
          <button onClick={onClearPath} className="action-button close-btn" style={{width: '100%', marginTop: '10px'}}>
            Clear Pathfinder
          </button>
        )}
      </div>
    </>
  );
};
