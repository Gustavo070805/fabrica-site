import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { isValidCPF, formatCPF } from '../utils/cpfValidator';

const initialData = {
  nome: '',
  acompanhante: '',
  endereco: '',
  telefone: '',
  cpf: '',
  diagnostico: '',
  data_nascimento: '',
  data_pagamento: '',
};

const PatientModal = ({ isOpen, onClose, onAddPatient }) => {
  const [formData, setFormData] = useState(initialData);
  const [cpfError, setCpfError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setCpfError('');

    if (!formData.nome.trim()) {
      alert('Por favor, informe ao menos o nome do paciente.');
      return;
    }

    if (formData.cpf && formData.cpf.trim()) {
      if (!isValidCPF(formData.cpf)) {
        setCpfError('O CPF informado é matematicamente inválido. Verifique os números digitados.');
        return;
      }
    }

    onAddPatient(formData);
    setFormData(initialData);
    setCpfError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <UserPlus size={16} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Novo Paciente</h3>
              <p className="text-[11px] text-slate-500">Cadastre um novo paciente no sistema hospitalar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                placeholder="Ex: Ana Maria Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                CPF
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                maxLength={14}
                value={formData.cpf}
                onChange={(e) => {
                  setFormData({ ...formData, cpf: formatCPF(e.target.value) });
                  if (cpfError) setCpfError('');
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                  cpfError
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-slate-900/10 focus:border-slate-900'
                }`}
              />
              {cpfError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{cpfError}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Telefone
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Acompanhante
              </label>
              <input
                type="text"
                placeholder="Responsável / Parente"
                value={formData.acompanhante}
                onChange={(e) => setFormData({ ...formData, acompanhante: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Endereço
              </label>
              <input
                type="text"
                placeholder="Rua, número, bairro e cidade"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Diagnóstico Inicial / Queixa
              </label>
              <textarea
                rows="2"
                placeholder="Descrição diagnóstica preliminar..."
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition"
            >
              Cadastrar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;
