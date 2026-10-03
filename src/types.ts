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

export type AlturaOpcao = '1800' | '1900' | 'piso-teto';

export interface ItemOrcamento {
  id: string;
  categoriaId: string;
  categoriaNome: string;
  subOpcao?: string; // rótulo da sub-opção escolhida (ex.: "3 folhas")
  larguraMm?: number;
  alturaMm?: number;
  alturaOpcao: AlturaOpcao;
  corVidro: string;
  corKit: string;
  corDobradica?: string;
  modeloDobradica?: string;
  pelicula?: string; // ex.: "Privativa", "Segurança" ou ""
  valor: number; // valor em R$ digitado pelo usuário
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
  total: number;
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
  'Bronze',
  'Azul',
  'Espelhado',
] as const;

export const CORES_KIT = [
  'Cromado',
  'Preto',
  'Branco',
  'Dourado',
  'Rose Gold',
  'Inox Escovado',
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
