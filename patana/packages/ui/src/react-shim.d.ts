declare module 'react' { const React: any; export = React; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
