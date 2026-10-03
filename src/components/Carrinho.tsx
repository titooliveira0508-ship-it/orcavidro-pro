import { ALTURAS, ItemOrcamento } from '../types';
import { formatarMoeda, quantidadeDe, subtotalItens, totalItem, totalPedido } from '../lib/storage';
import { getCategoria } from '../data/categorias';

interface Props {
  itens: ItemOrcamento[];
  desconto: number;
  aoAlterarDesconto: (valor: number) => void;
  aoAlterarQuantidade: (id: string, quantidade: number) => void;
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

function parseDesconto(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) || n < 0 ? 0 : n;
}

export default function Carrinho({
  itens,
  desconto,
  aoAlterarDesconto,
  aoAlterarQuantidade,
  aoRemover,
  aoLimpar,
  aoFecharPedido,
}: Props) {
  const subtotal = subtotalItens(itens);
  const total = totalPedido(subtotal, desconto);

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
            const qtd = quantidadeDe(item);
            return (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
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
                  <button
                    onClick={() => aoRemover(item.id)}
                    className="text-xs font-semibold text-red-500 shrink-0"
                  >
                    remover
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Qtd:</span>
                    <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden">
                      <button
                        onClick={() => aoAlterarQuantidade(item.id, Math.max(1, qtd - 1))}
                        className="px-2.5 py-1 text-base font-black text-slate-600 bg-slate-50 active:bg-slate-200"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="px-3 py-1 text-sm font-black text-slate-800 min-w-[2.5rem] text-center">
                        {qtd}
                      </span>
                      <button
                        onClick={() => aoAlterarQuantidade(item.id, qtd + 1)}
                        className="px-2.5 py-1 text-base font-black text-slate-600 bg-slate-50 active:bg-slate-200"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatarMoeda(item.valor)} un.
                    </span>
                  </div>
                  <p className="text-sm font-black text-brand-dark">{formatarMoeda(totalItem(item))}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {itens.length > 0 && (
        <>
          <div className="px-4 py-3 border-t border-slate-200 space-y-2 bg-slate-50/60">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-semibold">Subtotal</span>
              <span className="font-bold text-slate-800">{formatarMoeda(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-slate-600 font-semibold">Desconto (R$)</label>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={desconto > 0 ? desconto.toString().replace('.', ',') : ''}
                onChange={(e) => aoAlterarDesconto(parseDesconto(e.target.value))}
                className="w-28 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-right font-bold"
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-sm font-black text-slate-800 uppercase tracking-wide">Total</span>
              <span className="text-xl font-black text-brand-dark">{formatarMoeda(total)}</span>
            </div>
          </div>

          <div className="p-3">
            <button
              onClick={aoFecharPedido}
              className="w-full py-3 rounded-2xl bg-brand text-white font-black text-base shadow-md active:scale-[0.99] transition-transform"
            >
              Fechar pedido
            </button>
          </div>
        </>
      )}
    </div>
  );
}
