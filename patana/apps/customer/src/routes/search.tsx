import { useQuery } from '@tanstack/react-query';
import { createClient } from '@patana/api-client';
const api = createClient(import.meta.env.VITE_API_URL ?? 'http://localhost:3001');
export function SearchRoute(){
  const q = useQuery({ queryKey:['units'], queryFn:()=> api.get('/catalog/units?city=Kinshasa') });
  return <div style={{padding:24}}><h2>Search</h2><pre>{JSON.stringify(q.data??{loading:true},null,2)}</pre></div>;
}
