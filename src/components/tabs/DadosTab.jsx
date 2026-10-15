import React, { useState } from 'react';
import { User, Calendar, Phone, MapPin, FileText, CreditCard, Shield, Edit3, Check, X, AlertCircle } from 'lucide-react';
import { isValidCPF, formatCPF } from '../../utils/cpfValidator';

const DadosTab = ({ patient, onUpdatePatient }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [editForm, setEditForm] = useState({
    nome: patient?.nome || '',
    acompanhante: patient?.acompanhante || '',
    cpf: patient?.cpf || '',
    telefone: patient?.telefone || '',
    endereco: patient?.endereco || '',
    data_nascimento: patient?.data_nascimento || '',
    data_pagamento: patient?.data_pagamento || '',
    diagnostico: patient?.diagnostico || '',
  });

  if (!patient) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setCpfError('');

    if (editForm.cpf && editForm.cpf.trim()) {
      if (!isValidCPF(editForm.cpf)) {
        setCpfError('O CPF informado é matematicamente inválido. Verifique os números digitados.');
        return;
      }
    }

    if (onUpdatePatient) {
      onUpdatePatient(editForm);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCpfError('');
    setEditForm({
      nome: patient?.nome || '',
      acompanhante: patient?.acompanhante || '',
      cpf: patient?.cpf || '',
      telefone: patient?.telefone || '',
      endereco: patient?.endereco || '',
      data_nascimento: patient?.data_nascimento || '',
      data_pagamento: patient?.data_pagamento || '',
      diagnostico: patient?.diagnostico || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Aba com Título e Botão de Edição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User size={16} className="text-slate-700" />
            Dados Cadastrais & Clínicos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Informações cadastrais completas, contatos e diagnóstico de admissão
          </p>
        </div>

        {onUpdatePatient && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition self-start sm:self-auto"
          >
            <Edit3 size={13} />
            <span>Editar Informações</span>
          </button>
        )}
      </div>

      {!isEditing ? (
        /* Modo Visualização Elegante */
        <div className="space-y-5">
          {/* Seção 1: Identificação Pessoal */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Shield size={14} className="text-slate-500" />
              Identificação do Paciente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome Completo
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs truncate">
                  {patient.nome || '-'}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  CPF
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs">
                  {patient.cpf || '-'}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Data de Nascimento
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400" />
                  <span>{patient.data_nascimento || '-'}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Acompanhante / Responsável
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs truncate">
                  {patient.acompanhante || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Contato & Endereço */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Phone size={14} className="text-slate-500" />
              Contato & Localização
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs flex items-center gap-2">
                  <Phone size={13} className="text-emerald-500" />
                  <span>{patient.telefone || '-'}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Endereço Residencial
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs flex items-center gap-2 truncate">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{patient.endereco || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Diagnóstico & Financeiro Geral */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-200/80 p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-500" />
              Quadro Clínico & Datas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Diagnóstico Inicial / Queixa
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-2xs min-h-[42px] leading-relaxed">
                  {patient.diagnostico || 'Nenhum diagnóstico preliminar informado.'}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Data de Pagamento / Vencimento
                </span>
                <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 shadow-2xs flex items-center gap-2">
                  <CreditCard size={13} className="text-slate-400" />
                  <span>{patient.data_pagamento || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Formulário de Edição com Estilo MedSync */
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
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
                  value={editForm.cpf}
                  onChange={(e) => {
                    setCpfError('');
                    setEditForm({ ...editForm, cpf: formatCPF(e.target.value) });
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-50/50 border ${
                    cpfError ? 'border-rose-400 focus:ring-rose-500/10' : 'border-slate-300 focus:ring-slate-900/10'
                  } rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:border-slate-900 transition`}
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
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Acompanhante
                </label>
                <input
                  type="text"
                  value={editForm.acompanhante}
                  onChange={(e) => setEditForm({ ...editForm, acompanhante: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={editForm.data_nascimento}
                  onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data de Pagamento
                </label>
                <input
                  type="date"
                  value={editForm.data_pagamento}
                  onChange={(e) => setEditForm({ ...editForm, data_pagamento: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={editForm.endereco}
                  onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Diagnóstico Clínico
                </label>
                <textarea
                  rows="3"
                  value={editForm.diagnostico}
                  onChange={(e) => setEditForm({ ...editForm, diagnostico: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default DadosTab;
