import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  isGMMode: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isGMMode, onClose, children }) => {
  return (
    <div className={`sidebar ${isOpen ? 'open' : ''} ${isGMMode ? 'gm-panel' : ''}`}>
      <div className="sidebar-content" style={{ height: '100%', overflowY: 'auto' }}>
        
        {children}

        <button 
          className="action-button close-btn" 
          style={{marginTop: 'auto'}} 
          onClick={onClose}
        >
          Close Entire Panel
        </button>
      </div>
    </div>
  );
};
