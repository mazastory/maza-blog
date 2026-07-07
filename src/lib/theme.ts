export interface ThemeVars {
  color: string;
  fontFamily: string;
  fontUrl: string;
  headerStyle: 'left' | 'center' | 'banner';
  layoutWidth: 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl';
  borderRadius: 'rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl';
  feedStyle: 'list' | 'grid' | 'masonry';
}

export function generateThemeVars(siteConfig: any): ThemeVars {
  const domain = siteConfig?.domain || '';
  
  // Custom curated themes for specific domains
  if (domain === 'mazastory.com') {
    return {
      color: '#ec4899', // Vibrant Pink for K-pop/Hallyu
      fontFamily: '"Outfit", "Nanum Gothic", sans-serif',
      fontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&display=swap',
      headerStyle: 'center',
      layoutWidth: 'max-w-6xl',
      borderRadius: 'rounded-2xl',
      feedStyle: 'masonry',
    };
  }
  if (domain === 'nextinsightlab.com') {
    return {
      color: '#0ea5e9', // Trustworthy Sky Blue for Education
      fontFamily: '"Inter", "Noto Sans KR", sans-serif',
      fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap',
      headerStyle: 'left',
      layoutWidth: 'max-w-5xl',
      borderRadius: 'rounded-md',
      feedStyle: 'list',
    };
  }
  if (domain === 'wiseoriginlab.com') {
    return {
      color: '#10b981', // Calming Emerald Green for Health/Wellness
      fontFamily: '"Roboto", "Pretendard", sans-serif',
      fontUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap',
      headerStyle: 'banner',
      layoutWidth: 'max-w-4xl',
      borderRadius: 'rounded-xl',
      feedStyle: 'grid',
    };
  }
  if (domain === 'maza.ai.kr') {
    return {
      color: '#6366f1', // Indigo/Neon Blue for AI/Tech
      fontFamily: '"Outfit", "Nanum Gothic", sans-serif',
      fontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&display=swap',
      headerStyle: 'center',
      layoutWidth: 'max-w-7xl',
      borderRadius: 'rounded-none',
      feedStyle: 'grid',
    };
  }
  if (domain === 'autosite.kr') {
    return {
      color: '#dc2626', // Aggressive Red for Cars/Mobility
      fontFamily: '"Inter", "Noto Sans KR", sans-serif',
      fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap',
      headerStyle: 'banner',
      layoutWidth: 'max-w-6xl',
      borderRadius: 'rounded-md',
      feedStyle: 'masonry',
    };
  }

  // Fallback hash-based logic for any other domains
  const seedStr = siteConfig?.id || domain || 'maza';
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  const colors = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#0284c7', '#7c3aed', '#c026d3', '#ea580c', '#0d9488'];
  
  const fonts = [
    { family: '"Inter", "Noto Sans KR", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap' },
    { family: '"Roboto", "Pretendard", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap' },
    { family: '"Merriweather", "Noto Serif KR", serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Noto+Serif+KR:wght@400;500;700;900&display=swap' },
    { family: '"Outfit", "Nanum Gothic", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&display=swap' },
  ];

  const headerStyles: ('left' | 'center' | 'banner')[] = ['left', 'center', 'banner'];
  const widths: ('max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl')[] = ['max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'];
  const radiuses: ('rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl')[] = ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl'];
  const feedStyles: ('list' | 'grid' | 'masonry')[] = ['list', 'grid', 'masonry'];

  const getIndex = (shift: number, len: number) => Math.abs((absHash >> shift)) % len;

  return {
    color: siteConfig?.metadata?.theme_color || colors[absHash % colors.length],
    fontFamily: fonts[getIndex(1, fonts.length)].family,
    fontUrl: fonts[getIndex(1, fonts.length)].url,
    headerStyle: headerStyles[getIndex(2, headerStyles.length)],
    layoutWidth: widths[getIndex(3, widths.length)],
    borderRadius: radiuses[getIndex(4, radiuses.length)],
    feedStyle: feedStyles[getIndex(5, feedStyles.length)],
  };
}
