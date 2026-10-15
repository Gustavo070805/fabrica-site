import React, { useState } from 'react';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowUpRight,
  Printer,
  FileText,
  SlidersHorizontal,
  X,
  Check,
  Percent,
  Wallet,
  ArrowDownRight
} from 'lucide-react';

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};

const FinancialDashboard = ({
  patients = [],
  onUpdateFinancial,
  onSelectPatientForRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'pending'
  const [editingPatient, setEditingPatient] = useState(null);
  const [editForm, setEditForm] = useState({ valor_sessao: 0, pagamento: 0 });

  // Cálculos Consolidados Globais
  let totalFaturado = 0;
  let totalRecebido = 0;
  let totalPendente = 0;
  let countQuitados = 0;
  let countPendentes = 0;

  const enrichedPatients = patients.map((p) => {
    const valorSessao = Number(p.financeiro?.valor_sessao) || 0;
    const pagamento = Number(p.financeiro?.pagamento) || 0;
    const saldo = valorSessao - pagamento;
    const isQuitado = valorSessao > 0 && saldo <= 0;
    const isPendente = saldo > 0;

    totalFaturado += valorSessao;
    totalRecebido += pagamento;
    if (isPendente) totalPendente += saldo;
    if (isQuitado) countQuitados++;
    if (isPendente) countPendentes++;

    return {
      ...p,
      valorSessao,
      pagamento,
      saldo,
      isQuitado,
      isPendente,
    };
  });

  const taxaQuitacao = totalFaturado > 0 ? Math.min(100, Math.round((totalRecebido / totalFaturado) * 100)) : 100;
  const taxaPendente = 100 - taxaQuitacao;

  // Filtragem da tabela
  const filteredPatients = enrichedPatients.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (p.nome && p.nome.toLowerCase().includes(q)) ||
      (p.cpf && p.cpf.includes(q)) ||
      (p.telefone && p.telefone.includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === 'paid') return p.isQuitado;
    if (statusFilter === 'pending') return p.isPendente;
    return true;
  });

  // Top pacientes por faturamento para o gráfico de barras
  const topPatients = [...enrichedPatients]
    .filter((p) => p.valorSessao > 0 || p.pagamento > 0)
    .sort((a, b) => b.valorSessao - a.valorSessao)
    .slice(0, 5);

  const maxBarValue = Math.max(...topPatients.map((p) => Math.max(p.valorSessao, p.pagamento)), 1);

  // Manipulação de Edição Rápida de Pagamento
  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setEditForm({
      valor_sessao: patient.valorSessao,
      pagamento: patient.pagamento,
    });
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    if (editingPatient && onUpdateFinancial) {
      onUpdateFinancial(editingPatient.id, editForm);
    }
    setEditingPatient(null);
  };

  const handleQuitarTotal = () => {
    setEditForm((prev) => ({
      ...prev,
      pagamento: prev.valor_sessao,
    }));
  };

  // Parâmetros do gráfico de rosca (Donut Chart SVG)
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (taxaQuitacao / 100) * circumference;

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho do Dashboard Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Financeiro da Clínica
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão consolidada de faturamento, receitas arrecadadas e controle de pendências
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition"
          >
            <Printer size={14} />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* 4 Cards Principais de Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Previsto */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Faturamento Previsto</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(totalFaturado)}</p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="font-semibold text-slate-600">{patients.length} pacientes</span> com ficha ativa
          </p>
        </div>

        {/* Card 2: Total Recebido em Caixa */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Recebido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalRecebido)}</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <ArrowUpRight size={13} />
            <span>{taxaQuitacao}% do montante arrecadado</span>
          </p>
        </div>

        {/* Card 3: Saldo a Receber */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">A Receber / Pendente</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(totalPendente)}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-1 flex items-center gap-1">
            <ArrowDownRight size={13} />
            <span>{countPendentes} paciente(s) com saldo em aberto</span>
          </p>
        </div>

        {/* Card 4: Taxa de Adimplência */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taxa de Quitação</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{taxaQuitacao}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${taxaQuitacao}%` }}
            />
          </div>
        </div>
      </div>

      {/* Seção com Gráficos Visuais da Clínica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Rosca de Distribuição Financeira (1/3) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Composição da Receita</h3>
            <p className="text-xs text-slate-500 mt-0.5">Valores recebidos vs. pendências em aberto</p>

            <div className="flex flex-col items-center justify-center my-6 relative">
              <svg width="180" height="180" className="transform -rotate-90">
                {/* Trilha de Fundo (Pendente) */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="#fee2e2"
                  strokeWidth="18"
                  fill="transparent"
                />
                {/* Arco Recebido (Esmeralda) */}
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="#10b981"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={totalFaturado === 0 ? 0 : strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>

              {/* Informação no Centro do Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">{taxaQuitacao}%</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Arrecadado
                </span>
              </div>
            </div>
          </div>

          {/* Legenda do Gráfico */}
          <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Recebido em Caixa
              </span>
              <span className="font-bold text-slate-900">{formatCurrency(totalRecebido)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                Saldo a Receber
              </span>
              <span className="font-bold text-rose-600">{formatCurrency(totalPendente)}</span>
            </div>
          </div>
        </div>

        {/* Gráfico 2: Comparativo por Paciente (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Faturamento por Paciente</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparativo de valor contratado vs. pagamentos recebidos
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 hidden sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-900"></span>
                  Valor Sessão
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  Valor Pago
                </span>
              </div>
            </div>

            {topPatients.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Wallet size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Nenhum dado financeiro registrado ainda</p>
                <p className="text-[11px] mt-0.5">Cadastre o valor das sessões nos pacientes para visualizar este gráfico.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {topPatients.map((p) => {
                  const sessaoWidth = Math.round((p.valorSessao / maxBarValue) * 100);
                  const pagoWidth = Math.round((p.pagamento / maxBarValue) * 100);

                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[200px]">{p.nome}</span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-500">
                            Sessão: <strong className="text-slate-800">{formatCurrency(p.valorSessao)}</strong>
                          </span>
                          <span className="text-emerald-700 font-semibold">
                            Pago: {formatCurrency(p.pagamento)}
                          </span>
                        </div>
                      </div>

                      {/* Barra dupla */}
                      <div className="space-y-1">
                        {/* Barra Sessão */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-slate-900 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${sessaoWidth}%` }}
                            title={`Sessão: ${formatCurrency(p.valorSessao)}`}
                          />
                        </div>
                        {/* Barra Pago */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pagoWidth}%` }}
                            title={`Pago: ${formatCurrency(p.pagamento)}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Quitados: <strong className="text-emerald-600">{countQuitados}</strong></span>
            <span>Pendências: <strong className="text-rose-600">{countPendentes}</strong></span>
            <span>Total de Pacientes: <strong className="text-slate-800">{patients.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabela com Busca Completa do Financeiro */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Barra Superior de Busca e Filtros */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Extrato Financeiro por Paciente</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte pagamentos, saldos devedores e registre baixas rápidas
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Campo de Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 w-full sm:w-56 transition"
              />
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({enrichedPatients.length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                  statusFilter === 'paid'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Quitados ({countQuitados})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                  statusFilter === 'pending'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pendentes ({countPendentes})
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Pacientes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Paciente</th>
                <th className="py-3 px-4">Valor Sessão</th>
                <th className="py-3 px-4">Valor Pago</th>
                <th className="py-3 px-4">Saldo Pendente</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Nenhum paciente encontrado com o filtro atual.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const initials = (p.nome || 'P')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p
                              onClick={() => onSelectPatientForRecord && onSelectPatientForRecord(p.id)}
                              className="font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer"
                              title="Ver ficha e prontuário completo"
                            >
                              {p.nome}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              CPF: {p.cpf || 'Não informado'} • Tel: {p.telefone || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {formatCurrency(p.valorSessao)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-emerald-600">
                        {formatCurrency(p.pagamento)}
                      </td>

                      <td className="py-3.5 px-4 font-semibold">
                        <span className={p.saldo > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {formatCurrency(Math.max(0, p.saldo))}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.isQuitado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={11} /> Quitado
                          </span>
                        ) : p.isPendente ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle size={11} /> A Receber
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                            Sem valor
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold transition shadow-2xs cursor-pointer"
                          >
                            Registrar Pagamento
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectPatientForRecord && onSelectPatientForRecord(p.id)}
                            className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 text-slate-700 rounded-lg text-[11px] font-semibold transition shadow-2xs cursor-pointer flex items-center justify-center"
                            title="Ver ficha e prontuário completo"
                          >
                            <FileText size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rápido de Pagamento / Baixa */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <DollarSign size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registrar Pagamento</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                    {editingPatient.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Valor da Sessão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.valor_sessao}
                  onChange={(e) =>
                    setEditForm({ ...editForm, valor_sessao: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Valor Pago / Recebido (R$)
                  </label>
                  <button
                    type="button"
                    onClick={handleQuitarTotal}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Quitar valor total ({formatCurrency(editForm.valor_sessao)})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.pagamento}
                  onChange={(e) =>
                    setEditForm({ ...editForm, pagamento: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                  required
                />
              </div>

              {/* Prévia do Saldo Restante */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Saldo Restante:</span>
                <span
                  className={`font-bold ${
                    editForm.valor_sessao - editForm.pagamento > 0
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(Math.max(0, editForm.valor_sessao - editForm.pagamento))}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Salvar Baixa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
