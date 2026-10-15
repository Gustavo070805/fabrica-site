import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  Trash2,
  Edit2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Mail,
  Stethoscope,
  Briefcase,
  DollarSign,
  KeyRound,
  History,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

export const ROLE_DEFINITIONS = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    shortLabel: 'Admin',
    description: 'Acesso total ao sistema, configurações, aprovação e exclusão de contas',
    icon: ShieldAlert,
    badgeBg: 'bg-slate-900 text-white border-transparent shadow-2xs',
    dotColor: 'bg-emerald-400',
  },
  doctor: {
    id: 'doctor',
    label: 'Doutor(a) / Terapeuta',
    shortLabel: 'Doutor(a)',
    description: 'Atendimento clínico, prontuários, evolução de pacientes e agenda',
    icon: Stethoscope,
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dotColor: 'bg-blue-500',
  },
  reception: {
    id: 'reception',
    label: 'Recepção / Secretária',
    shortLabel: 'Recepção',
    description: 'Controle de fluxo de pacientes, agendamentos e recepção da clínica',
    icon: Briefcase,
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dotColor: 'bg-emerald-500',
  },
  billing: {
    id: 'billing',
    label: 'Financeiro',
    shortLabel: 'Financeiro',
    description: 'Faturamento, conciliação e relatórios administrativos',
    icon: DollarSign,
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dotColor: 'bg-amber-500',
  },
};

export const STATUS_DEFINITIONS = {
  approved: {
    label: 'Ativo',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pendente',
    badge: 'bg-amber-50 text-amber-700 border-amber-200/70',
    dot: 'bg-amber-500 animate-pulse',
  },
  rejected: {
    label: 'Recusado',
    badge: 'bg-rose-50 text-rose-700 border-rose-200/70',
    dot: 'bg-rose-500',
  },
};

