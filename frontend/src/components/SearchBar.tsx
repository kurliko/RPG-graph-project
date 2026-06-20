import React from 'react';
import type { Node } from '../types';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Node[];
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectResult: (nodeId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  searchResults,
  onSearch,
  onSelectResult
}) => {
  return (
    <div className="floating-search-container">
      <input 
        type="text" 
        placeholder="Search for knowledge (e.g., Thor, Mjolnir, Runes)..." 
        value={searchQuery}
        onChange={onSearch}
        className="search-input"
      />
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map(n => (
            <div key={n.id} className="search-result-item" onClick={() => onSelectResult(n.id)}>
              {n.name || n.title || n.game_id} <span style={{fontSize: '0.7rem', color: '#8b949e'}}>({n.label})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
