export type Aba = 'orcamento' | 'clientes' | 'pedidos' | 'empresa';

interface Props {
  ativa: Aba;
  aoTrocar: (aba: Aba) => void;
  qtdCarrinho: number;
}

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'orcamento', rotulo: 'Orçamento', icone: '🧾' },
  { id: 'clientes', rotulo: 'Clientes', icone: '👥' },
  { id: 'pedidos', rotulo: 'Pedidos', icone: '📦' },
  { id: 'empresa', rotulo: 'Empresa', icone: '🏢' },
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
                selecionada ? 'text-teal-700' : 'text-slate-400'
              }`}
            >
              <span className="text-xl leading-none">{aba.icone}</span>
              {aba.rotulo}
              {aba.id === 'orcamento' && qtdCarrinho > 0 && (
                <span className="absolute top-1 right-1/2 translate-x-7 min-w-[20px] h-5 px-1 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">
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
