export type Aba = 'orcamento' | 'clientes' | 'pedidos' | 'empresa';

interface Props {
  ativa: Aba;
  aoTrocar: (aba: Aba) => void;
  qtdCarrinho: number;
}

const ABAS: { id: Aba; rotulo: string; svg: JSX.Element }[] = [
  {
    id: 'orcamento',
    rotulo: 'Orçamento',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    ),
  },
  {
    id: 'clientes',
    rotulo: 'Clientes',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'pedidos',
    rotulo: 'Pedidos',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    id: 'empresa',
    rotulo: 'Empresa',
    svg: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
        <path d="M18 9h2a2 2 0 0 1 2 2v11h-4" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    ),
  },
];

export default function BottomNav({ ativa, aoTrocar, qtdCarrinho }: Props) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto grid grid-cols-4">
        {ABAS.map((aba) => {
          const selecionada = aba.id === ativa;
          return (
            <button
              key={aba.id}
              onClick={() => aoTrocar(aba.id)}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                selecionada ? 'text-brand-dark' : 'text-slate-400'
              }`}
            >
              <span className="leading-none">{aba.svg}</span>
              {aba.rotulo}
              {aba.id === 'orcamento' && qtdCarrinho > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-7 min-w-[20px] h-5 px-1 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                  {qtdCarrinho}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
