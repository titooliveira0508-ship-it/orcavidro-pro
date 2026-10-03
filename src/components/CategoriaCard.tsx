import { Categoria } from '../types';

interface Props {
  categoria: Categoria;
  aoClicar: () => void;
}

export default function CategoriaCard({ categoria, aoClicar }: Props) {
  return (
    <button
      onClick={aoClicar}
      className="flex items-center gap-3 w-full bg-white rounded-2xl border border-slate-200 p-3.5 text-left shadow-sm active:scale-[0.99] active:border-teal-400 transition-all"
    >
      <span className="w-11 h-11 shrink-0 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl">
        {categoria.icone}
      </span>
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
