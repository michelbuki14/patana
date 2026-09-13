import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { DashboardRoute } from './routes/dashboard';
import { PropertiesRoute } from './routes/properties';
import { BookingsRoute } from './routes/bookings';
import { CalendarRoute } from './routes/calendar';
const rootRoute=createRootRoute({component:()=><><nav style={{padding:12,borderBottom:'1px solid #eee'}}>Patana — Owner</nav><Outlet/></>});
const dash=createRoute({getParentRoute:()=>rootRoute,path:'/',component:DashboardRoute});
const props=createRoute({getParentRoute:()=>rootRoute,path:'/properties',component:PropertiesRoute});
const bookings=createRoute({getParentRoute:()=>rootRoute,path:'/bookings',component:BookingsRoute});
const cal=createRoute({getParentRoute:()=>rootRoute,path:'/calendar',component:CalendarRoute});
const tree=rootRoute.addChildren([dash,props,bookings,cal]);
const router=createRouter({routeTree:tree});
declare module '@tanstack/react-router'{interface Register{router:typeof router}}
export function App(){return <RouterProvider router={router}/>}
