import type { Node } from '../types';

export const translateLabel = (label: string): string => {
  const dict: Record<string, string> = {
    'Item': 'Item',
    'Material': 'Material',
    'Monster': 'Monster',
    'NPC': 'NPC',
    'Zone': 'Location',
    'Quest': 'Quest',
    'Skill': 'Skill',
    'Element': 'Element'
  };
  return dict[label] || label;
};

export const translateRelation = (type: string): string => {
  const dict: Record<string, string> = {
    'RESIDES_IN': 'Resides In',
    'SPAWNS_IN': 'Spawns In',
    'GIVES': 'Gives',
    'TAKES_PLACE_IN': 'Takes Place In',
    'PRE_REQUISITE': 'Prerequisite',
    'REQUIRES': 'Requires',
    'DROPS': 'Drops',
    'UNLOCKS': 'Unlocks',
    'TEACHES': 'Teaches',
    'GRANTS_SKILL': 'Grants Skill',
    'USES_SKILL': 'Uses',
    'WEAK_AGAINST': 'Weak Against',
    'RESISTANT_TO': 'Resistant To',
    'IMBUED_WITH': 'Imbued With',
    'USES_ELEMENT': 'Uses Element'
  };
  return dict[type] || type;
};

export const translateDetailKey = (key: string): string => {
  const dict: Record<string, string> = {
    'details': 'Description',
    'min_level': 'Min. Level',
    'level': 'Level',
    'faction': 'Faction',
    'category': 'Category',
    'rarity': 'Rarity',
    'exp_reward': 'EXP Reward',
    'weaknesses': 'Weaknesses',
    'resistances': 'Resistances',
    'cooldown': 'Cooldown'
  };
  return dict[key] || key;
};

export const getNodeColor = (node: Node) => {
  switch (node.label) {
    case 'Zone': return '#228B22'; // ForestGreen
    case 'NPC': return '#4169E1'; // RoyalBlue
    case 'Monster': return '#B22222'; // Firebrick
    case 'Item': return '#FFD700'; // Gold
    case 'Material': return '#A9A9A9'; // DarkGray
    case 'Quest': return '#9370DB'; // MediumPurple
    case 'Skill': return '#FF1493'; // DeepPink
    case 'Element': return node.color || '#00FFFF';
    default: return '#FFFFFF';
  }
};
