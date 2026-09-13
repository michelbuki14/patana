export type ApiError = { status:number; code:string; message:string; details?:unknown };
export type ClientOptions = { baseUrl:string; getToken?:()=>string|undefined };

export function createClient(baseUrl:string, opts: Omit<ClientOptions,'baseUrl'>={}){
  const options: ClientOptions = { baseUrl, ...opts };
  async function request<T>(path:string, init: RequestInit & { idempotencyKey?:string } = {}): Promise<T>{
    const headers: Record<string,string> = { 'Content-Type':'application/json', ...(init.headers as Record<string,string> ?? {}) };
    const token = options.getToken?.();
    if(token) headers['Authorization']=`Bearer ${token}`;
    if(init.idempotencyKey) headers['Idempotency-Key']=init.idempotencyKey;
    const res = await fetch(`${options.baseUrl}${path}`, { ...init, headers });
    if(!res.ok){
      const body = await res.json().catch(()=>({ message: res.statusText }));
      const err: ApiError = { status: res.status, code: (body as any).error?.code ?? 'UNKNOWN', message: (body as any).error?.message ?? (body as any).message ?? res.statusText, details: body };
      throw Object.assign(new Error(err.message), err);
    }
    if(res.status===204) return undefined as T;
    return res.json() as Promise<T>;
  }
  return {
    get: <T>(path:string, init?:RequestInit)=> request<T>(path,{ ...init, method:'GET' }),
    post: <T>(path:string, body?:unknown, init?:RequestInit & {idempotencyKey?:string})=> request<T>(path,{ ...init, method:'POST', body: body? JSON.stringify(body): undefined }),
    put: <T>(path:string, body?:unknown, init?:RequestInit)=> request<T>(path,{ ...init, method:'PUT', body: body? JSON.stringify(body): undefined }),
    patch: <T>(path:string, body?:unknown, init?:RequestInit)=> request<T>(path,{ ...init, method:'PATCH', body: body? JSON.stringify(body): undefined }),
    delete: <T>(path:string, init?:RequestInit)=> request<T>(path,{ ...init, method:'DELETE' }),
    request,
  };
}
export type ApiClient = ReturnType<typeof createClient>;
