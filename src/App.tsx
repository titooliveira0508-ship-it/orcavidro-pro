import { useEffect, useState } from 'react';
import BottomNav, { Aba } from './components/BottomNav';
import Login, { encerrarSessao, sessaoAtiva } from './components/Login';
import NovoOrcamento from './pages/NovoOrcamento';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Empresa from './pages/Empresa';
import { storeCarrinho } from './lib/storage';

export default function App() {
  const [aba, setAba] = useState<Aba>('orcamento');
  const [qtdCarrinho, setQtdCarrinho] = useState(0);
  const [clienteParaOrcamento, setClienteParaOrcamento] = useState<string | null>(null);
  // Trava de acesso: a sessão vive em sessionStorage e morre ao fechar a aba.
  const [autenticado, setAutenticado] = useState(() => sessaoAtiva());

  // Atualiza o contador do carrinho sempre que a aba muda (o carrinho persiste em localStorage)
  useEffect(() => {
    setQtdCarrinho(storeCarrinho.ler().length);
    const id = setInterval(() => setQtdCarrinho(storeCarrinho.ler().length), 1000);
    return () => clearInterval(id);
  }, [aba]);

  if (!autenticado) {
    return <Login aoEntrar={() => setAutenticado(true)} />;
  }

  function sair() {
    encerrarSessao();
    setAutenticado(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="bg-navy text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2.5">
          <img
            src="/icon-512.png"
            alt="OrçaVidro Pro"
            className="w-9 h-9 rounded-xl shadow-sm bg-white"
          />
          <div className="flex-1">
            <h1 className="text-base font-black leading-tight tracking-tight">OrçaVidro Pro</h1>
            <p className="text-[11px] text-sky-200 leading-tight">Orçamentos para vidraçaria</p>
          </div>
          <button
            type="button"
            onClick={sair}
            className="rounded-lg border border-white/30 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4 pb-28">
        {aba === 'orcamento' && (
          <NovoOrcamento
            clienteInicialId={clienteParaOrcamento}
            aoUsarClienteInicial={() => setClienteParaOrcamento(null)}
          />
        )}
        {aba === 'clientes' && (
          <Clientes
            aoNovoOrcamento={(id) => {
              setClienteParaOrcamento(id);
              setAba('orcamento');
            }}
          />
        )}
        {aba === 'pedidos' && <Pedidos />}
        {aba === 'empresa' && <Empresa />}
      </main>

      <BottomNav ativa={aba} aoTrocar={setAba} qtdCarrinho={qtdCarrinho} />
    </div>
  );
}
