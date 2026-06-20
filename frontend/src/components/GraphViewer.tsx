import React, { forwardRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { Node, GraphData } from '../types';

// Importing raw SVGs for canvas drawing
import itemNodeRaw from '../assets/icons/item-node.svg?raw';
import materialNodeRaw from '../assets/icons/material-node.svg?raw';
import monsterNodeRaw from '../assets/icons/monster-node.svg?raw';
import npcNodeRaw from '../assets/icons/npc-node.svg?raw';
import zoneNodeRaw from '../assets/icons/zone-node.svg?raw';
import questNodeRaw from '../assets/icons/quest-node.svg?raw';
import skillNodeRaw from '../assets/icons/skill-node.svg?raw';
import elementNodeRaw from '../assets/icons/element-node.svg?raw';

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

export const getSvgStrings = () => svgStrings;

interface GraphViewerProps {
  data: GraphData;
  pathLinks: Set<string>;
  pathNodes: Set<string>;
  selectedNode: Node | null;
  recommendedEquipment: Node[];
  highlightsRef: React.MutableRefObject<{id: string, timestamp: number}[]>;
  onNodeClick: (node: Node) => void;
  getNodeColor: (node: Node) => string;
  translateLabel: (label: string) => string;
  translateRelation: (type: string) => string;
}

export const GraphViewer = forwardRef<any, GraphViewerProps>(({
  data,
  pathLinks,
  pathNodes,
  selectedNode,
  recommendedEquipment,
  highlightsRef,
  onNodeClick,
  getNodeColor,
  translateLabel,
  translateRelation
}, ref) => {
  
  return (
    <div className="graph-wrapper">
      <ForceGraph2D
        ref={ref}
        graphData={data}
        nodeLabel={(node: any) => `${translateLabel(node.label)}: ${node.name || node.title || node.game_id || 'Unknown'}`}
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
        onNodeClick={onNodeClick}
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          if (node.x === undefined || node.y === undefined) return;
          
          const isSelected = node.id === selectedNode?.id;
          const isPath = pathNodes.has(node.id as string);
          const isRecommended = recommendedEquipment.some(r => r.id === node.id);
          const highlight = highlightsRef.current.find(h => h.id === node.id);
          const size = 6;
          
          // Glow animation for newly added nodes
          if (highlight) {
            const elapsed = Date.now() - highlight.timestamp;
            const duration = 2500; // Glow lasts 2.5 seconds
            if (elapsed < duration) {
              const progress = elapsed / duration;
              const alpha = 0.8 * (1 - progress); // Fades smoothly from 0.8 to 0
              const glowSize = size + 15 * (1 - progress); // Pulses inward
              ctx.beginPath();
              ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI, false);
              ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
              ctx.fill();
            }
          }

          // Highlight for selection or path
          if (isSelected || isPath) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
            ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 215, 0, 0.4)';
            ctx.fill();
          }
          
          // Gold circle marking recommended equipment for monster
          if (isRecommended) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 8, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#D4AF37'; // Nordic gold
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Glow
            ctx.shadowColor = '#FF4500'; // Fiery red
            ctx.shadowBlur = 15;
          }

          // Draw node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = getNodeColor(node as Node);
          ctx.fill();
          
          // Reset shadowBlur after drawing node background so SVG icon isn't blurry
          ctx.shadowBlur = 0;

          // Draw SVG icon
          const img = ICONS[(node as Node).label];
          if (img) {
            const imgSize = size * 1.3; // Icon sized to match the circle
            ctx.drawImage(img, node.x - imgSize/2, node.y - imgSize/2, imgSize, imgSize);
          }
        }}
      />
    </div>
  );
});
