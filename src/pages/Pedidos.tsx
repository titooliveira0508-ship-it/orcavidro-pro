import { useEffect, useState } from 'react';
import { Pedido, StatusPedido } from '../types';
import { formatarMoeda, storeClientes, storeEmpresa, storePedidos } from '../lib/storage';
import {
  gerarPdfOrcamento,
  linkWhatsApp,
  mensagemOrcamento,
  soDigitos,
} from '../lib/pdf';

const STATUS: { valor: StatusPedido; rotulo: string; cor: string }[] = [
  { valor: 'pendente', rotulo: 'Pendente', cor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { valor: 'aprovado', rotulo: 'Aprovado', cor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { valor: 'instalado', rotulo: 'Instalado', cor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

function rotuloStatus(s: StatusPedido): string {
  return STATUS.find((x) => x.valor === s)?.rotulo ?? s;
}

function corStatus(s: StatusPedido): string {
  return STATUS.find((x) => x.valor === s)?.cor ?? '';
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>(() => storePedidos.ler());
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todos' | StatusPedido>('todos');

  useEffect(() => {
    storePedidos.salvar(pedidos);
  }, [pedidos]);

  function mudarStatus(id: string, status: StatusPedido) {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir este pedido?')) return;
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  async function gerarPdf(p: Pedido) {
    const cliente = p.clienteId
      ? storeClientes.ler().find((c) => c.id === p.clienteId)
      : undefined;
    await gerarPdfOrcamento({
      empresa: storeEmpresa.ler(),
      numero: p.numero,
      clienteNome: p.clienteNome,
      clienteTelefone: cliente?.telefone || undefined,
      clienteEndereco: cliente?.endereco || undefined,
      itens: p.itens,
      total: p.total,
      validadeDias: p.validadeDias && p.validadeDias > 0 ? p.validadeDias : 15,
      observacoes: p.observacoes,
      pagamento: p.pagamento,
      dataEmissao: new Date(p.criadoEm),
    });
  }

  async function enviarWhats(p: Pedido) {
    const cliente = p.clienteId
      ? storeClientes.ler().find((c) => c.id === p.clienteId)
      : undefined;
    const fone = cliente?.telefone ? soDigitos(cliente.telefone) : '';
    if (!fone) {
      alert('Este pedido não tem um cliente com telefone cadastrado.');
      return;
    }
    await gerarPdf(p);
    window.open(linkWhatsApp(fone, mensagemOrcamento(p.clienteNome, p.numero, p.total)), '_blank');
  }

  const visiveis = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtro);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-slate-900">Pedidos</h1>

      <div className="flex gap-2 flex-wrap">
        {(['todos', 'pendente', 'aprovado', 'instalado'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filtro === f
                ? 'bg-brand border-brand text-white'
                : 'bg-white border-slate-300 text-slate-500'
            }`}
          >
            {f === 'todos' ? 'Todos' : rotuloStatus(f)}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Nenhum pedido por aqui ainda.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visiveis.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800">
                    Pedido #{p.numero} · {p.clienteNome}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
                    {p.pagamento ? ` · ${p.pagamento}` : ''}
                  </p>
                </div>
                <span className="text-base font-black text-brand-dark shrink-0">
                  {formatarMoeda(p.total)}
                </span>
              </button>

              <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                {STATUS.map((s) => (
                  <button
                    key={s.valor}
                    onClick={() => mudarStatus(p.id, s.valor)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      p.status === s.valor ? s.cor : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {s.rotulo}
                  </button>
                ))}
              </div>

              {expandido === p.id && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
                  <ul className="space-y-1.5">
                    {p.itens.map((item) => (
                      <li key={item.id} className="flex justify-between text-xs">
                        <span className="text-slate-600">
                          {item.categoriaNome}
                          {item.subOpcao ? ` (${item.subOpcao})` : ''}
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatarMoeda(item.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {p.observacoes && (
                    <p className="text-xs text-slate-500 italic">“{p.observacoes}”</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Criado em {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => gerarPdf(p)}
                      className="py-2 rounded-xl border-2 border-brand text-brand-dark text-xs font-black"
                    >
                      📄 Gerar PDF
                    </button>
                    <button
                      onClick={() => enviarWhats(p)}
                      className="py-2 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-sm"
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                  <button
                    onClick={() => excluir(p.id)}
                    className="text-xs font-bold text-red-500"
                  >
                    Excluir pedido
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
