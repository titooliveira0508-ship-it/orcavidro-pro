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

export const CORES_KIT = [
  'Branco',
  'Preto',
  'Natural fosco',
  'Cromado',
  'Dourado',
] as const;

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
  if (categoriaId === 'bascula' || categoriaId === 'armario-pia') {
    return []; // engenharia: só medida personalizada
  }
  return [
    { valor: '1800', rotulo: '1800 mm' },
    { valor: '1900', rotulo: '1900 mm' },
  ];
}
