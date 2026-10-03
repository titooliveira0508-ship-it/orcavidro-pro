// ─── OrçaVidro Pro · Tipos ────────────────────────────────────────────────

export interface SubOpcao {
  id: string;
  rotulo: string;
}

export interface Categoria {
  id: string;
  nome: string;
  icone: string; // emoji legado (mantido por compatibilidade, não exibido)
  ilustracao: string; // caminho da ilustração profissional, ex.: /ilustracoes/box-frontal.png
  subOpcoes?: SubOpcao[];
  temDobradiça?: boolean; // exibe cor/modelo de dobradiça (box de abrir)
  medidaLargura?: boolean;
  medidaAltura?: boolean;
}

export type AlturaOpcao = '1800' | '1900' | '2100' | 'piso-teto';

export const CATEGORIAS_BOX = ['box-frontal', 'box-abrir', 'box-canto', 'box-flex'];
export const CATEGORIAS_PORTA = ['porta-correr', 'porta-pivotante'];

export interface ItemOrcamento {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  subOpcao?: string; // rótulo da sub-opção escolhida (ex.: "3 folhas")
  larguraMm?: number;
  largura2Mm?: number; // segunda largura (ex.: box de canto 900x900)
  alturaMm?: number;
  alturaOpcao: AlturaOpcao;
  corVidro: string;
  corKit: string;
  corDobradica?: string;
  modeloDobradica?: string;
  pelicula?: string; // ex.: "Privativa", "Segurança" ou ""
  tipoBorda?: string; // espelho: "Lapidado" ou "Bisotado"
  valor: number; // valor unitário em R$ digitado pelo usuário
  quantidade: number; // quantidade do item (padrão 1)
  observacao?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  criadoEm: number;
}

export interface DadosEmpresa {
  nome: string;
  endereco: string;
  telefone: string;
}

export type StatusPedido = 'pendente' | 'aprovado' | 'instalado';

export interface Pedido {
  id: string;
  numero: number;
  clienteId?: string;
  clienteNome: string;
  itens: ItemOrcamento[];
  subtotal: number; // soma de (valor unitário × quantidade) dos itens
  desconto: number; // desconto em R$ aplicado no fechamento
  total: number; // subtotal − desconto
  status: StatusPedido;
  pagamento?: string; // ex.: "Pix", "Cartão"
  observacoes?: string;
  validadeDias?: number;
  criadoEm: number;
}

export const CORES_VIDRO = [
  'Incolor',
  'Fumê',
  'Verde',
] as const;

export const CORES_ESPELHO = [
  'Prata',
  'Bronze',
  'Fumê',
] as const;

export const TIPOS_BORDA_ESPELHO = [
  { id: 'lapidado', rotulo: 'Lapidado' },
  { id: 'bisotado', rotulo: 'Bisotado' },
] as const;

/** Preço do m² do espelho: prata lapidado 450, prata bisotado 650, bronze/fumê 950. */
export function precoM2Espelho(cor: string, tipoBorda: string): number {
  if (cor === 'Bronze' || cor === 'Fumê') return 950;
  return tipoBorda === 'Bisotado' ? 650 : 450;
}

export const CORES_KIT = [
  'Branco',
  'Preto',
  'Natural fosco',
  'Cromado',
  'Dourado',
] as const;

/** Cores de kit por categoria: box flex não tem Natural fosco. */
export function coresKitParaCategoria(categoriaId: string): readonly string[] {
  if (categoriaId === 'box-flex') {
    return ['Branco', 'Preto', 'Cromado', 'Dourado'] as const;
  }
  return CORES_KIT;
}

export const MODELOS_DOBRADICA = [
  'GV48',
  'Padrão 90°',
  'Padrão 135°',
  'Com mola',
] as const;

export const PELICULAS = ['', 'Privativa', 'Segurança'] as const;

export const ALTURAS: { valor: AlturaOpcao; rotulo: string }[] = [
  { valor: '1800', rotulo: '1800 mm' },
  { valor: '1900', rotulo: '1900 mm' },
  { valor: 'piso-teto', rotulo: 'Piso-teto' },
];

/** Alturas disponíveis por categoria: só box tem piso-teto; portas usam 2100 padrão. */
export function alturasParaCategoria(categoriaId: string): { valor: AlturaOpcao; rotulo: string }[] {
  if (CATEGORIAS_PORTA.includes(categoriaId)) {
    return [{ valor: '2100', rotulo: '2100 (padrão)' }];
  }
  if (CATEGORIAS_BOX.includes(categoriaId)) {
    return ALTURAS;
  }
  if (['bascula', 'armario-pia', 'guarda-corpo', 'espelho'].includes(categoriaId)) {
    return []; // engenharia: só medida personalizada
  }
  return [
    { valor: '1800', rotulo: '1800 mm' },
    { valor: '1900', rotulo: '1900 mm' },
  ];
}
