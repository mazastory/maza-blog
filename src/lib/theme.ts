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
  const seedStr = siteConfig?.id || siteConfig?.domain || 'maza';
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);

  const colors = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#0284c7', '#7c3aed', '#c026d3', '#ea580c', '#0d9488'];
  
  const fonts = [
    { family: '"Inter", "Noto Sans KR", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap' },
    { family: '"Roboto", "Pretendard", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap' }, // Note: Pretendard is usually loaded via cdn separately, but we fallback
    { family: '"Merriweather", "Noto Serif KR", serif', url: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Noto+Serif+KR:wght@400;500;700;900&display=swap' },
    { family: '"Outfit", "Nanum Gothic", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Nanum+Gothic:wght@400;700;800&display=swap' },
  ];

  const headerStyles: ('left' | 'center' | 'banner')[] = ['left', 'center', 'banner'];
  const widths: ('max-w-4xl' | 'max-w-5xl' | 'max-w-6xl' | 'max-w-7xl')[] = ['max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'];
  const radiuses: ('rounded-none' | 'rounded-md' | 'rounded-xl' | 'rounded-2xl')[] = ['rounded-none', 'rounded-md', 'rounded-xl', 'rounded-2xl'];
  const feedStyles: ('list' | 'grid' | 'masonry')[] = ['list', 'grid', 'masonry'];

  // Use different parts of the hash to ensure variety doesn't always group together
  return {
    color: siteConfig?.metadata?.theme_color || colors[absHash % colors.length],
    fontFamily: fonts[(absHash >> 1) % fonts.length].family,
    fontUrl: fonts[(absHash >> 1) % fonts.length].url,
    headerStyle: headerStyles[(absHash >> 2) % headerStyles.length],
    layoutWidth: widths[(absHash >> 3) % widths.length],
    borderRadius: radiuses[(absHash >> 4) % radiuses.length],
    feedStyle: feedStyles[(absHash >> 5) % feedStyles.length],
  };
}
