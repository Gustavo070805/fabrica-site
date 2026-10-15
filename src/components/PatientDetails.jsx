import React from 'react';
import { FileText, Edit2, DollarSign, Printer, Download, User, Trash2 } from 'lucide-react';
import DadosTab from './tabs/DadosTab';
import AvaliacaoTab from './tabs/AvaliacaoTab';
import EvolucaoTab from './tabs/EvolucaoTab';
import FinanceiroTab from './tabs/FinanceiroTab';

const tabs = [
  { id: 'dados', label: 'Dados Clínicos', icon: FileText },
  { id: 'avaliacao', label: 'Avaliações', icon: Edit2 },
  { id: 'evolucao', label: 'Evoluções Diárias', icon: FileText },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
];

const PatientDetails = ({
  patient,
  activeTab,
  setActiveTab,
  onAddAssessment,
  onAddEvolution,
  onUpdateFinancial,
  onUpdatePatient,
  onDeletePatient,
  currentUser = null,
}) => {
  const userRole = currentUser?.role || 'doctor';
  const canViewFinancial = userRole === 'admin' || userRole === 'billing';

  const visibleTabs = tabs
    .filter((t) => {
      if (userRole === 'billing') return t.id === 'dados' || t.id === 'financeiro';
      if (t.id === 'financeiro') return canViewFinancial;
      return true;
    })
    .map((t) => {
      if (userRole === 'billing' && t.id === 'dados') {
        return { ...t, label: 'Dados Cadastrais' };
      }
      return t;
    });

  React.useEffect(() => {
    if (userRole === 'billing' && activeTab !== 'dados' && activeTab !== 'financeiro') {
      setActiveTab('financeiro');
    }
  }, [userRole, activeTab, setActiveTab]);
  if (!patient) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-slate-200/90 text-center text-slate-400 shadow-xs">
        <User size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Nenhum paciente selecionado</p>
        <p className="text-xs text-slate-400 mt-1">
          Selecione um paciente na lista ou no dashboard para visualizar o prontuário.
        </p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(patient, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = (patient.nome || 'paciente').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${safeName}_${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const initials = (patient.nome || 'P')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
      {/* Cabeçalho do Prontuário */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{patient.nome}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ativo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              CPF: {patient.cpf || 'Não informado'} • Tel: {patient.telefone || 'Não informado'}
            </p>
          </div>
        </div>

        {/* Botões de Impressão, Exportação e Exclusão */}
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-semibold text-white transition shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            <span>Exportar JSON</span>
          </button>
          {onDeletePatient && userRole !== 'billing' && (
            <button
              type="button"
              onClick={() => onDeletePatient(patient)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
              title="Excluir prontuário definitivamente"
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex flex-wrap border-b border-slate-100 bg-white no-print">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-initial px-6 py-3.5 text-xs font-semibold border-b-2 transition flex items-center justify-center gap-2 ${
                isActive
                  ? 'border-slate-900 text-slate-900 bg-slate-50/50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      <div>
        {activeTab === 'dados' && (
          <DadosTab
            patient={patient}
            onUpdatePatient={(data) => onUpdatePatient && onUpdatePatient(patient.id, data)}
          />
        )}
        {activeTab === 'avaliacao' && userRole !== 'billing' && (
          <AvaliacaoTab
            patient={patient}
            onAddAssessment={(data) => onAddAssessment && onAddAssessment(patient.id, data)}
          />
        )}
        {activeTab === 'evolucao' && userRole !== 'billing' && (
          <EvolucaoTab
            patient={patient}
            onAddEvolution={(data) => onAddEvolution && onAddEvolution(patient.id, data)}
          />
        )}
        {activeTab === 'financeiro' && canViewFinancial && (
          <FinanceiroTab
            patient={patient}
            onUpdateFinancial={(data) => onUpdateFinancial(patient.id, data)}
          />
        )}
      </div>
    </div>
  );
};

export default PatientDetails;
