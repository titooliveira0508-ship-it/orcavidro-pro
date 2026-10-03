import { Categoria } from '../types';

// As 10 categorias de produtos do OrçaVidro Pro.
// (Ilustrações reais entram numa etapa futura; por ora usamos emoji provisório.)
export const CATEGORIAS: Categoria[] = [
  {
    id: 'box-frontal',
    nome: 'Box Frontal',
    icone: '🚿',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '3-folhas', rotulo: '3 folhas' },
    ],
  },
  {
    id: 'box-abrir',
    nome: 'Box de Abrir',
    icone: '🚪',
    temDobradiça: true,
  },
  {
    id: 'box-canto',
    nome: 'Box de Canto',
    icone: '📐',
  },
  {
    id: 'janelas',
    nome: 'Janelas',
    icone: '🪟',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '4-folhas', rotulo: '4 folhas' },
    ],
  },
  {
    id: 'porta-correr',
    nome: 'Porta de Correr',
    icone: '↔️',
    subOpcoes: [
      { id: '2-folhas', rotulo: '2 folhas' },
      { id: '4-folhas', rotulo: '4 folhas' },
    ],
  },
  {
    id: 'porta-pivotante',
    nome: 'Porta Pivotante',
    icone: '🔄',
  },
  {
    id: 'espelho',
    nome: 'Espelho',
    icone: '🪞',
  },
  {
    id: 'armario-pia',
    nome: 'Armário de Pia',
    icone: '🗄️',
  },
  {
    id: 'guarda-corpo',
    nome: 'Guarda-Corpo',
    icone: '🧱',
    subOpcoes: [
      { id: 'torre', rotulo: 'Com torre' },
      { id: 'esquadrias', rotulo: 'Com esquadrias' },
    ],
  },
  {
    id: 'cortina-vidro',
    nome: 'Cortina de Vidro',
    icone: '🌊',
  },
];

export function getCategoria(id: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.id === id);
}
