import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, CheckCircle2, AlertCircle, Check, Save } from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

const FinanceiroTab = ({ patient, onUpdateFinancial }) => {
  const [financialData, setFinancialData] = useState({
    valor_sessao: patient?.financeiro?.valor_sessao || 0,
    pagamento: patient?.financeiro?.pagamento || 0,
  });
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Atualiza os campos se o paciente mudar
  useEffect(() => {
    setFinancialData({
      valor_sessao: patient?.financeiro?.valor_sessao || 0,
      pagamento: patient?.financeiro?.pagamento || 0,
    });
    setShowSavedToast(false);
  }, [patient?.id, patient?.financeiro]);

  const valorSessao = Number(patient?.financeiro?.valor_sessao) || 0;
  const pagamento = Number(patient?.financeiro?.pagamento) || 0;
  const saldo = valorSessao - pagamento;

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateFinancial(financialData);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3500);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <DollarSign size={16} className="text-slate-700" />
          Financeiro & Honorários Clínicos
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestão de valores por sessão, pagamentos realizados e quitação
        </p>
      </div>

      {/* Notificação de Sucesso */}
      {showSavedToast && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Dados financeiros atualizados e sincronizados com sucesso!</span>
        </div>
      )}

      {/* 3 KPI Cards com Estilo MedSync */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Valor da Sessão */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Valor da Sessão</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(valorSessao)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Preço unitário do atendimento</p>
        </div>

        {/* Card 2: Pagamento Recebido */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pagamento Recebido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(pagamento)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Total recebido até o momento</p>
        </div>

        {/* Card 3: Saldo / Status */}
        <div
          className={`rounded-2xl border p-5 shadow-xs ${
            saldo <= 0
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-red-50/40 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold"
              style={{ color: saldo <= 0 ? '#047857' : '#b91c1c' }}
            >
              {saldo <= 0 ? 'Status Financeiro' : 'Saldo Pendente'}
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                saldo <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {saldo <= 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            </div>
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              saldo <= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {saldo <= 0 ? 'Quitado' : formatCurrency(saldo)}
          </p>
          <p
            className="text-[11px] mt-1"
            style={{ color: saldo <= 0 ? '#059669' : '#dc2626' }}
          >
            {saldo <= 0 ? 'Nenhuma pendência financeira' : 'Aguardando quitação do paciente'}
          </p>
        </div>
      </div>

      {/* Formulário de Atualização Financeira */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Atualizar Informações de Cobrança
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Altere o valor do atendimento e lance pagamentos recebidos deste paciente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Valor da Sessão (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={financialData.valor_sessao}
                  onChange={(e) =>
                    setFinancialData({
                      ...financialData,
                      valor_sessao: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Pagamento Recebido (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={financialData.pagamento}
                  onChange={(e) =>
                    setFinancialData({
                      ...financialData,
                      pagamento: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-2xs"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
            >
              <Save size={14} />
              <span>Atualizar Financeiro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceiroTab;
