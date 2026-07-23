export interface ThemeVars {
  color: string;
  fontFamily: string;
  fontUrl: string;
  layoutWidth: 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl';
  borderRadius: 'rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl';
  feedStyle: 'list' | 'grid' | 'masonry';
  
  // Header Builder
  headerLogoPos: 'left' | 'center' | 'right';
  headerMenuPos: 'inline' | 'bottom' | 'right';
  headerTopBar: boolean;
  headerDarkMode: boolean;

  // Footer Builder
  footerCols: 1 | 2 | 3 | 4;
  footerAlign: 'left' | 'center';
  footerBg: 'white' | 'light' | 'dark' | 'black';

  // Hero Builder
  heroTemplate: 'modern' | 'classic' | 'magazine' | 'minimal' | 'split' | 'app';

  // Micro-Jitter
  paddingY: string;

  // Premium Features
  isPremium: boolean;
  themeId: string;
}

export function generateThemeVars(siteConfig: any): ThemeVars {
  const domain = siteConfig?.domain || '';
  const seedStr = siteConfig?.id || domain || 'maza';
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);

  const colors = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#0284c7', '#7c3aed', '#c026d3', '#ea580c', '#0d9488'];
  
  const fonts = [
    { family: '"Inter", "Noto Sans KR", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap' },
    { family: '"Roboto", "Pretendard", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap' },
    { family: '"Merriweather", "Noto Serif KR", serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Noto+Serif+KR:wght@400;500;700;900&display=swap' },
    { family: '"Outfit", "Nanum Gothic", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&display=swap' },
  ];

  const widths: ('max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl')[] = ['max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'];
  const radiuses: ('rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl')[] = ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl'];
  const feedStyles: ('list' | 'grid' | 'masonry')[] = ['list', 'grid', 'masonry'];
  
  const logoPos: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
  const menuPos: ('inline' | 'bottom' | 'right')[] = ['inline', 'bottom', 'right'];
  const topBars = [true, false];
  const darkModes = [true, false];
  
  const footCols: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const footAlign: ('left' | 'center')[] = ['left', 'center'];
  const footBg: ('white' | 'light' | 'dark' | 'black')[] = ['white', 'light', 'dark', 'black'];
  const paddings = ['py-4', 'py-6', 'py-8', 'py-10'];
  const heroTemplates: ('modern' | 'classic' | 'magazine' | 'minimal' | 'split' | 'app')[] = ['modern', 'classic', 'magazine', 'minimal', 'split', 'app'];

  const getIndex = (shift: number, len: number) => Math.abs((absHash >> shift)) % len;

  const isPremium = siteConfig?.metadata?.tier === 'pro' || siteConfig?.metadata?.tier === 'agency' || siteConfig?.metadata?.unlocked_features?.includes('premium_theme') || false;
  const themeId = siteConfig?.metadata?.theme_id || 'free_default';

  return {
    color: siteConfig?.metadata?.theme_color || colors[absHash % colors.length],
    fontFamily: fonts[getIndex(1, fonts.length)].family,
    fontUrl: fonts[getIndex(1, fonts.length)].url,
    layoutWidth: widths[getIndex(2, widths.length)],
    borderRadius: radiuses[getIndex(3, radiuses.length)],
    feedStyle: feedStyles[getIndex(4, feedStyles.length)],
    
    headerLogoPos: logoPos[getIndex(5, logoPos.length)],
    headerMenuPos: menuPos[getIndex(6, menuPos.length)],
    headerTopBar: topBars[getIndex(7, topBars.length)],
    headerDarkMode: darkModes[getIndex(8, darkModes.length)],
    
    footerCols: footCols[getIndex(9, footCols.length)],
    footerAlign: footAlign[getIndex(10, footAlign.length)],
    footerBg: footBg[getIndex(11, footBg.length)],
    paddingY: paddings[getIndex(12, paddings.length)],
    heroTemplate: heroTemplates[getIndex(13, heroTemplates.length)],
    
    isPremium,
    themeId,
  };
}
