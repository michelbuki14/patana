import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { HomeRoute } from './routes/home';
import { SearchRoute } from './routes/search';
import { BookingRoute } from './routes/booking';

const rootRoute = createRootRoute({ component: () => <><nav style={{padding:12,borderBottom:'1px solid #eee'}}>Patana — Customer</nav><Outlet/></> });
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomeRoute });
const searchRoute = createRoute({ getParentRoute: () => rootRoute, path: '/search', component: SearchRoute });
const bookingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/booking/$bookingId', component: BookingRoute });
const routeTree = rootRoute.addChildren([homeRoute, searchRoute, bookingRoute]);
const router = createRouter({ routeTree });
declare module '@tanstack/react-router' { interface Register { router: typeof router } }
export function App(){ return <RouterProvider router={router} />; }
