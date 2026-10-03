import { useRef, useState } from 'react';
import { storeEmpresa } from '../lib/storage';

export default function Empresa() {
  const atual = storeEmpresa.ler();
  const [nome, setNome] = useState(atual.nome);
  const [endereco, setEndereco] = useState(atual.endereco);
  const [telefone, setTelefone] = useState(atual.telefone);
  const [logo, setLogo] = useState(atual.logo || '');
  const [salvo, setSalvo] = useState(false);
  const inputLogo = useRef<HTMLInputElement>(null);

  function escolherLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    if (!arq) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      setLogo(String(leitor.result || ''));
    };
    leitor.readAsDataURL(arq);
  }

  function removerLogo() {
    setLogo('');
    if (inputLogo.current) inputLogo.current.value = '';
  }

  function salvar() {
    storeEmpresa.salvar({
      nome: nome.trim() || 'OrçaVidro Pro',
      endereco: endereco.trim(),
      telefone: telefone.trim(),
      logo: logo || undefined,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  const campo =
    'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black text-slate-900">Dados da empresa</h1>
      <p className="text-sm text-slate-500 -mt-2">
        Essas informações aparecem no cabeçalho do PDF do orçamento.
      </p>

      {salvo && (
        <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-bold shadow-md">
          ✅ Dados salvos!
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
            Logo da empresa
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Aparece no cabeçalho do PDF. Se não enviar, usa a logo padrão.
          </p>
          {logo ? (
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Logo da empresa"
                className="h-16 w-auto rounded-lg border border-slate-200 bg-white object-contain"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => inputLogo.current?.click()}
                  className="px-3 py-1.5 rounded-xl border-2 border-brand text-brand-dark text-xs font-black"
                >
                  Trocar logo
                </button>
                <button
                  onClick={removerLogo}
                  className="text-xs font-bold text-red-500"
                >
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => inputLogo.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-bold"
            >
              📷 Escolher logo
            </button>
          )}
          <input
            ref={inputLogo}
            type="file"
            accept="image/*"
            onChange={escolherLogo}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
            Nome da empresa
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="OrçaVidro Pro"
            className={campo}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
            Endereço
          </label>
          <textarea
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, número, bairro, cidade/UF"
            rows={2}
            className={campo}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
            Telefone / WhatsApp
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(21) 99999-9999"
            inputMode="tel"
            className={campo}
          />
        </div>

        <button
          onClick={salvar}
          className="w-full py-3 rounded-2xl bg-brand text-white font-black text-base shadow-md active:scale-[0.99] transition-transform"
        >
          Salvar dados
        </button>
      </div>
    </div>
  );
}
