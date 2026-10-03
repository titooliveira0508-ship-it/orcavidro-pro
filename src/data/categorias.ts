import { Categoria } from '../types';

// As 10 categorias de produtos do OrçaVidro Pro.
// Ilustrações profissionais em public/ilustracoes/ (o id da categoria = nome do arquivo).
export const CATEGORIAS: Categoria[] = [
  {
    id: 'box-frontal',
    nome: 'Box Frontal',
    icone: '🚿',
    ilustracao: '/ilustracoes/box-frontal.png',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '3-folhas', rotulo: '3 folhas' },
      { id: '4-folhas', rotulo: '4 folhas' },
    ],
  },
  {
    id: 'box-abrir',
    nome: 'Box de Abrir',
    icone: '🚪',
    ilustracao: '/ilustracoes/box-abrir.png',
    temDobradiça: true,
  },
  {
    id: 'box-canto',
    nome: 'Box de Canto',
    icone: '📐',
    ilustracao: '/ilustracoes/box-canto.png',
  },
  {
    id: 'janelas',
    nome: 'Janelas',
    icone: '🪟',
    ilustracao: '/ilustracoes/janela.png',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '4-folhas', rotulo: '4 folhas' },
    ],
  },
  {
    id: 'porta-correr',
    nome: 'Porta de Correr',
    icone: '↔️',
    ilustracao: '/ilustracoes/porta-correr.png',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '4-folhas', rotulo: '4 folhas' },
    ],
  },
  {
    id: 'porta-pivotante',
    nome: 'Porta Pivotante',
    icone: '🔄',
    ilustracao: '/ilustracoes/porta-pivotante.png',
  },
  {
    id: 'espelho',
    nome: 'Espelho',
    icone: '🪞',
    ilustracao: '/ilustracoes/espelho.png',
  },
  {
    id: 'armario-pia',
    nome: 'Armário de Pia',
    icone: '🗄️',
    ilustracao: '/ilustracoes/armario-pia.png',
  },
  {
    id: 'guarda-corpo',
    nome: 'Guarda-Corpo',
    icone: '🧱',
    ilustracao: '/ilustracoes/guarda-corpo.png',
    subOpcoes: [
      { id: 'torre', rotulo: 'Com torre' },
      { id: 'esquadrias', rotulo: 'Com esquadrias' },
    ],
  },
  {
    id: 'cortina-vidro',
    nome: 'Cortina de Vidro',
    icone: '🌊',
    ilustracao: '/ilustracoes/cortina-vidro.png',
  },
  {
    id: 'bascula',
    nome: 'Báscula',
    icone: '🪟',
    ilustracao: '/ilustracoes/bascula.png',
  },
];

export function getCategoria(id: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
