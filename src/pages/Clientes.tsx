import { useEffect, useState } from 'react';
import { Cliente } from '../types';
import { novoId, storeClientes } from '../lib/storage';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() => storeClientes.ler());
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');

  useEffect(() => {
    storeClientes.salvar(clientes);
  }, [clientes]);

  function abrirNovo() {
    setEditando(null);
    setNome('');
    setTelefone('');
    setEndereco('');
    setFormAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c);
    setNome(c.nome);
    setTelefone(c.telefone);
    setEndereco(c.endereco);
    setFormAberto(true);
  }

  function salvar() {
    if (!nome.trim()) return;
    if (editando) {
      setClientes((prev) =>
        prev.map((c) =>
          c.id === editando.id
            ? { ...c, nome: nome.trim(), telefone: telefone.trim(), endereco: endereco.trim() }
            : c
        )
      );
    } else {
      const novo: Cliente = {
        id: novoId('cli'),
        nome: nome.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
        criadoEm: Date.now(),
      };
      setClientes((prev) => [novo, ...prev]);
    }
    setFormAberto(false);
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir este cliente?')) return;
    setClientes((prev) => prev.filter((c) => c.id !== id));
  }

  const campo =
    'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900">Clientes</h1>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 rounded-full bg-teal-600 text-white text-sm font-bold shadow-md"
        >
          + Novo
        </button>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Nenhum cliente cadastrado ainda.
        </p>
      ) : (
        <div className="space-y-2.5">
          {clientes.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-800">{c.nome}</p>
              {c.telefone && <p className="text-xs text-slate-500 mt-0.5">📱 {c.telefone}</p>}
              {c.endereco && <p className="text-xs text-slate-500 mt-0.5">📍 {c.endereco}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => abrirEdicao(c)}
                  className="text-xs font-bold text-teal-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(c.id)}
                  className="text-xs font-bold text-red-500"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formAberto && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3">
            <h2 className="text-lg font-black text-slate-900">
              {editando ? 'Editar cliente' : 'Novo cliente'}
            </h2>
            <input
              placeholder="Nome *"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
            />
            <input
              placeholder="Telefone / WhatsApp"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className={campo}
              inputMode="tel"
            />
            <input
              placeholder="Endereço"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className={campo}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setFormAberto(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-600 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!nome.trim()}
                className="flex-1 py-3 rounded-2xl bg-teal-600 text-white font-black shadow-md disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
