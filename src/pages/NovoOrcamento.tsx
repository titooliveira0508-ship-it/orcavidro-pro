import { useEffect, useState } from 'react';
import { CATEGORIAS } from '../data/categorias';
import { Cliente, ItemOrcamento, Pedido } from '../types';
import {
  formatarMoeda,
  novoId,
  proximoNumeroPedido,
  storeCarrinho,
  storeClientes,
  storeEmpresa,
  storePedidos,
  subtotalItens,
  totalPedido,
} from '../lib/storage';
import {
  gerarPdfOrcamento,
  linkWhatsApp,
  mensagemOrcamento,
  soDigitos,
} from '../lib/pdf';
import CategoriaCard from '../components/CategoriaCard';
import ItemForm from '../components/ItemForm';
import Carrinho from '../components/Carrinho';
import { getCategoria } from '../data/categorias';

export default function NovoOrcamento() {
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemOrcamento[]>(() => storeCarrinho.ler());
  const [clientes] = useState<Cliente[]>(() => storeClientes.ler());
  const [fechando, setFechando] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [validadeDias, setValidadeDias] = useState(15);
  const [desconto, setDesconto] = useState(0);
  const [pedidoFeito, setPedidoFeito] = useState<number | null>(null);

  useEffect(() => {
    storeCarrinho.salvar(itens);
  }, [itens]);

  const categoria = categoriaId ? getCategoria(categoriaId) : undefined;
  const subtotal = subtotalItens(itens);
  const total = totalPedido(subtotal, desconto);

  function adicionarItem(item: ItemOrcamento) {
    setItens((prev) => [...prev, item]);
    setCategoriaId(null);
  }

  function alterarQuantidade(id: string, quantidade: number) {
    setItens((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, quantidade) } : i))
    );
  }

  function fecharPedido() {
    const cliente = clientes.find((c) => c.id === clienteId);
    const numero = proximoNumeroPedido();
    const pedido: Pedido = {
      id: novoId('ped'),
      numero,
      clienteId: cliente?.id,
      clienteNome: cliente?.nome ?? 'Cliente avulso',
      itens,
      subtotal,
      desconto,
      total,
      status: 'pendente',
      pagamento: pagamento || undefined,
      observacoes: observacoes.trim() || undefined,
      validadeDias: validadeDias > 0 ? validadeDias : 15,
      criadoEm: Date.now(),
    };
    const atuais = storePedidos.ler();
    storePedidos.salvar([pedido, ...atuais]);
    setItens([]);
    storeCarrinho.limpar();
    setFechando(false);
    setClienteId('');
    setPagamento('');
    setObservacoes('');
    setValidadeDias(15);
    setDesconto(0);
    setPedidoFeito(numero);
    setTimeout(() => setPedidoFeito(null), 4000);
  }

  function dadosPdfPrevia() {
    const cliente = clientes.find((c) => c.id === clienteId);
    return {
      empresa: storeEmpresa.ler(),
      numero: undefined as number | undefined,
      clienteNome: cliente?.nome ?? 'Cliente avulso',
      clienteTelefone: cliente?.telefone || undefined,
      clienteEndereco: cliente?.endereco || undefined,
      itens,
      subtotal,
      desconto,
      total,
      validadeDias: validadeDias > 0 ? validadeDias : 15,
      observacoes: observacoes.trim() || undefined,
      pagamento: pagamento || undefined,
      dataEmissao: new Date(),
    };
  }

  async function gerarPdfPrevia() {
    if (itens.length === 0) return;
    await gerarPdfOrcamento(dadosPdfPrevia());
  }

  async function enviarWhatsPrevia() {
    const cliente = clientes.find((c) => c.id === clienteId);
    const fone = cliente?.telefone ? soDigitos(cliente.telefone) : '';
    if (!fone) {
      alert('Selecione um cliente com telefone para enviar via WhatsApp.');
      return;
    }
    await gerarPdfOrcamento(dadosPdfPrevia());
    const msg = mensagemOrcamento(cliente!.nome, undefined, total);
    window.open(linkWhatsApp(fone, msg), '_blank');
  }

  return (
    <div className="space-y-4">
      {pedidoFeito !== null && (
        <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-bold shadow-md flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Pedido #{pedidoFeito} criado! Veja na aba Pedidos.
        </div>
      )}

      <h1 className="text-xl font-black text-slate-900">Novo orçamento</h1>

      {categoria ? (
        <ItemForm
          categoria={categoria}
          aoAdicionar={adicionarItem}
          aoVoltar={() => setCategoriaId(null)}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 -mt-2">
            Escolha a categoria do item para começar:
          </p>
          <div className="space-y-2.5">
            {CATEGORIAS.map((c) => (
              <CategoriaCard key={c.id} categoria={c} aoClicar={() => setCategoriaId(c.id)} />
            ))}
          </div>
        </>
      )}

      <Carrinho
        itens={itens}
        desconto={desconto}
        aoAlterarDesconto={setDesconto}
        aoAlterarQuantidade={alterarQuantidade}
        aoRemover={(id) => setItens((prev) => prev.filter((i) => i.id !== id))}
        aoLimpar={() => {
          setItens([]);
          storeCarrinho.limpar();
        }}
        aoFecharPedido={() => setFechando(true)}
      />

      {itens.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap">
              Validade (dias)
            </label>
            <input
              type="number"
              min={1}
              value={validadeDias}
              onChange={(e) => setValidadeDias(parseInt(e.target.value, 10) || 15)}
              className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm text-center"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={gerarPdfPrevia}
              className="py-2.5 rounded-2xl border-2 border-brand text-brand-dark font-black text-sm active:scale-[0.99] transition-transform"
            >
              📄 Gerar PDF
            </button>
            <button
              onClick={enviarWhatsPrevia}
              className="py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-md active:scale-[0.99] transition-transform"
            >
              💬 WhatsApp
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            O PDF baixa no aparelho — no WhatsApp, anexe o arquivo na conversa.
          </p>
        </div>
      )}

      {fechando && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-black text-slate-900">Fechar pedido</h2>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-800">{formatarMoeda(subtotal)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Desconto</span>
                  <span className="font-bold text-emerald-600">− {formatarMoeda(desconto)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-sm font-black text-slate-800">Total</span>
                <span className="text-lg font-black text-brand-dark">{formatarMoeda(total)}</span>
              </div>
              <p className="text-xs text-slate-400">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Cliente
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">Cliente avulso</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Pagamento
              </label>
              <select
                value={pagamento}
                onChange={(e) => setPagamento(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">A combinar</option>
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Observações
              </label>
              <input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Prazo de entrega, instalação…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Validade do orçamento (dias)
              </label>
              <input
                type="number"
                min={1}
                value={validadeDias}
                onChange={(e) => setValidadeDias(parseInt(e.target.value, 10) || 15)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFechando(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-600 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={fecharPedido}
                className="flex-1 py-3 rounded-2xl bg-brand text-white font-black shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
