declare module 'react' { const React: any; export default React; }
declare module 'react-dom/client' { export const createRoot: any; }
declare module '@tanstack/react-router' { export const RouterProvider: any; export const createRouter:any; export const createRootRoute:any; export const createRoute:any; export const Outlet:any; }
declare module '@tanstack/react-query' { export const QueryClient:any; export const QueryClientProvider:any; export const useQuery:any; }
declare module '@tanstack/react-form' {}
declare module '@patana/ui' { export const Button:any; export const Card:any; }
declare module '@patana/theme' {}
declare module '@patana/api-client' { export const createClient:any; }
declare module '@patana/types' {}
declare module '@patana/validation' {}
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }

declare module 'react/jsx-runtime' { export const jsx:any; export const jsxs:any; export const Fragment:any; }
