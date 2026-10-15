import React from 'react';
import { LogOut, User } from 'lucide-react';

const Header = ({ syncStatus = 'synced', user = null, onLogout = null }) => {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <header className="bg-blue-600 text-white p-4 shadow-lg no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">📋 ViguMed</h1>
            <p className="text-blue-100 text-sm mt-0.5">Prontuário Médico & Gestão Clínica</p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Status do Upstash Redis */}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-700/60 text-blue-100 border border-blue-400/40">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Nuvem Conectada (Upstash)
              </span>
            )}
            {syncStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/60 text-yellow-100 border border-yellow-400/40">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-spin"></span>
                Salvando na nuvem...
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-700/60 text-gray-200 border border-gray-500/40">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Modo Local (Offline)
              </span>
            )}

            {/* Informações do Usuário e Logout */}
            {user && (
              <div className="flex items-center gap-2.5 pl-2 border-l border-blue-400/40">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-none flex items-center justify-end gap-1">
                    <User size={13} />
                    {user.name}
                  </p>
                  <p className="text-[10px] text-blue-200 mt-0.5">{user.email}</p>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-700 hover:bg-red-600 active:bg-red-700 text-white rounded-lg border border-blue-400/30 transition shadow-sm"
                    title="Encerrar sessão"
                  >
                    <LogOut size={14} />
                    <span>Sair</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
