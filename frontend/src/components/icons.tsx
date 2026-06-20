import React from 'react';
import iconSearchRaw from '../assets/icons/archive-research.svg?raw';
import iconShieldRaw from '../assets/icons/viking-shield.svg?raw';
import iconSwordsRaw from '../assets/icons/crossed-swords.svg?raw';
import iconToolsRaw from '../assets/icons/sword-smithing.svg?raw';
import iconStartRaw from '../assets/icons/compass.svg?raw';
import iconTargetRaw from '../assets/icons/bullseye.svg?raw';
import iconRefreshRaw from '../assets/icons/cycle.svg?raw';

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

export const IconSearch = ({ size = 16, style = {} }) => <IconBase raw={iconSearchRaw} size={size} style={style} />;
export const IconStart = () => <IconBase raw={iconStartRaw} size={16} />;
export const IconTarget = () => <IconBase raw={iconTargetRaw} size={16} />;
export const IconShield = ({ size = 24, style = {} }) => <IconBase raw={iconShieldRaw} size={size} style={{marginRight: '5px', ...style}} />;
export const IconRefresh = () => <IconBase raw={iconRefreshRaw} size={16} />;
export const IconSwords = ({ size = 16, style = {} }) => <IconBase raw={iconSwordsRaw} size={size} style={style} />;
export const IconTools = ({ size = 16, style = {} }) => <IconBase raw={iconToolsRaw} size={size} style={style} />;
