import { ALTURAS, ItemOrcamento } from '../types';
import { formatarMoeda } from '../lib/storage';
import { getCategoria } from '../data/categorias';

interface Props {
  itens: ItemOrcamento[];
  aoRemover: (id: string) => void;
  aoLimpar: () => void;
  aoFecharPedido: () => void;
}

function descricaoItem(item: ItemOrcamento): string {
  const partes: string[] = [];
  if (item.subOpcao) partes.push(item.subOpcao);
  if (item.larguraMm) partes.push(`L ${item.larguraMm}mm`);
  if (item.alturaOpcao === 'piso-teto') partes.push('piso-teto');
  else if (item.alturaMm) partes.push(`A ${item.alturaMm}mm`);
  else {
    const rotulo = ALTURAS.find((a) => a.valor === item.alturaOpcao)?.rotulo;
    if (rotulo) partes.push(rotulo);
  }
  partes.push(`vidro ${item.corVidro.toLowerCase()}`);
  partes.push(`kit ${item.corKit.toLowerCase()}`);
  if (item.modeloDobradica) partes.push(`dobradiça ${item.modeloDobradica} ${item.corDobradica?.toLowerCase()}`);
  if (item.pelicula) partes.push(`película ${item.pelicula.toLowerCase()}`);
  return partes.join(' · ');
}

export default function Carrinho({ itens, aoRemover, aoLimpar, aoFecharPedido }: Props) {
  const total = itens.reduce((acc, i) => acc + i.valor, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
          Itens do orçamento ({itens.length})
        </h3>
        {itens.length > 0 && (
          <button onClick={aoLimpar} className="text-xs font-bold text-red-600">
            Limpar
          </button>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          Nenhum item ainda. Escolha uma categoria acima e adicione o primeiro item.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {itens.map((item) => {
            const ilustracao = getCategoria(item.categoriaId)?.ilustracao;
            return (
              <li key={item.id} className="px-4 py-3 flex items-start gap-3">
                {ilustracao && (
                  <img
                    src={ilustracao}
                    alt={item.categoriaNome}
                    className="w-12 h-12 shrink-0 rounded-lg object-cover border border-slate-200 bg-slate-50"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {item.categoriaNome}
                    {item.subOpcao ? ` — ${item.subOpcao}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 leading-snug mt-0.5">{descricaoItem(item)}</p>
                  {item.observacao && (
                    <p className="text-xs text-slate-400 italic mt-0.5">“{item.observacao}”</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-brand-dark">{formatarMoeda(item.valor)}</p>
                  <button
                    onClick={() => aoRemover(item.id)}
                    className="text-xs font-semibold text-red-500 mt-1"
                  >
                    remover
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 py-3 bg-brand-light border-t border-brand-tint flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Total</span>
        <span className="text-xl font-black text-brand-dark">{formatarMoeda(total)}</span>
      </div>

      {itens.length > 0 && (
        <div className="p-3">
          <button
            onClick={aoFecharPedido}
            className="w-full py-3 rounded-2xl bg-brand text-white font-black text-base shadow-md active:scale-[0.99] transition-transform"
          >
            Fechar pedido
          </button>
        </div>
      )}
    </div>
  );
}
