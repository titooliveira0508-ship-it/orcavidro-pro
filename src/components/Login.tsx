import { useState } from 'react';

// ─── Trava de acesso do OrçaVidro Pro ─────────────────────────────────────────
// ATENÇÃO — isto é uma TRAVA de acesso, NÃO autenticação segura de backend:
// o app é 100% estático (dados em localStorage) e a senha é lida de uma
// variável de ambiente de build (VITE_ORCAVIDRO_SENHA), ou seja, ela fica
// embutida no JavaScript servido ao navegador. Ela impede o acesso casual
// de quem abre o link, mas não protege contra quem inspeciona o bundle.
// Login real exigiria backend — fora do escopo deste ajuste.
const CHAVE_SESSAO = 'orcavidro:sessao';

export function senhaConfigurada(): boolean {
  const senha = import.meta.env.VITE_ORCAVIDRO_SENHA as string | undefined;
  return typeof senha === 'string' && senha.length > 0;
}

export function sessaoAtiva(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO) === '1';
  } catch {
    return false;
  }
}

export function encerrarSessao(): void {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // sessionStorage indisponível: a sessão morre com a aba mesmo assim
  }
}

interface Props {
  aoEntrar: () => void;
}

export default function Login({ aoEntrar }: Props) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  // Fail closed: sem senha configurada no build, ninguém entra.
  if (!senhaConfigurada()) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6 text-center">
          <img
            src="/icon-512.png"
            alt="OrçaVidro Pro"
            className="w-16 h-16 rounded-2xl shadow-sm bg-white mx-auto"
          />
          <h1 className="text-lg font-black tracking-tight mt-4">OrçaVidro Pro</h1>
          <p className="text-sm text-slate-500 mt-2">
            A senha de acesso não foi configurada. Fale com o responsável pelo app.
          </p>
        </div>
      </div>
    );
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha === (import.meta.env.VITE_ORCAVIDRO_SENHA as string)) {
      try {
        sessionStorage.setItem(CHAVE_SESSAO, '1');
      } catch {
        // sessionStorage indisponível: segue autenticado só nesta renderização
      }
      aoEntrar();
    } else {
      setErro('Senha incorreta. Tente novamente.');
      setSenha('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
        <div className="text-center">
          <img
            src="/icon-512.png"
            alt="OrçaVidro Pro"
            className="w-16 h-16 rounded-2xl shadow-sm bg-white mx-auto"
          />
          <h1 className="text-lg font-black tracking-tight mt-4">OrçaVidro Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Digite a senha para entrar no app</p>
        </div>

        <form onSubmit={entrar} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500">Senha de acesso</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => {
                setSenha(e.target.value);
                setErro('');
              }}
              autoComplete="current-password"
              autoFocus
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          {erro && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-brand-dark active:bg-brand-dark"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
