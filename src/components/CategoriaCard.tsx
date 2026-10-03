import { Categoria } from '../types';

interface Props {
  categoria: Categoria;
  aoClicar: () => void;
}

export default function CategoriaCard({ categoria, aoClicar }: Props) {
  return (
    <button
      onClick={aoClicar}
      className="flex items-center gap-3 w-full bg-white rounded-2xl border border-slate-200 p-3.5 text-left shadow-sm active:scale-[0.99] active:border-brand transition-all"
    >
      <img
        src={categoria.ilustracao}
        alt={categoria.nome}
        className="w-14 h-14 shrink-0 rounded-xl object-cover border border-slate-200 bg-slate-50"
        loading="lazy"
      />
      <span className="flex-1">
        <span className="block text-sm font-bold text-slate-800">{categoria.nome}</span>
        {categoria.subOpcoes && (
          <span className="block text-xs text-slate-500">
            {categoria.subOpcoes.map((s) => s.rotulo).join(' · ')}
          </span>
        )}
      </span>
      <span className="text-slate-300 text-lg">›</span>
    </button>
  );
}
