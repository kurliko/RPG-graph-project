import React from 'react';
import type { Node } from '../../types';
import { IconTools } from '../icons';

interface GMEditorProps {
  selectedNode: Node | null;
  nodeFormData: any;
  setNodeFormData: (data: any) => void;
  newNodeLabel: string;
  setNewNodeLabel: (label: string) => void;
  linkingState: { active: boolean, targetLabel: string };
  setLinkingState: (state: { active: boolean, targetLabel: string }) => void;
  onCreateNode: () => void;
  onUpdateNode: () => void;
  onDeleteNode: () => void;
}

export const GMEditor: React.FC<GMEditorProps> = ({
  selectedNode,
  nodeFormData,
  setNodeFormData,
  newNodeLabel,
  setNewNodeLabel,
  linkingState,
  setLinkingState,
  onCreateNode,
  onUpdateNode,
  onDeleteNode
}) => {
  return (
    <div>
      <h2 style={{ color: '#ff4500', margin: '0 0 15px 0', fontFamily: 'Cinzel Decorative', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IconTools /> Game Master
      </h2>
      
      {linkingState.active && (
        <div style={{ padding: '10px', background: 'rgba(255, 69, 0, 0.2)', border: '1px dashed #ff4500', marginBottom: '15px', color: '#fff', borderRadius: '4px' }}>
          <strong>Linking Mode Active</strong>
          <p style={{fontSize: '0.8rem', margin: '5px 0'}}>Click another node in the graph to create a connection.</p>
          <button className="gm-btn" onClick={() => setLinkingState({active: false, targetLabel: ""})}>Cancel</button>
        </div>
      )}
      
      {selectedNode ? (
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>Edit: {selectedNode.label}</h3>
          <input className="gm-input" value={nodeFormData.name || ''} onChange={e => setNodeFormData({...nodeFormData, name: e.target.value})} placeholder="Name" />
          <textarea className="gm-input" value={nodeFormData.details || ''} onChange={e => setNodeFormData({...nodeFormData, details: e.target.value})} placeholder="Details" rows={4} />
          
          <button className="gm-btn primary" onClick={onUpdateNode}>Save Changes</button>
          <button className="gm-btn" onClick={() => setLinkingState({ active: true, targetLabel: "NEW_LINK" })}>Link to...</button>
          <button className="gm-btn danger" onClick={onDeleteNode}>Delete Node</button>
        </div>
      ) : (
        <div>
          <h3 style={{ color: '#fff', marginBottom: '10px' }}>Add New Node</h3>
          <select className="gm-input" value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)}>
            <option value="Monster">Monster</option>
            <option value="Item">Item</option>
            <option value="NPC">NPC</option>
            <option value="Zone">Zone</option>
            <option value="Skill">Skill</option>
            <option value="Material">Material</option>
          </select>
          <input className="gm-input" value={nodeFormData.name || ''} onChange={e => setNodeFormData({...nodeFormData, name: e.target.value})} placeholder="Name" />
          <textarea className="gm-input" value={nodeFormData.details || ''} onChange={e => setNodeFormData({...nodeFormData, details: e.target.value})} placeholder="Details" rows={4} />
          
          <button className="gm-btn primary" onClick={onCreateNode}>Create Node</button>
        </div>
      )}
    </div>
  );
};
