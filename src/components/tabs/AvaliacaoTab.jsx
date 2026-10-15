import React, { useState } from 'react';
import { Plus, ClipboardList, Calendar, Check, X, ArrowRight, UserCheck } from 'lucide-react';

const initialAssessmentData = {
  nome: '',
  data_nascimento: '',
  diagnostico: '',
  encaminhamento: '',
  acompanhamento: '',
};

const AvaliacaoTab = ({ patient, onAddAssessment }) => {
  const [newAssessment, setNewAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState(initialAssessmentData);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assessmentData.nome.trim()) {
      alert('Por favor, informe ao menos o nome para a avaliação.');
      return;
    }
    onAddAssessment(assessmentData);
    setAssessmentData(initialAssessmentData);
    setNewAssessment(false);
  };

  const handleOpenForm = () => {
    setAssessmentData({
      ...initialAssessmentData,
      nome: patient?.nome || '',
      data_nascimento: patient?.data_nascimento || '',
      diagnostico: patient?.diagnostico || '',
    });
    setNewAssessment(true);
  };

  const avaliacoes = patient?.avaliacoes || [];

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-slate-700" />
            Avaliações Clínicas
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Histórico de avaliações multiprofissionais, diagnósticos e condutas
          </p>
        </div>

        {!newAssessment && (
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Nova Avaliação</span>
          </button>
        )}
      </div>

      {/* Formulário de Nova Avaliação */}
      {newAssessment && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-emerald-500" />
              Preencher Nova Avaliação
            </h4>
            <button
              type="button"
              onClick={() => setNewAssessment(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Nome do Paciente / Título
              </label>
              <input
                type="text"
                placeholder="Ex: Avaliação Admissional ou Nome do Paciente"
                value={assessmentData.nome}
                onChange={(e) => setAssessmentData({ ...assessmentData, nome: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={assessmentData.data_nascimento}
                onChange={(e) => setAssessmentData({ ...assessmentData, data_nascimento: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Diagnóstico & Queixa Principal
              </label>
              <textarea
                rows="2"
                placeholder="Detalhes clínicos, hipótese diagnóstica e queixas relatadas..."
                value={assessmentData.diagnostico}
                onChange={(e) => setAssessmentData({ ...assessmentData, diagnostico: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Encaminhamento & Especialidades
              </label>
              <textarea
                rows="2"
                placeholder="Encaminhamento médico, exames solicitados ou relatórios..."
                value={assessmentData.encaminhamento}
                onChange={(e) => setAssessmentData({ ...assessmentData, encaminhamento: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Acompanhamento & Plano Terapêutico
              </label>
              <textarea
                rows="2"
                placeholder="Frequência sugerida, metas de reabilitação e conduta recomendada..."
                value={assessmentData.acompanhamento}
                onChange={(e) => setAssessmentData({ ...assessmentData, acompanhamento: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewAssessment(false)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Salvar Avaliação</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Avaliações Registradas */}
      <div className="space-y-4">
        {avaliacoes.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/40">
            <ClipboardList size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Nenhuma avaliação registrada ainda</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Clique no botão "Nova Avaliação" acima para registrar a primeira avaliação clínica deste paciente.
            </p>
          </div>
        ) : (
          avaliacoes.map((av, index) => (
            <div
              key={av.id || index}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
            >
              {/* Topo do Card da Avaliação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    <UserCheck size={16} className="text-slate-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{av.nome}</h4>
                    <p className="text-[11px] text-slate-500">Avaliação do Prontuário</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                    <Calendar size={11} className="text-slate-500" />
                    {av.data || 'Data não registrada'}
                  </span>
                </div>
              </div>

              {/* Corpo com Grid de Informações */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-slate-50/60 rounded-xl border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Diagnóstico
                  </span>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {av.diagnostico || 'Não especificado'}
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Encaminhamento
                  </span>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {av.encaminhamento || 'Nenhum encaminhamento'}
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl border border-slate-200/70 p-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Acompanhamento
                  </span>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {av.acompanhamento || 'Acompanhamento de rotina'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AvaliacaoTab;
