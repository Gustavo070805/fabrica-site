import React, { useState } from 'react';
import { UserPlus, Check, AlertCircle } from 'lucide-react';
import { isValidCPF, formatCPF } from '../utils/cpfValidator';

const initialFormData = {
  nome: '',
  acompanhante: '',
  endereco: '',
  telefone: '',
  cpf: '',
  diagnostico: '',
  data_nascimento: '',
  data_pagamento: '',
};

const PatientForm = ({ onAddPatient }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [cpfError, setCpfError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setCpfError('');

    if (!formData.nome.trim()) {
      alert('Por favor, preencha o nome do paciente');
      return;
    }

    if (formData.cpf && formData.cpf.trim()) {
      if (!isValidCPF(formData.cpf)) {
        setCpfError('O CPF informado é matematicamente inválido. Verifique os números digitados.');
        return;
      }
    }

    onAddPatient(formData);
    setFormData(initialFormData);
    setCpfError('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs no-print space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
          <UserPlus size={16} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Novo Paciente</h3>
          <p className="text-xs text-slate-500">Adicione os dados clínicos e cadastrais</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              CPF
            </label>
            <input
              type="text"
              maxLength={14}
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => {
                setCpfError('');
                setFormData({ ...formData, cpf: formatCPF(e.target.value) });
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-50/50 border ${
                cpfError ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-300 focus:ring-slate-900/10'
              } rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:border-slate-900 transition`}
            />
            {cpfError && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} className="shrink-0" />
                <span>{cpfError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Telefone
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Acompanhante
            </label>
            <input
              type="text"
              placeholder="Nome do responsável"
              value={formData.acompanhante}
              onChange={(e) => setFormData({ ...formData, acompanhante: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Data de Nascimento
            </label>
            <input
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Data de Pagamento
            </label>
            <input
              type="date"
              value={formData.data_pagamento}
              onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Endereço
            </label>
            <input
              type="text"
              placeholder="Rua, número, complemento"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Diagnóstico / Queixa Clínica
            </label>
            <textarea
              rows="2"
              placeholder="Diagnóstico inicial ou observações..."
              value={formData.diagnostico}
              onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
          >
            <Check size={14} />
            <span>Adicionar Paciente</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
