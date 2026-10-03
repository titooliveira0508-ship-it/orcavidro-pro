import { Cliente, DadosEmpresa, ItemOrcamento, Pedido } from '../types';

const CHAVES = {
  carrinho: 'orcavidro:carrinho',
  clientes: 'orcavidro:clientes',
  pedidos: 'orcavidro:pedidos',
  seqPedido: 'orcavidro:seq-pedido',
  empresa: 'orcavidro:empresa',
} as const;

function ler<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return padrao;
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

function salvar(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// ─── Carrinho (itens do orçamento em andamento) ──────────────────────────────
export const storeCarrinho = {
  ler: (): ItemOrcamento[] => ler<ItemOrcamento[]>(CHAVES.carrinho, []),
  salvar: (itens: ItemOrcamento[]) => salvar(CHAVES.carrinho, itens),
  limpar: () => salvar(CHAVES.carrinho, []),
};

// ─── Clientes ────────────────────────────────────────────────────────────────
export const storeClientes = {
  ler: (): Cliente[] => ler<Cliente[]>(CHAVES.clientes, []),
  salvar: (clientes: Cliente[]) => salvar(CHAVES.clientes, clientes),
};

// ─── Pedidos ─────────────────────────────────────────────────────────────────
export const storePedidos = {
  ler: (): Pedido[] => ler<Pedido[]>(CHAVES.pedidos, []),
  salvar: (pedidos: Pedido[]) => salvar(CHAVES.pedidos, pedidos),
};

// ─── Dados da empresa (cabeçalho do PDF) ─────────────────────────────────────
export const storeEmpresa = {
  ler: (): DadosEmpresa =>
    ler<DadosEmpresa>(CHAVES.empresa, { nome: 'OrçaVidro Pro', endereco: '', telefone: '' }),
  salvar: (e: DadosEmpresa) => salvar(CHAVES.empresa, e),
};

// ─── Sequência de numeração dos pedidos ──────────────────────────────────────
export function proximoNumeroPedido(): number {
  const atual = ler<number>(CHAVES.seqPedido, 0);
  const proximo = atual + 1;
  salvar(CHAVES.seqPedido, proximo);
  return proximo;
}

export function novoId(prefixo: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
