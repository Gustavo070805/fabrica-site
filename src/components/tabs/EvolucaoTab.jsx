import React, { useState } from 'react';
import { Plus, CheckCircle2, Calendar, Clock, Check, X, FileText, Stethoscope } from 'lucide-react';

const getTodayDate = () => new Date().toISOString().split('T')[0];

const EvolucaoTab = ({ patient, onAddEvolution }) => {
  const [newEvolution, setNewEvolution] = useState(false);
  const [evolutionData, setEvolutionData] = useState({
    data: getTodayDate(),
    texto: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!evolutionData.texto.trim()) {
      alert('Por favor, descreva o relato da evolução clínica.');
      return;
    }
    onAddEvolution(evolutionData);
    setEvolutionData({ data: getTodayDate(), texto: '' });
    setNewEvolution(false);
  };

  const evolucoes = patient?.evolucoes || [];

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope size={16} className="text-slate-700" />
            Evoluções Diárias & Notas de Consulta
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico da conduta médica, evolução clínica e intervenções
          </p>
        </div>

        {!newEvolution && (
          <button
            onClick={() => setNewEvolution(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Registrar Evolução</span>
          </button>
        )}
      </div>

      {/* Formulário de Nova Evolução */}
      {newEvolution && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus size={14} className="text-emerald-500" />
              Nova Nota Clínica
            </h4>
            <button
              type="button"
              onClick={() => setNewEvolution(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Data do Atendimento
              </label>
              <input
                type="date"
                value={evolutionData.data}
                onChange={(e) => setEvolutionData({ ...evolutionData, data: e.target.value })}
                className="w-full sm:w-64 px-3.5 py-2 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Relato Clínico & Conduta Terapêutica
              </label>
              <textarea
                rows="5"
                placeholder="Descreva o que aconteceu na sessão: estado do paciente, queixas, exercícios ou intervenções realizadas, resposta ao tratamento e recomendações para o próximo encontro..."
                value={evolutionData.texto}
                onChange={(e) => setEvolutionData({ ...evolutionData, texto: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewEvolution(false)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Salvar Evolução</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Evoluções Registradas */}
      <div className="space-y-4">
        {evolucoes.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 bg-slate-50/40">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Nenhuma evolução diária registrada ainda</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Clique no botão "Registrar Evolução" acima para adicionar a primeira anotação clínica.
            </p>
          </div>
        ) : (
          [...evolucoes].reverse().map((ev, index) => (
            <div
              key={ev.id || index}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3 hover:border-slate-300 transition"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={15} />
                  </div>
                  <span className="font-bold text-slate-900 text-xs">Registro de Consulta Clínica</span>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <Calendar size={11} className="text-emerald-600" />
                  {ev.data}
                </span>
              </div>

              <div className="border-l-2 border-slate-900/30 pl-3.5 py-0.5">
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ev.texto}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EvolucaoTab;
