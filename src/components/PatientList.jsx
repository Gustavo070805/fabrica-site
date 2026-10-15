import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  FileText,
  Phone,
  Trash2,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Users
} from 'lucide-react';

const PatientList = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onDeletePatient,
  onOpenNewPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'with-evolution' | 'without-evolution'

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (p.nome && p.nome.toLowerCase().includes(q)) ||
      (p.cpf && p.cpf.includes(q)) ||
      (p.telefone && p.telefone.includes(q)) ||
      (p.diagnostico && p.diagnostico.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    const evolucoesCount = p.evolucoes ? p.evolucoes.length : 0;
    if (filterMode === 'with-evolution') return evolucoesCount > 0;
    if (filterMode === 'without-evolution') return evolucoesCount === 0;

    return true;
  });

  const countWithEvolution = patients.filter((p) => p.evolucoes && p.evolucoes.length > 0).length;
  const countWithoutEvolution = patients.length - countWithEvolution;

  return (
    <div className="h-full flex flex-col overflow-hidden no-print">
      {/* Topo da lista com busca e botão de novo paciente (FIXO) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 sm:mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pacientes & Prontuários
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diretório clínico unificado: cadastro, diagnósticos, histórico de consultas e prontuários
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenNewPatient}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <UserPlus size={14} className="text-emerald-400" />
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca e Filtros (FIXA) */}
      <div className="shrink-0 mb-3 sm:mb-4 bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por paciente, CPF, telefone ou diagnóstico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({patients.length})
          </button>
          <button
            onClick={() => setFilterMode('with-evolution')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterMode === 'with-evolution'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Com Evoluções ({countWithEvolution})
          </button>
          <button
            onClick={() => setFilterMode('without-evolution')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterMode === 'without-evolution'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sem Evolução ({countWithoutEvolution})
          </button>
        </div>
      </div>

      {/* Área Exclusiva de Rolagem dos Pacientes */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <Users size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum paciente encontrado</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Verifique os termos de busca ou utilize o botão acima para cadastrar um novo paciente.
            </p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const initials = (patient.nome || 'P')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            const evolucoesCount = patient.evolucoes?.length || 0;
            const avaliacoesCount = patient.avaliacoes?.length || 0;
            const lastEvolution = evolucoesCount > 0 ? patient.evolucoes[evolucoesCount - 1] : null;

            return (
              <div
                key={patient.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between group"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs text-slate-900 leading-tight">
                          {patient.nome}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          CPF: {patient.cpf || 'Não informado'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Ativo
                    </span>
                  </div>

                  {/* Quadro Clínico / Diagnóstico */}
                  <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 mb-3.5 space-y-1">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Diagnóstico de Entrada
                    </span>
                    <p className="text-xs font-medium text-slate-700 line-clamp-2">
                      {patient.diagnostico || 'Nenhum diagnóstico preliminar informado.'}
                    </p>
                  </div>

                  {/* Contadores Clínicos */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-center">
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                      <span className="block text-base font-bold text-slate-900">{evolucoesCount}</span>
                      <span className="text-[10px] font-medium text-slate-500">Evoluções</span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                      <span className="block text-base font-bold text-slate-900">{avaliacoesCount}</span>
                      <span className="text-[10px] font-medium text-slate-500">Avaliações</span>
                    </div>
                  </div>

                  {/* Telefone & Última Consulta */}
                  <div className="space-y-1 text-[11px] text-slate-500 mb-4 px-1">
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone size={12} className="text-emerald-600 shrink-0" />
                      <span>{patient.telefone || 'Sem telefone'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span>
                        Último registro:{' '}
                        <strong className="text-slate-700 font-semibold">
                          {lastEvolution?.data || 'Sem consultas registradas'}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Rodapé do Card com Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectPatient(patient.id)}
                    className="flex-1 py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-2 group-hover:shadow-xs"
                  >
                    <FileText size={14} className="text-emerald-400" />
                    <span>Abrir Prontuário</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeletePatient(patient)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Excluir paciente"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
};

export default PatientList;
