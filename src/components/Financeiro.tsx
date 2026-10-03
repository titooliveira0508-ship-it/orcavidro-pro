// ─── OrçaVidro Pro · Financeiro do serviço ───────────────────────────────────
// Mostra "o que entrou e o que saiu" de cada pedido: entradas, saídas e saldo.
import { useState } from 'react';
import { Movimentacao, Pedido, TipoMovimentacao } from '../types';
import { formatarMoeda, novoId } from '../lib/storage';

interface Props {
  pedido: Pedido;
  aoFechar: () => void;
  aoAtualizar: (pedidoAtualizado: Pedido) => void;
}

function parseValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) || n <= 0 ? 0 : n;
}

function formatarData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export default function Financeiro({ pedido, aoFechar, aoAtualizar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimentacao>('entrada');
  const [descricao, setDescricao] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [erro, setErro] = useState('');

  const movimentacoes = pedido.movimentacoes ?? [];

  const totalEntradas = movimentacoes
    .filter((m) => m.tipo === 'entrada')
    .reduce((soma, m) => soma + m.valor, 0);
  const totalSaidas = movimentacoes
    .filter((m) => m.tipo === 'saida')
    .reduce((soma, m) => soma + m.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  const ordenadas = [...movimentacoes].sort((a, b) => b.data - a.data);

  function adicionar() {
    const valor = parseValor(valorTexto);
    if (!descricao.trim()) {
      setErro('Escreva uma descrição (ex.: entrada do cliente, compra de vidro).');
      return;
    }
    if (valor <= 0) {
      setErro('Informe o valor em R$.');
      return;
    }
    const nova: Movimentacao = {
      id: novoId('mov'),
      tipo,
      descricao: descricao.trim(),
      valor,
      data: Date.now(),
    };
    setErro('');
    setDescricao('');
    setValorTexto('');
    setTipo('entrada');
    aoAtualizar({ ...pedido, movimentacoes: [...movimentacoes, nova] });
  }

  function excluir(id: string) {
    aoAtualizar({
      ...pedido,
      movimentacoes: movimentacoes.filter((m) => m.id !== id),
    });
  }

  const campo =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand';
  const rotulo = 'block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1';

  return (
    <div className="pb-4">
      <button onClick={aoFechar} className="text-sm font-semibold text-brand-dark mb-3">
        ‹ Voltar
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">
            Financeiro · Pedido nº {pedido.numero}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{pedido.clienteNome}</p>
        </div>

        {/* Valor do orçamento como referência */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Valor do orçamento
          </span>
          <span className="text-base font-black text-slate-800">{formatarMoeda(pedido.total)}</span>
        </div>

        {/* Resumo: entradas, saídas e saldo */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-2 py-2.5 text-center">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Entradas</p>
            <p className="text-sm font-black text-emerald-700 mt-0.5">{formatarMoeda(totalEntradas)}</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 px-2 py-2.5 text-center">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Saídas</p>
            <p className="text-sm font-black text-red-700 mt-0.5">{formatarMoeda(totalSaidas)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-2 py-2.5 text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Saldo</p>
            <p className="text-sm font-black text-blue-700 mt-0.5">{formatarMoeda(saldo)}</p>
          </div>
        </div>

        {/* Lista de movimentações */}
        <div>
          <p className={rotulo}>Movimentações</p>
          {ordenadas.length === 0 ? (
            <p className="text-sm text-slate-400 py-3 text-center">
              Nenhuma movimentação ainda. Adicione abaixo.
            </p>
          ) : (
            <ul className="space-y-2">
              {ordenadas.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <span
                    className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                      m.tipo === 'entrada' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.descricao}</p>
                    <p className="text-xs text-slate-400">{formatarData(m.data)}</p>
                  </div>
                  <span
                    className={`text-sm font-black whitespace-nowrap ${
                      m.tipo === 'entrada' ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {m.tipo === 'entrada' ? '+' : '−'} {formatarMoeda(m.valor)}
                  </span>
                  <button
                    onClick={() => excluir(m.id)}
                    aria-label="Excluir movimentação"
                    className="shrink-0 w-8 h-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 font-bold"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulário: nova movimentação */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
          <p className={rotulo}>Nova movimentação</p>

          <div className="flex gap-2">
            <button
              onClick={() => setTipo('entrada')}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-bold border transition-colors ${
                tipo === 'entrada'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              + Entrada
            </button>
            <button
              onClick={() => setTipo('saida')}
              className={`flex-1 px-3 py-2 rounded-full text-sm font-bold border transition-colors ${
                tipo === 'saida'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              − Saída
            </button>
          </div>

          <div>
            <label className={rotulo}>Descrição</label>
            <input
              placeholder="Ex.: entrada do cliente, compra de vidro"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={campo}
            />
          </div>

          <div>
            <label className={rotulo}>Valor (R$)</label>
            <input
              inputMode="decimal"
              placeholder="Ex.: 500,00"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              className={campo}
            />
          </div>

          {erro && <p className="text-xs font-semibold text-red-600">{erro}</p>}

          <button
            onClick={adicionar}
            className="w-full rounded-xl bg-brand py-3 text-sm font-black text-white shadow-sm active:scale-[0.99]"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
