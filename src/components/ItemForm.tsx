import { useState } from 'react';
import {
  ALTURAS,
  AlturaOpcao,
  Categoria,
  CORES_KIT,
  CORES_VIDRO,
  ItemOrcamento,
  MODELOS_DOBRADICA,
  PELICULAS,
} from '../types';
import { novoId } from '../lib/storage';

interface Props {
  categoria: Categoria;
  aoAdicionar: (item: ItemOrcamento) => void;
  aoVoltar: () => void;
}

function parseNumero(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

export default function ItemForm({ categoria, aoAdicionar, aoVoltar }: Props) {
  const [subOpcao, setSubOpcao] = useState(categoria.subOpcoes?.[0]?.id ?? '');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [alturaOpcao, setAlturaOpcao] = useState<AlturaOpcao>('1900');
  const [corVidro, setCorVidro] = useState<string>(CORES_VIDRO[0]);
  const [corKit, setCorKit] = useState<string>(CORES_KIT[0]);
  const [corDobradica, setCorDobradica] = useState<string>(CORES_KIT[0]);
  const [modeloDobradica, setModeloDobradica] = useState<string>(MODELOS_DOBRADICA[0]);
  const [pelicula, setPelicula] = useState<string>('');
  const [valorTexto, setValorTexto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');

  const subOpcaoRotulo = categoria.subOpcoes?.find((s) => s.id === subOpcao)?.rotulo;

  function adicionar() {
    const valor = parseNumero(valorTexto);
    if (valor <= 0) {
      setErro('Informe o valor do item em R$.');
      return;
    }
    const item: ItemOrcamento = {
      id: novoId('item'),
      categoriaId: categoria.id,
      categoriaNome: categoria.nome,
      subOpcao: subOpcaoRotulo,
      larguraMm: largura ? parseNumero(largura) : undefined,
      alturaMm: alturaOpcao === 'piso-teto' ? undefined : altura ? parseNumero(altura) : undefined,
      alturaOpcao,
      corVidro,
      corKit,
      corDobradica: categoria.temDobradiça ? corDobradica : undefined,
      modeloDobradica: categoria.temDobradiça ? modeloDobradica : undefined,
      pelicula: pelicula || undefined,
      valor,
      observacao: observacao.trim() || undefined,
    };
    aoAdicionar(item);
  }

  const campo =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand';
  const rotulo = 'block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1';

  return (
    <div className="pb-4">
      <button onClick={aoVoltar} className="text-sm font-semibold text-brand-dark mb-3">
        ‹ Voltar às categorias
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <img
            src={categoria.ilustracao}
            alt={categoria.nome}
            className="w-[120px] h-[120px] shrink-0 rounded-2xl object-cover border border-slate-200 bg-slate-50 shadow-sm"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900 leading-tight">{categoria.nome}</h2>
            {categoria.subOpcoes && (
              <p className="text-xs text-slate-500 mt-1">
                {categoria.subOpcoes.map((s) => s.rotulo).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {categoria.subOpcoes && (
          <div>
            <label className={rotulo}>Modelo</label>
            <div className="flex gap-2 flex-wrap">
              {categoria.subOpcoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubOpcao(s.id)}
                  className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    subOpcao === s.id
                      ? 'bg-brand border-brand text-white'
                      : 'bg-white border-slate-300 text-slate-600'
                  }`}
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Largura (mm)</label>
            <input
              inputMode="numeric"
              placeholder="Ex.: 1200"
              value={largura}
              onChange={(e) => setLargura(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <label className={rotulo}>Altura (mm)</label>
            <input
              inputMode="numeric"
              placeholder="Ex.: 1900"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              disabled={alturaOpcao === 'piso-teto'}
              className={`${campo} disabled:bg-slate-100 disabled:text-slate-400`}
            />
          </div>
        </div>

        <div>
          <label className={rotulo}>Altura padrão</label>
          <div className="flex gap-2 flex-wrap">
            {ALTURAS.map((a) => (
              <button
                key={a.valor}
                onClick={() => setAlturaOpcao(a.valor)}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  alturaOpcao === a.valor
                    ? 'bg-brand border-brand text-white'
                    : 'bg-white border-slate-300 text-slate-600'
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo}>Cor do vidro</label>
            <select value={corVidro} onChange={(e) => setCorVidro(e.target.value)} className={campo}>
              {CORES_VIDRO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo}>Cor do kit</label>
            <select value={corKit} onChange={(e) => setCorKit(e.target.value)} className={campo}>
              {CORES_KIT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoria.temDobradiça && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div>
              <label className={rotulo}>Cor da dobradiça</label>
              <select value={corDobradica} onChange={(e) => setCorDobradica(e.target.value)} className={campo}>
                {CORES_KIT.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo}>Modelo da dobradiça</label>
              <select
                value={modeloDobradica}
                onChange={(e) => setModeloDobradica(e.target.value)}
                className={campo}
              >
                {MODELOS_DOBRADICA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className={rotulo}>Película (opcional)</label>
          <select value={pelicula} onChange={(e) => setPelicula(e.target.value)} className={campo}>
            <option value="">Sem película</option>
            {PELICULAS.filter(Boolean).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={rotulo}>Valor do item (R$)</label>
          <input
            inputMode="decimal"
            placeholder="Ex.: 850,00"
            value={valorTexto}
            onChange={(e) => {
              setValorTexto(e.target.value);
              setErro('');
            }}
            className={`${campo} text-lg font-bold`}
          />
          {erro && <p className="text-xs text-red-600 font-semibold mt-1">{erro}</p>}
        </div>

        <div>
          <label className={rotulo}>Observação (opcional)</label>
          <input
            placeholder="Ex.: prazo de entrega, detalhes…"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className={campo}
          />
        </div>

        <button
          onClick={adicionar}
          className="w-full py-3 rounded-2xl bg-brand text-white font-black text-base shadow-md active:scale-[0.99] transition-transform"
        >
          Adicionar ao orçamento
        </button>
      </div>
    </div>
  );
}