const ACTION_BADGES = {
  LOGIN_SUCCESS: { label: 'Login Sucesso', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOGIN_FAILED: { label: 'Falha de Senha', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  LOGIN_BLOCKED_RATE_LIMIT: { label: 'Bloqueio Força Bruta', bg: 'bg-red-100 text-red-800 border-red-300' },
  UPDATE_PATIENTS: { label: 'Prontuários Atualizados', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVE_ACCESS: { label: 'Acesso Aprovado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECT_ACCESS: { label: 'Acesso Recusado', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  UPDATE_USER: { label: 'Usuário Alterado', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELETE_USER: { label: 'Usuário Excluído', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  PASSWORD_RESET_SUCCESS: { label: 'Senha Alterada', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ADMIN_RESET_PASSWORD: { label: 'Senha Redefinida p/ Admin', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  SIGNUP_CREATED: { label: 'Novo Cadastro', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
  ADMIN_RESET_USER_MFA: { label: '2FA Reiniciado p/ Admin', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  MFA_ACTIVATED: { label: '2FA Configurado', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function UsersManagementView({
  users = [],
  currentUser = null,
  onRefreshUsers,
  onUpdateUser,
  onDeleteUser,
  onAdminResetPassword,
  onAdminResetMFA,
  onFetchAuditLogs,
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'audit'

  // Filtros Equipe
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtros Auditoria
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Estado para Modal de Edição
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'doctor', status: 'approved' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Estado para Modal de Confirmação de Exclusão
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para Modal de Redefinição de Senha (Admin)
  const [resettingUser, setResettingUser] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Estado para Modal de Reinício de 2FA (Admin)
  const [resettingMFAUser, setResettingMFAUser] = useState(null);
  const [isResettingMFA, setIsResettingMFA] = useState(false);

  // Notificações de ação interna
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isAdmin = currentUser?.role === 'admin';

  // Carregar logs de auditoria
  const loadLogs = async () => {
    if (!onFetchAuditLogs) return;
    setIsLoadingLogs(true);
    try {
      const list = await onFetchAuditLogs();
      setAuditLogs(list || []);
    } catch {
      showToast('Falha ao carregar trilha de auditoria.', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadLogs();
    }
  }, [activeTab]);

  // Contadores métricos
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const doctors = users.filter((u) => (u.role || 'doctor') === 'doctor').length;
    const reception = users.filter((u) => u.role === 'reception').length;
    const billing = users.filter((u) => u.role === 'billing').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    return { total, admins, doctors, reception, billing, pending };
  }, [users]);

  // Lista de usuários filtrada
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'all' || (u.role || 'doctor') === roleFilter;
      const matchesStatus = statusFilter === 'all' || (u.status || 'approved') === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Logs filtrados
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = auditSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.ip && log.ip.includes(q));

      const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  // Abrir modal de edição
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role || 'doctor',
      status: user.status || 'approved',
    });
  };

  // Salvar edição
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);

    try {
      const res = await onUpdateUser(editingUser.id, {
        newName: editForm.name,
        newRole: editForm.role,
        newStatus: editForm.status,
      });

      if (res?.success) {
        showToast(`Usuário ${editForm.name} atualizado com sucesso!`, 'success');
        setEditingUser(null);
      } else {
        showToast(res?.error || 'Não foi possível atualizar o usuário.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao salvar alterações.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Confirmar exclusão permanente (Dupla confirmação de segurança)
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (deleteConfirmationInput !== 'EXCLUIR') {
      showToast('Digite EXCLUIR em maiúsculas para confirmar.', 'error');
      return;
    }
    setIsDeleting(true);

    try {
      const res = await onDeleteUser(deletingUser.id);
      if (res?.success) {
        showToast(`Usuário ${deletingUser.name} foi excluído permanentemente do banco de dados.`, 'success');
        setDeletingUser(null);
        setDeleteConfirmationInput('');
      } else {
        showToast(res?.error || 'Erro ao excluir usuário.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao tentar excluir usuário.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Redefinir senha pelo Admin
  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser || !onAdminResetPassword) return;

    if (!newAdminPassword || newAdminPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 dígitos.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const res = await onAdminResetPassword(resettingUser.id, newAdminPassword);
      if (res?.success) {
        showToast(`Senha de ${resettingUser.name} redefinida com sucesso!`, 'success');
        setResettingUser(null);
        setNewAdminPassword('');
      } else {
        showToast(res?.error || 'Erro ao redefinir senha.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Falha ao redefinir senha.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Reiniciar 2FA pelo Admin (Permite à pessoa fazer um novo cadastro de aparelho do zero)
  const handleConfirmResetMFA = async () => {
    if (!resettingMFAUser || !onAdminResetMFA) return;
    setIsResettingMFA(true);

    try {
      const res = await onAdminResetMFA(resettingMFAUser.id);
      if (res?.success) {
        showToast(`2FA de ${resettingMFAUser.name} reiniciado com sucesso! No próximo login, o usuário verá o novo QR Code.`, 'success');
        setResettingMFAUser(null);
        if (onRefreshUsers) {
          onRefreshUsers();
        }
      } else {
        showToast(res?.error || 'Erro ao reiniciar 2FA.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Falha ao reiniciar 2FA.', 'error');
    } finally {
      setIsResettingMFA(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-3 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-900/10'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-900/10'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Cabeçalho Limpo e Profissional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80 mb-3.5 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Equipe & Gestão de Usuários</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
              {users.length} {users.length === 1 ? 'Membro' : 'Membros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarquia clínica, permissões de acesso e segurança em duas etapas (2FA).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Abas Estilo Segmented Control */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={13} />
              <span>Equipe</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Auditoria LGPD</span>
            </button>
          </div>

          <button
            onClick={activeTab === 'team' ? onRefreshUsers : loadLogs}
            disabled={isLoading || isLoadingLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={13} className={isLoading || isLoadingLogs ? 'animate-spin text-slate-500' : 'text-slate-400'} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: EQUIPE & GESTÃO DE USUÁRIOS */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Métricas Uniformes: Mesma altura, mesmo estilo, sem carnaval de cores */}
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3.5">
            {/* 1. Total */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total</span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                  <Users size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats.total}</span>
                <span className="text-[11px] text-slate-400 font-medium">Membros</span>
              </div>
            </div>

            {/* 2. Admins */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Admins</span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <ShieldAlert size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats.admins}</span>
                <span className="text-[11px] text-slate-400 font-medium">Controle total</span>
              </div>
            </div>

            {/* 3. Doutores */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Doutores</span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Stethoscope size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats.doctors}</span>
                <span className="text-[11px] text-slate-400 font-medium">Atendimento</span>
              </div>
            </div>

            {/* 4. Recepção */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recepção</span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Briefcase size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats.reception}</span>
                <span className="text-[11px] text-slate-400 font-medium">Secretaria</span>
              </div>
            </div>

            {/* 5. Financeiro */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Financeiro</span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <DollarSign size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats.billing}</span>
                <span className="text-[11px] text-slate-400 font-medium">Cobranças</span>
              </div>
            </div>

            {/* 6. Pendentes */}
            <div className={`rounded-2xl p-3 shadow-2xs transition-all flex flex-col justify-between h-[84px] border ${
              stats.pending > 0
                ? 'bg-amber-50/40 border-amber-300'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pendentes</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  stats.pending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Clock size={13} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-bold tracking-tight ${
                  stats.pending > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}>
                  {stats.pending}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">Aprovação</span>
              </div>
            </div>
          </div>

          {/* Barra de Busca e Filtros com Visual Limpo */}
          <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-2.5 mb-3 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="all">Todos os Cargos</option>
                <option value="admin">Administrador</option>
                <option value="doctor">Doutor(a) / Terapeuta</option>
                <option value="reception">Recepção</option>
                <option value="billing">Financeiro</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="approved">Ativo</option>
                <option value="pending">Pendente</option>
                <option value="rejected">Recusado</option>
              </select>
            </div>
          </div>

          {/* Tabela Unificada de Membros (Alinhamento Perfeito & Sem Carnaval de Cores) */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden flex flex-col min-h-0">
            {/* Cabeçalho de Colunas Fixo (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/90 border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none shrink-0">
              <div className="col-span-5 lg:col-span-4">Membro / Usuário</div>
              <div className="col-span-3 lg:col-span-3">Função / Cargo</div>
              <div className="col-span-2 lg:col-span-2">Status</div>
              <div className="col-span-2 lg:col-span-2">Segurança (2FA)</div>
              <div className="hidden lg:block lg:col-span-1 text-right">Ações</div>
            </div>

            {/* Linhas de Membros com Rolagem Suave */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Nenhum membro encontrado</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Ajuste os filtros de busca ou verifique se há novas solicitações de acesso.
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_DEFINITIONS[user.role || 'doctor'] || ROLE_DEFINITIONS.doctor;
                  const statusConfig = STATUS_DEFINITIONS[user.status || 'approved'] || STATUS_DEFINITIONS.approved;
                  const isSelf = currentUser && (currentUser.id === user.id || currentUser.email === user.email);

                  const initials = (user.name || 'US')
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={user.id}
                      className="px-4 sm:px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center gap-3"
                    >
                      {/* Coluna 1: Membro / Usuário */}
                      <div className="col-span-5 lg:col-span-4 flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 font-bold text-xs flex items-center justify-center shrink-0 tracking-wider">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {user.name || 'Sem nome'}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <Mail size={11} className="shrink-0 text-slate-400" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: Cargo / Função */}
                      <div className="col-span-3 lg:col-span-3 flex items-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleConfig.badgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${roleConfig.dotColor}`} />
                          <span className="truncate">{roleConfig.label}</span>
                        </span>
                      </div>

                      {/* Coluna 3: Status */}
                      <div className="col-span-2 lg:col-span-2 flex items-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                          <span>{statusConfig.label}</span>
                        </span>
                      </div>

                      {/* Coluna 4: Segurança 2FA */}
                      <div className="col-span-2 lg:col-span-2 flex items-center">
                        {user.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                            <span>2FA Ativo</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-normal bg-slate-50 text-slate-500 border border-slate-200">
                            <Lock size={11} className="text-slate-400 shrink-0" />
                            <span>2FA Inativo</span>
                          </span>
                        )}
                      </div>

                      {/* Coluna 5: Ações do Administrador */}
                      <div className="col-span-12 lg:col-span-1 flex items-center justify-end gap-1 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        {isAdmin && (
                          <div className="flex items-center gap-0.5">
                            {/* Reiniciar 2FA (MFA) */}
                            <button
                              onClick={() => setResettingMFAUser(user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Reiniciar 2FA (MFA) deste membro para novo pareamento"
                            >
                              <RotateCcw size={14} />
                            </button>

                            {/* Redefinir Senha */}
                            <button
                              onClick={() => {
                                setResettingUser(user);
                                setNewAdminPassword('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Redefinir senha de acesso deste membro"
                            >
                              <KeyRound size={14} />
                            </button>

                            {/* Editar Cargo / Status */}
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Editar cargo e status"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => {
                                setDeletingUser(user);
                                setDeleteConfirmationInput('');
                              }}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition ${
                                isSelf
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSelf ? 'Você não pode excluir sua própria conta' : 'Excluir membro permanentemente'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TRILHA DE AUDITORIA LGPD & CFM */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Banner LGPD */}
          <div className="shrink-0 mb-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3 text-slate-800">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Trilha de Auditoria Imutável: </span>
                Todas as ações clínicas e administrativas são registradas com carimbo de tempo, IP e identificação do autor (CFM & LGPD).
              </div>
            </div>
            <span className="text-2xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 shrink-0">
              Audit Logs Ativos
            </span>
          </div>

          {/* Busca e Filtro de Ação */}
          <div className="shrink-0 bg-white border border-slate-200/80 rounded-2xl p-2.5 mb-3 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por usuário, ação, detalhes ou IP..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>

            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="all">Todas as Ações</option>
              <option value="LOGIN_SUCCESS">Login Sucesso</option>
              <option value="LOGIN_FAILED">Falha de Senha</option>
              <option value="LOGIN_BLOCKED_RATE_LIMIT">Bloqueio Força Bruta</option>
              <option value="UPDATE_PATIENTS">Prontuários Atualizados</option>
              <option value="APPROVE_ACCESS">Acesso Aprovado</option>
              <option value="REJECT_ACCESS">Acesso Recusado</option>
              <option value="UPDATE_USER">Usuário Alterado</option>
              <option value="DELETE_USER">Usuário Excluído</option>
              <option value="ADMIN_RESET_PASSWORD">Senha Redefinida p/ Admin</option>
              <option value="PASSWORD_RESET_SUCCESS">Senha Alterada</option>
              <option value="ADMIN_RESET_USER_MFA">2FA Reiniciado p/ Admin</option>
              <option value="MFA_ACTIVATED">2FA Configurado</option>
            </select>
          </div>

          {/* Tabela de Logs de Auditoria */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoadingLogs ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <RefreshCw size={24} className="animate-spin mx-auto text-slate-400" />
                  <p className="text-xs">Carregando trilha de auditoria...</p>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <History size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Nenhum evento registrado com esses filtros</p>
                  <p className="text-xs text-slate-400">As operações realizadas na clínica aparecerão aqui em tempo real.</p>
                </div>
              ) : (
                filteredAuditLogs.map((log) => {
                  const badge = ACTION_BADGES[log.action] || { label: log.action, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
                  return (
                    <div
                      key={log.id}
                      className="px-4 py-3 hover:bg-slate-50/80 transition-colors text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-2xs font-mono text-slate-400 shrink-0">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-semibold border shrink-0 ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900">{log.userName || 'Sistema'}</span>
                          {log.userRole && (
                            <span className="ml-1.5 text-2xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase font-semibold">
                              {log.userRole}
                            </span>
                          )}
                          <p className="text-slate-600 text-2xs mt-0.5 truncate">{log.details}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-2xs font-mono text-slate-400">
                        <span>IP: {log.ip || '127.0.0.1'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REDEFINIR SENHA DE MEMBRO (ADMIN) */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Redefinir Senha do Membro</h3>
              </div>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Defina uma nova senha de acesso para <strong>{resettingUser.name}</strong> ({resettingUser.email}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nova Senha (Mínimo 6 dígitos)
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="Digite a nova senha..."
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-2xs text-slate-600">
                A nova senha será salva com hash PBKDF2 com 210.000 iterações (OWASP). Informe a nova senha de forma segura ao profissional.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !newAdminPassword || newAdminPassword.length < 6}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isResetting && <RefreshCw size={12} className="animate-spin" />}
                  <span>Salvar Nova Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR CARGO E STATUS */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Editar Membro</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cargo / Nível de Acesso
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="doctor">Doutor(a) / Terapeuta (Prontuário & Agenda)</option>
                  <option value="reception">Recepção / Secretária (Agenda & Pacientes)</option>
                  <option value="billing">Financeiro (Apenas Dashboard Financeiro)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status da Conta
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="approved">Ativo (Acesso Liberado)</option>
                  <option value="pending">Pendente (Aguardando Aprovação)</option>
                  <option value="rejected">Recusado (Bloqueado)</option>
                </select>
              </div>

              {/* Seção 2FA dentro do Modal de Edição */}
              {isAdmin && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Autenticação em Duas Etapas (2FA)</p>
                    <p className="text-2xs text-slate-500">
                      {editingUser.mfaEnabled
                        ? 'O 2FA está ativo nesta conta.'
                        : 'O 2FA está inativo ou pendente de configuração.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingUser;
                      setEditingUser(null);
                      setResettingMFAUser(target);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Reiniciar 2FA deste usuário"
                  >
                    <RotateCcw size={12} />
                    <span>Reiniciar 2FA</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdating && <RefreshCw size={12} className="animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO PERMANENTE COM DIGITAÇÃO "EXCLUIR" */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600 mb-2">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-bold text-slate-900">Excluir Membro Definitivamente?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Você está prestes a excluir permanentemente o cadastro de <strong>{deletingUser.name}</strong> ({deletingUser.email}) do banco de dados. Esta ação é irreversível.
            </p>

            <div className="mb-4">
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Para confirmar a exclusão, digite <span className="text-rose-600 font-extrabold">EXCLUIR</span> abaixo:
              </label>
              <input
                type="text"
                placeholder="EXCLUIR"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || deleteConfirmationInput !== 'EXCLUIR'}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REINICIAR 2FA / MFA (EXCLUSIVO ADMINISTRADOR) */}
      {/* ========================================================================= */}
      {resettingMFAUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-slate-900 mb-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reiniciar Autenticação em Duas Etapas (2FA)</h3>
                <p className="text-2xs text-slate-500">Controle de Segurança de Acesso - Exclusivo Administrador</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Deseja reiniciar a autenticação em duas etapas da conta de <strong>{resettingMFAUser.name}</strong> (<span className="font-mono text-slate-700 font-semibold">{resettingMFAUser.email}</span>)?
            </p>

            <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-2xs text-indigo-950 space-y-1.5 mb-4">
              <p className="font-bold text-indigo-900">O que acontece ao reiniciar:</p>
              <ul className="list-disc list-inside space-y-1 text-indigo-900/90 leading-relaxed">
                <li>O pareamento atual com o celular deste usuário e os códigos de backup serão <strong>revogados</strong>.</li>
                <li>No próximo login com e-mail e senha, o sistema ViguMed exigirá <strong>obrigatoriamente</strong> a leitura de um <strong>NOVO QR Code</strong> para cadastrar um novo aplicativo.</li>
                <li>Utilize esta opção caso a pessoa tenha perdido o celular, trocado de aparelho ou se o código não estiver sincronizando.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResettingMFAUser(null)}
                className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetMFA}
                disabled={isResettingMFA}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-900/10"
              >
                {isResettingMFA ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                <span>Confirmar e Reiniciar 2FA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
