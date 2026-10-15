import React from 'react';
import {
  Users,
  Calendar,
  Activity,
  AlertCircle,
  UserPlus,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  FolderOpen
} from 'lucide-react';

const DashboardView = ({
  patients = [],
  user = null,
  syncStatus = 'synced',
  onLogout,
  onOpenNewPatient,
  onSelectPatientForRecord,
  onViewAllPatients,
  onOpenAgenda
}) => {
  // Cálculos 100% reais baseados no banco de dados Upstash
  const totalPatientsCount = patients.length;

  const totalEvolucoes = patients.reduce(
    (acc, p) => acc + (p.evolucoes ? p.evolucoes.length : 0),
    0
  );

  const totalAvaliacoes = patients.reduce(
    (acc, p) => acc + (p.avaliacoes ? p.avaliacoes.length : 0),
    0
  );

  const pendingPaymentsCount = patients.filter((p) => {
    const valor = Number(p.financeiro?.valor_sessao) || 0;
    const pago = Number(p.financeiro?.pagamento) || 0;
    return valor > pago;
  }).length;

  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const todayAppointmentsCount = patients.reduce(
    (acc, p) =>
      acc + (p.consultas || []).filter((c) => c.data === todayIso && c.status !== 'cancelado').length,
    0
  );

  // Obter as atividades reais mais recentes a partir dos pacientes
  const recentActivities = [];

  // Pacientes mais recentes cadastrados
  if (patients.length > 0) {
    const lastPatient = patients[patients.length - 1];
    recentActivities.push({
      id: 'act-patient-' + lastPatient.id,
      title: 'Novo paciente registrado',
      description: lastPatient.nome,
      icon: UserPlus,
      color: 'bg-blue-50 text-blue-600',
      time: 'Recente',
    });
  }

  // Verificar evoluções mais recentes
  patients.forEach((p) => {
    if (p.evolucoes && p.evolucoes.length > 0) {
      const lastEv = p.evolucoes[p.evolucoes.length - 1];
      recentActivities.push({
        id: 'act-ev-' + lastEv.id,
        title: 'Evolução clínica registrada',
        description: `${p.nome} (${lastEv.data || 'Consulta'})`,
        icon: CheckCircle2,
        color: 'bg-emerald-50 text-emerald-600',
        time: lastEv.data || 'Recente',
      });
    }
  });

  // Verificar avaliações mais recentes
  patients.forEach((p) => {
    if (p.avaliacoes && p.avaliacoes.length > 0) {
      const lastAv = p.avaliacoes[p.avaliacoes.length - 1];
      recentActivities.push({
        id: 'act-av-' + lastAv.id,
        title: 'Avaliação clínica documentada',
        description: `${p.nome}`,
        icon: FileText,
        color: 'bg-amber-50 text-amber-600',
        time: lastAv.data || 'Recente',
      });
    }
  });

  // Limitar a 4 atividades reais
  const displayActivities = recentActivities.slice(0, 4);

  return (
    <div className="h-full flex flex-col justify-between gap-3 sm:gap-4 overflow-hidden">
      {/* Topo do Dashboard */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bem-vindo(a), {user?.name ? (user.name.startsWith('Dr') ? user.name : `Dr(a). ${user.name}`) : 'Profissional'}
          </p>
        </div>
      </div>

      {/* 4 Cards de Métricas Reais do Banco */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total de Pacientes */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Pacientes</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalPatientsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Cadastrados no ViguMed</p>
        </div>

        {/* Card 2: Evoluções Clínicas */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Evoluções Registradas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalEvolucoes}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Notas de consultas clínicas</p>
        </div>

        {/* Card 3: Avaliações Realizadas */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avaliações Clínicas</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{totalAvaliacoes}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">Diagnósticos documentados</p>
        </div>

        {/* Card 4: Pendências Financeiras (Admin) OU Consultas de Hoje (Outros) */}
        {user?.role === 'admin' ? (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pendências Financeiras</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle size={15} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{pendingPaymentsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Pacientes com saldo a receber</p>
          </div>
        ) : (
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Consultas de Hoje</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar size={15} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{todayAppointmentsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Atendimentos agendados hoje</p>
          </div>
        )}
      </div>

      {/* Grade Central: Pacientes Cadastrados (Esquerda) e Atividades Reais (Direita) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Coluna 1 & 2 (2/3 da largura): Pacientes Cadastrados */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Pacientes em Acompanhamento</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {totalPatientsCount === 0
                    ? 'Nenhum paciente cadastrado ainda'
                    : `Exibindo pacientes cadastrados no consultório`}
                </p>
              </div>
            </div>

            {patients.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Users size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  Nenhum paciente cadastrado no banco de dados.
                </p>
                <button
                  onClick={onOpenNewPatient}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  Cadastrar Primeiro Paciente
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {patients.slice(0, 4).map((p) => {
                  const initials = (p.nome || 'P')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const evolucoesCount = p.evolucoes ? p.evolucoes.length : 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPatientForRecord(p.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 cursor-pointer hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-tight truncate">{p.nome}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs sm:max-w-sm">
                            {p.diagnostico || 'Sem diagnóstico preliminar informado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          {p.telefone || '-'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {evolucoesCount > 0 ? `${evolucoesCount} evoluções` : 'Novo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {patients.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 shrink-0">
              <button
                onClick={onViewAllPatients}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen size={14} />
                <span>Ver Todos os Pacientes ({patients.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Coluna 3 (1/3 da largura): Atividades Reais */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-2.5 shrink-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">Atividades Recentes</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Movimentações reais do sistema</p>
            </div>

            {displayActivities.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Clock size={24} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs">Nenhuma atividade registrada ainda.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  As atividades aparecerão aqui conforme as movimentações clínicas.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
                {displayActivities.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${act.color}`}
                      >
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-slate-900 leading-tight truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[190px]">
                          {act.description}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {act.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha Inferior: Ações Rápidas Funcionais */}
      <div className="shrink-0 bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs">
        <div className="mb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900">Ações Rápidas</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Atalhos práticos para o seu dia a dia clínico
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Ação 1: Novo Paciente */}
          <button
            onClick={onOpenNewPatient}
            className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition font-semibold text-xs shadow-2xs group cursor-pointer"
          >
            <UserPlus size={15} className="group-hover:scale-110 transition text-emerald-400" />
            <span>Novo Paciente</span>
          </button>

          {/* Ação 2: Ver Diretório */}
          <button
            onClick={onViewAllPatients}
            className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 transition font-semibold text-xs shadow-2xs cursor-pointer"
          >
            <Users size={15} className="text-slate-600" />
            <span>Lista de Pacientes</span>
          </button>

          {/* Ação 3: Agenda de Consultas */}
          <button
            onClick={() => {
              if (onOpenAgenda) {
                onOpenAgenda();
              }
            }}
            className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 transition font-semibold text-xs shadow-2xs cursor-pointer"
          >
            <Calendar size={15} className="text-slate-600" />
            <span>Agenda de Consultas</span>
          </button>

          {/* Ação 4: Imprimir */}
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 transition font-semibold text-xs shadow-2xs cursor-pointer"
          >
            <Printer size={15} className="text-slate-600" />
            <span>Imprimir Prontuário</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
