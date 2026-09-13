import * as React from 'react';
export type ButtonProps = any & { variant?: 'default'|'outline'|'ghost' };
export function Button({ variant='default', ...props }: ButtonProps){
  const cls = variant==='outline'?'border border-zinc-200 bg-white': variant==='ghost'?'bg-transparent':'bg-zinc-900 text-white';
  return (React as any).createElement('button', { ...props, className: [cls,'inline-flex items-center rounded-md px-4 py-2 text-sm',props.className].filter(Boolean).join(' ') });
}
export function Card({ children, className, ...props }: any){
  return (React as any).createElement('div', { ...props, className:['rounded-xl border bg-white p-4 shadow-sm',className].filter(Boolean).join(' ') }, children);
}
export function Input(props: any){
  return (React as any).createElement('input', { ...props, className:['flex h-9 w-full rounded-md border px-3 text-sm',props.className].filter(Boolean).join(' ') });
}
