import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Stethoscope,
  Menu,
  Bell,
  UserCog,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Administrador',
  doctor: 'Doutor(a)',
  reception: 'Recepção',
  billing: 'Financeiro',
};

const ROLE_COLORS = {
  admin: 'bg-rose-500',
  doctor: 'bg-blue-500',
  reception: 'bg-emerald-500',
  billing: 'bg-amber-500',
};

const Sidebar = ({
  activeView = 'dashboard',
  setActiveView,
  isCollapsed = false,
  setIsCollapsed,
  patientCount = 0,
  onOpenNotifications,
  pendingRequestsCount = 0,
  user = null,
  onLogout = null,
  onOpenMFA = null,
}) => {
  const userRole = user?.role || 'doctor';

  const allNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'doctor', 'reception'],
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      allowedRoles: ['admin', 'doctor', 'reception'],
    },
    {
      id: 'patients',
      label: 'Pacientes',
      icon: Users,
      badge: patientCount > 0 ? patientCount : null,
      allowedRoles: ['admin', 'doctor', 'reception'],
    },
    {
      id: 'billing',
      label: 'Financeiro',
      icon: DollarSign,
      allowedRoles: ['admin', 'billing'],
    },
    {
      id: 'users',
      label: 'Equipe & Acessos',
      icon: UserCog,
      allowedRoles: ['admin'],
    },
  ];

  const navItems = allNavItems.filter((item) => item.allowedRoles.includes(userRole));

  return (
    <aside
      className={`h-full min-h-screen bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 ${isCollapsed ? 'w-20' : 'w-60'
        }`}
    >
      {/* Topo: Logo & Nome ViguMed */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Stethoscope size={20} className="text-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                ViguMed
              </h1>
              <p className="text-[11px] text-slate-400 truncate">Prontuário & Gestão Clínica</p>
            </div>
          )}
        </div>

        {/* Menu de Navegação Funcional */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-800 text-emerald-300' : 'bg-slate-100 text-slate-700'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Usuário Logado, Notificações, Recolher & Sair */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        {/* Chip do Usuário Logado */}
        {user && (
          <div
            className={`px-3 py-2 mb-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 transition ${isCollapsed ? 'justify-center p-2' : 'justify-between'
              }`}
            title={`${user.name} (${ROLE_LABELS[userRole] || userRole})`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${ROLE_COLORS[userRole] || 'bg-slate-400'}`}
              />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {ROLE_LABELS[userRole] || userRole}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão de Notificações com Badge */}
        <button
          onClick={onOpenNotifications}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer relative ${pendingRequestsCount > 0
            ? 'bg-amber-50/90 text-amber-900 hover:bg-amber-100 border border-amber-200/80 shadow-2xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          title={
            isCollapsed
              ? pendingRequestsCount > 0
                ? `Notificações (${pendingRequestsCount} pendentes)`
                : 'Central de Notificações'
              : undefined
          }
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 flex items-center justify-center">
              <Bell
                size={18}
                className={pendingRequestsCount > 0 ? 'text-amber-600' : 'text-slate-500'}
              />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            {!isCollapsed && <span>Notificações</span>}
          </div>

          {!isCollapsed && pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
              {pendingRequestsCount} {pendingRequestsCount === 1 ? 'nova' : 'novas'}
            </span>
          )}
        </button>

        {/* Botão Segurança / 2FA */}
        {onOpenMFA && (
          <button
            onClick={onOpenMFA}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
            title={
              isCollapsed
                ? user?.mfaEnabled
                  ? '2FA Ativo'
                  : 'Ativar 2FA'
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={18}
                className={
                  user?.mfaEnabled
                    ? 'text-emerald-600 shrink-0'
                    : 'text-slate-400 shrink-0'
                }
              />

              {!isCollapsed && <span>Segurança (2FA)</span>}
            </div>

            {!isCollapsed && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${user?.mfaEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
                  }`}
              >
                {user?.mfaEnabled ? 'Ativo' : 'Ativar'}
              </span>
            )}
          </button>
        )}

        {/* Botão Recolher */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition font-medium cursor-pointer"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          <Menu size={18} className="shrink-0" />
          {!isCollapsed && <span>Recolher</span>}
        </button>

        {/* Botão Sair / Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition font-medium cursor-pointer"
            title={isCollapsed ? 'Sair do Sistema' : undefined}
          >
            <LogOut size={18} className="shrink-0 text-rose-500" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;