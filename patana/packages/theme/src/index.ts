export const tokens = {
  colors: {
    brand: { DEFAULT:'#0f172a', light:'#334155', accent:'#f59e0b' },
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    border: '#e2e8f0',
  },
  radius: { sm:'0.375rem', md:'0.5rem', lg:'0.75rem', xl:'1rem' },
  font: { sans: 'Inter, ui-sans-serif, system-ui' },
} as const;
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand.DEFAULT,
        muted: tokens.colors.muted,
        border: tokens.colors.border,
      },
      borderRadius: tokens.radius,
    }
  }
} as const;
