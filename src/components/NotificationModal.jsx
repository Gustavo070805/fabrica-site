import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Calendar,
  Sparkles,
  Users,
  ChevronRight
} from 'lucide-react';

const NotificationModal = ({
  isOpen,
  onClose,
  requests = [],
  allUsers = [],
  upcomingAppointments = [],
  onApprove,
  onReject,
  onOpenRecord,
  onOpenAgenda,
  onOpenUsers,
  currentUser = null,
}) => {
  const userRole = currentUser?.role || 'doctor';
  const isAdmin = userRole === 'admin';
  const isClinical = ['admin', 'doctor', 'reception'].includes(userRole);

  const initialTab = isAdmin
    ? (requests.filter((r) => r.status === 'pending').length > 0 ? 'requests' : 'appointments')
    : (isClinical ? 'appointments' : 'system');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        setActiveTab(requests.filter((r) => r.status === 'pending').length > 0 ? 'requests' : 'appointments');
      } else if (isClinical) {
        setActiveTab('appointments');
      } else {
        setActiveTab('system');
      }
    }
  }, [isOpen, isAdmin, isClinical]);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const urgentAppointments = upcomingAppointments.filter(
    (a) => a.minutesLeft !== undefined && a.minutesLeft <= 10 && a.minutesLeft >= -10
  );

  const hasUrgentNotification =
    (isAdmin && pendingRequests.length > 0) || (isClinical && urgentAppointments.length > 0);

  const handleApprove = async (userId) => {
    setProcessingId(userId);
    setActionSuccessMessage('');
    try {
      await onApprove(userId);
      setActionSuccessMessage('Acesso liberado com sucesso!');
      setTimeout(() => setActionSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Deseja realmente recusar a solicitação de acesso deste profissional?')) {
      return;
    }
    setProcessingId(userId);
    setActionSuccessMessage('');
    try {
      await onReject(userId);
      setActionSuccessMessage('Solicitação recusada.');
      setTimeout(() => setActionSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Data não disponível';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center relative shadow-xs">
              <Bell size={20} className="text-emerald-400" />
              {hasUrgentNotification && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Central de Notificações
              </h2>
              <p className="text-xs text-slate-500">
                Aprovações de novos acessos, consultas do dia e comunicados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensagem de Feedback Rápido */}
        {actionSuccessMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-white gap-2 overflow-x-auto">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={16} />
              <span>Solicitações de Acesso</span>
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          )}

          {isClinical && (
            <button
              onClick={() => setActiveTab('appointments')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock
                size={16}
                className={urgentAppointments.length > 0 ? 'text-amber-600' : 'text-slate-500'}
              />
              <span>Consultas de Hoje</span>
              {urgentAppointments.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {urgentAppointments.length} em breve
                </span>
              ) : upcomingAppointments.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {upcomingAppointments.length}
                </span>
              ) : null}
            </button>
          )}

          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={16} className="text-amber-500" />
            <span>Avisos do Sistema</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              4
            </span>
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'requests' && isAdmin && (
            <div className="space-y-5">
              {/* Card Informativo de Validação por Pares */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">Segurança & Controle de Acesso:</span> Todo novo
                  cadastro necessita da liberação de um administrador para acessar os
                  prontuários e a agenda.
                </div>
              </div>

              {/* Lista de Solicitações Pendentes */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Aguardando Aprovação ({pendingRequests.length})
                </h3>

                {pendingRequests.length === 0 ? (
                  <div className="py-8 px-4 text-center bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserCheck size={24} />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Nenhuma solicitação pendente
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Todos os pedidos de acesso foram analisados. Quando um novo usuário se cadastrar,
                      ele aparecerá aqui para liberação.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((req) => {
                      const isProcessing = processingId === req.id;
                      return (
                        <div
                          key={req.id}
                          className="p-4 bg-white border border-amber-200 rounded-xl shadow-xs hover:border-amber-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-sm">
                              {getInitials(req.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900">{req.name}</h4>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock size={10} />
                                  Pendente
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{req.email}</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Cadastrado em: {formatDate(req.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Botões de Ação para o Usuário */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              title="Recusar solicitação de acesso"
                            >
                              <UserX size={14} />
                              <span>Recusar</span>
                            </button>

                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={isProcessing}
                              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                              title="Liberar acesso imediato para este usuário"
                            >
                              <UserCheck size={14} />
                              <span>{isProcessing ? 'Liberando...' : 'Liberar Acesso'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'appointments' && isClinical && (
            <div className="space-y-4">
              {/* Alerta de Urgência para consultas dentro dos próximos 10 minutos */}
              {urgentAppointments.length > 0 && (
                <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs animate-pulse">
                  <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-sm block text-amber-950">
                      Atenção: Consulta se aproximando!
                    </span>
                    <p className="mt-0.5 leading-relaxed">
                      Você possui {urgentAppointments.length} atendimento(s) agendado(s) para começar
                      nos próximos 10 minutos.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Consultas de Hoje ({upcomingAppointments.length})
                </h3>
                {onOpenAgenda && (
                  <button
                    onClick={() => {
                      onOpenAgenda();
                      onClose();
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Abrir Calendário</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {upcomingAppointments.length === 0 ? (
                <div className="py-8 px-4 text-center bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Nenhuma consulta agendada para hoje
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Não há atendimentos cadastrados para a data de hoje. Acesse a aba Agenda para marcar
                    novas consultas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingAppointments.map((apt) => {
                    const isUrgent =
                      apt.minutesLeft !== undefined &&
                      apt.minutesLeft <= 10 &&
                      apt.minutesLeft >= -10;

                    return (
                      <div
                        key={apt.id || apt.hora + apt.patientId}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isUrgent
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold ${
                              isUrgent
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-900 text-white'
                            }`}
                          >
                            <span className="text-xs leading-none">{apt.hora}</span>
                            <span className="text-[9px] font-normal opacity-80 mt-0.5">hoje</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">
                                {apt.patientName}
                              </h4>
                              {isUrgent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 animate-pulse">
                                  <Clock size={10} />
                                  {apt.minutesLeft <= 0
                                    ? 'Iniciando agora'
                                    : `Em ${apt.minutesLeft} min`}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {apt.tipo || 'Consulta'}
                              {apt.patientPhone && ` • Tel: ${apt.patientPhone}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {onOpenRecord && (
                            <button
                              onClick={() => {
                                onOpenRecord(apt.patientId);
                                onClose();
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <UserCheck size={14} />
                              <span>Abrir Prontuário</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3.5">
              {/* Notificação 1: Backup & Nuvem */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-3.5 shadow-2xs hover:border-slate-300 transition">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Database size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Sincronização em Nuvem Ativa
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Hoje</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    A base de dados de prontuários, evoluções e agendamentos está conectada com o Upstash
                    Redis, garantindo persistência e alta disponibilidade em tempo real.
                  </p>
                </div>
              </div>

              {/* Notificação 2: Segurança & LGPD */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-3.5 shadow-2xs hover:border-slate-300 transition">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Proteção e Validação por Pares
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Segurança</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Senhas protegidas com hashing criptográfico seguro (PBKDF2 com Salt de 16 bytes). Novos
                    membros da equipe necessitam de autorização prévia por profissionais ativos.
                  </p>
                </div>
              </div>

              {/* Notificação 3: Nova Agenda Multivisualização */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-3.5 shadow-2xs hover:border-slate-300 transition">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Nova Agenda com Visualização Mês, Semana e Dia
                    </h4>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                      Novo
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Você pode alternar dinamicamente entre as visões de Mês, Semana e Dia. A agenda conta
                    com validação contra horários duplicados e bloqueio de agendamento retroativo.
                  </p>
                </div>
              </div>

              {/* Notificação 4: Canal de Comunicados da Clínica */}
              <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Canal de Comunicados & Alertas
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">ViguMed</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Espaço pronto para avisos da recepção, lembretes de consultas, confirmações por WhatsApp
                    e atualizações de prontuários.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Fechamento */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            ViguMed Clinical Suite • Versão 2.1
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
