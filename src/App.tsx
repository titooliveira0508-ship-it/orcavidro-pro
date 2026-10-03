import { useEffect, useState } from 'react';
import BottomNav, { Aba } from './components/BottomNav';
import NovoOrcamento from './pages/NovoOrcamento';
import Clientes from './pages/Clientes';
import Pedidos from './pages/Pedidos';
import Empresa from './pages/Empresa';
import { storeCarrinho } from './lib/storage';

export default function App() {
  const [aba, setAba] = useState<Aba>('orcamento');
  const [qtdCarrinho, setQtdCarrinho] = useState(0);

  // Atualiza o contador do carrinho sempre que a aba muda (o carrinho persiste em localStorage)
  useEffect(() => {
    setQtdCarrinho(storeCarrinho.ler().length);
    const id = setInterval(() => setQtdCarrinho(storeCarrinho.ler().length), 1000);
    return () => clearInterval(id);
  }, [aba]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="bg-teal-800 text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-100">
              <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z" />
              <path d="m14.5 12.5 2-2" />
              <path d="m11.5 9.5 2-2" />
              <path d="m8.5 6.5 2-2" />
              <path d="m17.5 15.5 2-2" />
            </svg>
          </span>
          <div>
            <h1 className="text-base font-black leading-tight tracking-tight">OrçaVidro Pro</h1>
            <p className="text-[11px] text-teal-200 leading-tight">Orçamentos para vidraçaria</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4 pb-28">
        {aba === 'orcamento' && <NovoOrcamento />}
        {aba === 'clientes' && <Clientes />}
        {aba === 'pedidos' && <Pedidos />}
        {aba === 'empresa' && <Empresa />}
      </main>

      <BottomNav ativa={aba} aoTrocar={setAba} qtdCarrinho={qtdCarrinho} />
    </div>
  );
}
