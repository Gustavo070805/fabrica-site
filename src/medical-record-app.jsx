import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import PatientList from './components/PatientList';
import PatientDetails from './components/PatientDetails';
import PatientModal from './components/PatientModal';
import AuthPage from './components/AuthPage';
import FinancialDashboard from './components/FinancialDashboard';
import AgendaView from './components/AgendaView';
import NotificationModal from './components/NotificationModal';
import AppointmentAlertToast from './components/AppointmentAlertToast';
import UsersManagementView from './components/UsersManagementView';
import MFASetupModal from './components/MFASetupModal';
import {
  playAppointmentChime,
  requestNotificationPermission,
  sendBrowserNotification,
} from './utils/soundAlert';

const LOCAL_STORAGE_KEY = 'medical_records';
const AUTH_STORAGE_KEY = 'medical_records_auth_user';

export const ROLE_ALLOWED_VIEWS = {
  admin: ['dashboard', 'agenda', 'patients', 'billing', 'users'],
  doctor: ['dashboard', 'agenda', 'patients'],
  reception: ['dashboard', 'agenda', 'patients'],
  billing: ['billing', 'patients'],
};

const MedicalRecordApp = () => {
  // Estado do Usuário Autenticado
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error('Erro ao ler usuário salvo:', e);
      return null;
    }
  });

  const handleLogout = (confirm = true) => {
    if (!confirm || window.confirm('Deseja realmente sair da sua conta?')) {
      setCurrentUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  // Lista de Pacientes
  const [patients, setPatients] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Controle de Navegação e Modais
  const [activeView, setActiveView] = useState(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      const role = parsed?.role || 'doctor';
      const allowed = ROLE_ALLOWED_VIEWS[role] || ['dashboard'];
      return allowed[0] || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [allClinicUsers, setAllClinicUsers] = useState([]);
  const [activeAppointmentAlert, setActiveAppointmentAlert] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => new Set());
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [viewingRecordId, setViewingRecordId] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'saving' | 'offline'
  const [deletingPatient, setDeletingPatient] = useState(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [deletePatientError, setDeletePatientError] = useState('');
  const [returnToView, setReturnToView] = useState(null);

  // Redirecionamento automático se a tela ativa não for permitida para o cargo do usuário
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role || 'doctor';
    const allowed = ROLE_ALLOWED_VIEWS[role] || ['dashboard'];
    if (!allowed.includes(activeView)) {
      setActiveView(allowed[0]);
    }
  }, [currentUser, activeView]);

  const handleNavigate = (view) => {
    const role = currentUser?.role || 'doctor';
    const allowed = ROLE_ALLOWED_VIEWS[role] || ['dashboard'];
    if (!allowed.includes(view)) {
      setActiveView(allowed[0]);
      return;
    }
    setActiveView(view);
    if (view === 'patients') {
      setViewingRecordId(null);
    }
  };

  // Sincronizar dados com o Upstash na montagem
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    async function fetchFromCloud() {
      try {
        const headers = currentUser?.token
          ? { Authorization: `Bearer ${currentUser.token}` }
          : {};
        const res = await fetch('/api/patients', { headers });

        if (res.status === 401) {
          console.warn('Sessão expirada ou não autorizada. Redirecionando para login.');
          handleLogout(false);
          return;
        }

        if (res.ok) {
          const remotePatients = await res.json();
          if (Array.isArray(remotePatients)) {
            if (remotePatients.length > 0) {
              if (isMounted) {
                setPatients(remotePatients);
                setSelectedPatientId((prev) => prev || remotePatients[0].id);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remotePatients));
              }
            } else {
              const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
              if (localSaved) {
                const parsedLocal = JSON.parse(localSaved);
                if (parsedLocal.length > 0) {
                  await syncToCloud(parsedLocal);
                }
              }
            }
            if (isMounted) setSyncStatus('synced');
          }
        }
      } catch (err) {
        console.warn('Conexão remota indisponível, usando dados locais:', err);
        if (isMounted) setSyncStatus('offline');
      }
    }

    fetchFromCloud();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Salvar no Upstash e no LocalStorage
  const syncToCloud = async (newPatients) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPatients));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }

    setSyncStatus('saving');
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers,
        body: JSON.stringify(newPatients),
      });

      if (res.status === 401) {
        console.warn('Sessão não autorizada ao sincronizar.');
        handleLogout(false);
        return;
      }

      if (res.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch (err) {
      console.warn('Falha ao sincronizar com a nuvem:', err);
      setSyncStatus('offline');
    }
  };

  // Paciente selecionado derivado
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || null;

  // Auto-selecionar o primeiro se houver pacientes e nenhum selecionado
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Buscar solicitações de acesso e usuários do sistema (somente admin)
  const fetchAccessRequests = async () => {
    if (currentUser?.role !== 'admin') {
      setAccessRequests([]);
      setAllClinicUsers([]);
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'get_access_requests' }),
      });

      if (res.status === 401) {
        handleLogout(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const pending = data.requests || [];
        const allUsers = data.allUsers || [];
        setAccessRequests(pending);
        setAllClinicUsers(allUsers);

        // Sincronizar role/status do currentUser se houver atualização remota
        if (currentUser) {
          const fresh = allUsers.find(
            (u) => u.id === currentUser.id || (u.email && u.email.toLowerCase() === currentUser.email?.toLowerCase())
          );
          if (fresh && (fresh.role !== currentUser.role || fresh.status !== currentUser.status)) {
            const updatedUser = { ...currentUser, role: fresh.role, status: fresh.status };
            setCurrentUser(updatedUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          }
        }
      }
    } catch (err) {
      console.warn('Falha ao consultar solicitações de acesso:', err);
    }
  };

  // Monitorar solicitações de novos acessos periodicamente (APENAS ADMINISTRADORES)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setAccessRequests([]);
      setAllClinicUsers([]);
      return;
    }
    fetchAccessRequests();

    const interval = setInterval(fetchAccessRequests, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Aprovar solicitação de acesso
  const handleApproveAccess = async (targetUserId, assignedRole = 'doctor') => {
    const headers = {
      'Content-Type': 'application/json',
      ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
    };
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'approve_access',
        targetUserId,
        assignedRole,
        reviewerName: currentUser?.name || 'Profissional Autorizado',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao aprovar acesso.');
    }

    await fetchAccessRequests();
  };

  // Recusar solicitação de acesso
  const handleRejectAccess = async (targetUserId) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
    };
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'reject_access',
        targetUserId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro ao recusar acesso.');
    }

    await fetchAccessRequests();
  };

  // Atualizar dados de usuário (Nome, Cargo, Status) - Somente Admin no backend
  const handleUpdateUser = async (targetUserId, { newName, newRole, newStatus }) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_user',
          targetUserId,
          requesterUserId: currentUser?.id,
          newName,
          newRole,
          newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao atualizar dados do usuário.' };
      }

      await fetchAccessRequests();

      // Se o usuário editado foi o próprio logado, atualizamos localmente
      if (currentUser && currentUser.id === targetUserId && data.user) {
        const updated = {
          ...currentUser,
          name: data.user.name,
          role: data.user.role,
          status: data.user.status,
        };
        setCurrentUser(updated);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      }

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao atualizar usuário.' };
    }
  };

  // Excluir usuário definitivamente do banco - Somente Admin no backend
  const handleDeleteUser = async (targetUserId) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete_user',
          targetUserId,
          requesterUserId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao excluir usuário do banco.' };
      }

      await fetchAccessRequests();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao excluir usuário.' };
    }
  };

  // Redefinir senha de membro pelo Administrador (OWASP PBKDF2 210k)
  const handleAdminResetPassword = async (targetUserId, newPassword) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'admin_reset_user_password',
          targetUserId,
          requesterUserId: currentUser?.id,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao redefinir senha do usuário.' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Erro de conexão ao redefinir senha.' };
    }
  };

  // Desativar 2FA de membro pelo Administrador (Emergência)
  const handleAdminResetMFA = async (targetUserId) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'admin_reset_user_mfa',
          targetUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha ao desativar 2FA do usuário.' };
      }
      await fetchAccessRequests();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Erro ao desativar 2FA.' };
    }
  };

  // Buscar trilha de auditoria LGPD / CFM
  const handleFetchAuditLogs = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_audit_logs',
          requesterUserId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.logs) {
        return data.logs;
      }
      return [];
    } catch (err) {
      console.error('Erro ao buscar logs de auditoria:', err);
      return [];
    }
  };

  // Monitorar consultas de hoje e alertar com 10 minutos de antecedência (apenas para equipe clínica)
  useEffect(() => {
    if (!currentUser) return;
    const isClinical = ['admin', 'doctor', 'reception'].includes(currentUser.role);
    if (!isClinical) return;

    // Solicitar permissão de notificação nativa no navegador se ainda não concedida
    requestNotificationPermission();

    const checkAppointments = () => {
      const today = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const list = [];
      patients.forEach((p) => {
        (p.consultas || []).forEach((c) => {
          if (c.data === todayIso && c.status !== 'cancelado' && c.status !== 'concluido') {
            const [hStr, mStr] = (c.hora || '00:00').split(':');
            const aptDate = new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              parseInt(hStr, 10),
              parseInt(mStr, 10),
              0
            );
            const diffMinutes = Math.round((aptDate.getTime() - today.getTime()) / 60000);

            list.push({
              ...c,
              patientId: p.id,
              patientName: p.nome,
              patientPhone: p.telefone,
              minutesLeft: diffMinutes,
            });
          }
        });
      });

      list.sort((a, b) => a.hora.localeCompare(b.hora));
      setTodayAppointments(list);

      // Encontrar consulta que esteja a 10 minutos ou menos (entre 10 min e -5 min)
      const urgent = list.find(
        (a) => a.minutesLeft <= 10 && a.minutesLeft >= -5 && !dismissedAlerts.has(a.id)
      );

      if (urgent) {
        if (!activeAppointmentAlert || activeAppointmentAlert.appointmentId !== urgent.id) {
          setActiveAppointmentAlert({
            appointmentId: urgent.id,
            patientId: urgent.patientId,
            patientName: urgent.patientName,
            hora: urgent.hora,
            minutesLeft: urgent.minutesLeft,
            tipo: urgent.tipo,
          });

          // Tocar chime sonoro suave
          playAppointmentChime();

          // Disparar notificação nativa do navegador
          sendBrowserNotification(
            'ViguMed: Consulta em 10 minutos!',
            `Paciente ${urgent.patientName} às ${urgent.hora} (${urgent.minutesLeft <= 0 ? 'iniciando agora' : `em ${urgent.minutesLeft} min`
            }).`
          );
        }
      }
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 20000);
    return () => clearInterval(interval);
  }, [patients, currentUser, dismissedAlerts, activeAppointmentAlert]);

  // Login e Logout
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  // Adicionar paciente
  const handleAddPatient = (patientFormData) => {
    const newPatient = {
      id: Date.now(),
      ...patientFormData,
      avaliacoes: [],
      evolucoes: [],
      financeiro: { valor_sessao: 0, pagamento: 0 },
    };

    const updated = [...patients, newPatient];
    setPatients(updated);
    setSelectedPatientId(newPatient.id);
    syncToCloud(updated);
  };

  // Solicitar exclusão de paciente (Abre modal de segurança com digitação EXCLUIR)
  const handleRequestDeletePatient = (patientOrId) => {
    const patientObj =
      typeof patientOrId === 'object' && patientOrId !== null
        ? patientOrId
        : patients.find((p) => p.id === patientOrId || String(p.id) === String(patientOrId));

    if (patientObj) {
      setDeletingPatient(patientObj);
      setDeleteConfirmationInput('');
      setDeletePatientError('');
    }
  };

  const handleDeletePatient = handleRequestDeletePatient;

  // Confirmar exclusão permanente do prontuário no banco de dados
  const handleConfirmDeletePatient = async () => {
    if (!deletingPatient) return;
    if (deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR') {
      setDeletePatientError('Digite EXCLUIR para confirmar a exclusão definitiva.');
      return;
    }

    setIsDeletingPatient(true);
    setDeletePatientError('');

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'delete_patient',
          patientId: deletingPatient.id,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir paciente no servidor.');
      }

      // Remover do estado local e localStorage
      const updated = patients.filter(
        (p) => String(p.id) !== String(deletingPatient.id) && p.id !== deletingPatient.id
      );
      setPatients(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }

      // Se o paciente excluído estava selecionado ou em visualização
      if (
        selectedPatientId === deletingPatient.id ||
        String(selectedPatientId) === String(deletingPatient.id)
      ) {
        setSelectedPatientId(updated.length > 0 ? updated[0].id : null);
      }
      if (
        viewingRecordId === deletingPatient.id ||
        String(viewingRecordId) === String(deletingPatient.id)
      ) {
        setViewingRecordId(null);
      }

      setDeletingPatient(null);
      setDeleteConfirmationInput('');
    } catch (err) {
      console.error('Falha ao excluir paciente:', err);
      setDeletePatientError(err.message || 'Falha ao excluir paciente.');
    } finally {
      setIsDeletingPatient(false);
    }
  };

  // Avaliação clínica
  const handleAddAssessment = (patientId, assessmentData) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          avaliacoes: [
            ...(p.avaliacoes || []),
            {
              id: Date.now(),
              ...assessmentData,
              data: new Date().toLocaleDateString('pt-BR'),
            },
          ],
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  // Evolução diária
  const handleAddEvolution = (patientId, evolutionData) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          evolucoes: [...(p.evolucoes || []), { id: Date.now(), ...evolutionData }],
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  // Dados financeiros
  const handleUpdateFinancial = (patientId, financialData) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          financeiro: financialData,
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  // Atualizar dados cadastrais do paciente
  const handleUpdatePatient = (patientId, patientData) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          ...patientData,
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  // Agendamento / Consultas
  const handleAddAppointment = (patientId, appointmentData) => {
    // Validação preventiva: não permitir agendar para datas anteriores a hoje
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    if (appointmentData.data < todayIso) {
      alert('Não é permitido agendar consultas para datas retroativas.');
      return;
    }

    // Validação preventiva: não permitir duas consultas no mesmo dia e horário
    const allAppointments = patients.flatMap((p) => p.consultas || []);
    const conflict = allAppointments.find(
      (c) =>
        c.data === appointmentData.data &&
        c.hora === appointmentData.hora &&
        c.status !== 'cancelado'
    );

    if (conflict) {
      alert('Horário indisponível! Já existe uma consulta agendada para este mesmo dia e horário.');
      return;
    }

    const updated = patients.map((p) => {
      if (p.id === Number(patientId) || p.id === patientId) {
        return {
          ...p,
          consultas: [...(p.consultas || []), appointmentData],
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  const handleUpdateAppointmentStatus = (patientId, appointmentId, status) => {
    const updated = patients.map((p) => {
      if (p.id === Number(patientId) || p.id === patientId) {
        return {
          ...p,
          consultas: (p.consultas || []).map((c) =>
            c.id === appointmentId ? { ...c, status } : c
          ),
        };
      }
      return p;
    });
    setPatients(updated);
    syncToCloud(updated);
  };

  const handleDeleteAppointment = (patientId, appointmentId) => {
    if (window.confirm('Deseja realmente desmarcar esta consulta?')) {
      const updated = patients.map((p) => {
        if (p.id === Number(patientId) || p.id === patientId) {
          return {
            ...p,
            consultas: (p.consultas || []).filter((c) => c.id !== appointmentId),
          };
        }
        return p;
      });
      setPatients(updated);
      syncToCloud(updated);
    }
  };

  // Se não estiver autenticado, exibe a tela de login
  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Barra Lateral ViguMed */}
      <div className="no-print h-screen shrink-0 flex flex-col z-30">
        <Sidebar
          activeView={activeView}
          setActiveView={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          patientCount={patients.length}
          user={currentUser}
          onLogout={handleLogout}
          onOpenMFA={() => setIsMFAModalOpen(true)}
          onOpenNotifications={() => {
            fetchAccessRequests();
            setIsNotificationModalOpen(true);
          }}
          pendingRequestsCount={
            (currentUser?.role === 'admin' ? accessRequests.length : 0) +
            (['admin', 'doctor', 'reception'].includes(currentUser?.role)
              ? todayAppointments.filter(
                (a) => a.minutesLeft !== undefined && a.minutesLeft <= 10 && a.minutesLeft >= -5
              ).length
              : 0)
          }
        />
      </div>

      {/* Conteúdo Principal com Scroll Próprio */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main
          className={`flex-1 flex flex-col ${activeView === 'agenda' || (activeView === 'patients' && !viewingRecordId) || activeView === 'users'
              ? 'overflow-hidden p-4 sm:p-6 pb-2 sm:pb-3'
              : activeView === 'dashboard'
                ? 'overflow-y-auto lg:overflow-hidden p-3.5 sm:p-5 lg:p-6'
                : 'overflow-y-auto p-4 sm:p-6 lg:p-8'
            }`}
        >
          <div
            className={`max-w-7xl mx-auto w-full ${activeView === 'agenda' || (activeView === 'patients' && !viewingRecordId) || activeView === 'users' || activeView === 'dashboard'
                ? 'h-full flex flex-col overflow-hidden'
                : ''
              }`}
          >
            {/* 1. VISÃO DASHBOARD */}
            {activeView === 'dashboard' && ['admin', 'doctor', 'reception'].includes(currentUser?.role) && (
              <DashboardView
                patients={patients}
                user={currentUser}
                syncStatus={syncStatus}
                onLogout={handleLogout}
                onOpenNewPatient={() => setIsModalOpen(true)}
                onSelectPatientForRecord={(id) => {
                  setSelectedPatientId(id);
                  setViewingRecordId(id);
                  setActiveTab('dados');
                  setReturnToView('dashboard');
                  setActiveView('patients');
                }}
                onViewAllPatients={() => {
                  setActiveView('patients');
                  setViewingRecordId(null);
                  setReturnToView(null);
                }}
                onOpenAgenda={() => setActiveView('agenda')}
              />
            )}

            {/* 2. VISÃO AGENDA DE CONSULTAS */}
            {activeView === 'agenda' && ['admin', 'doctor', 'reception'].includes(currentUser?.role) && (
              <AgendaView
                patients={patients}
                onOpenRecord={(id) => {
                  setSelectedPatientId(id);
                  setViewingRecordId(id);
                  setActiveTab('dados');
                  setReturnToView('agenda');
                  setActiveView('patients');
                }}
                onAddAppointment={handleAddAppointment}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onDeleteAppointment={handleDeleteAppointment}
              />
            )}

            {/* 3. VISÃO PACIENTES & PRONTUÁRIOS (DIRETÓRIO COM BUSCA OU FICHA DETALHADA) */}
            {activeView === 'patients' && ['admin', 'doctor', 'reception', 'billing'].includes(currentUser?.role) && (
              viewingRecordId && selectedPatient ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between no-print">
                    <div>
                      <h1 className="text-xl font-bold text-slate-900">
                        {currentUser?.role === 'billing' ? 'Ficha Cadastral e Financeira' : 'Prontuário Médico'}
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentUser?.role === 'billing'
                          ? 'Dados cadastrais, contato e histórico de pagamentos do paciente'
                          : 'Ficha clínica, diagnósticos, histórico de consultas e financeiro do paciente'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setViewingRecordId(null);
                        if (returnToView) {
                          setActiveView(returnToView);
                          setReturnToView(null);
                        } else if (currentUser?.role === 'billing') {
                          setActiveView('billing');
                        }
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      ← Voltar {returnToView === 'billing' || currentUser?.role === 'billing' ? 'para o Financeiro' : returnToView === 'agenda' ? 'para a Agenda' : returnToView === 'dashboard' ? 'ao Dashboard' : 'para Lista de Pacientes'}
                    </button>
                  </div>

                  <PatientDetails
                    patient={selectedPatient}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onAddAssessment={handleAddAssessment}
                    onAddEvolution={handleAddEvolution}
                    onUpdateFinancial={handleUpdateFinancial}
                    onUpdatePatient={handleUpdatePatient}
                    onDeletePatient={handleRequestDeletePatient}
                    currentUser={currentUser}
                  />
                </div>
              ) : currentUser?.role === 'billing' ? (
                (() => {
                  setActiveView('billing');
                  return null;
                })()
              ) : (
                <PatientList
                  patients={patients}
                  selectedPatientId={selectedPatientId}
                  onSelectPatient={(id) => {
                    setSelectedPatientId(id);
                    setViewingRecordId(id);
                    setActiveTab('dados');
                    setReturnToView(null);
                  }}
                  onDeletePatient={handleDeletePatient}
                  onOpenNewPatient={() => setIsModalOpen(true)}
                />
              )
            )}

            {/* 4. VISÃO FINANCEIRO / DASHBOARD DA CLÍNICA */}
            {activeView === 'billing' && ['admin', 'billing'].includes(currentUser?.role) && (
              <FinancialDashboard
                patients={patients}
                onUpdateFinancial={handleUpdateFinancial}
                onSelectPatientForRecord={(id) => {
                  setSelectedPatientId(id);
                  setViewingRecordId(id);
                  setActiveTab('financeiro');
                  setReturnToView('billing');
                  setActiveView('patients');
                }}
              />
            )}

            {/* 5. VISÃO EQUIPE & GESTÃO DE USUÁRIOS */}
            {activeView === 'users' && currentUser?.role === 'admin' && (
              <UsersManagementView
                users={allClinicUsers}
                currentUser={currentUser}
                onRefreshUsers={fetchAccessRequests}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onAdminResetPassword={handleAdminResetPassword}
                onAdminResetMFA={handleAdminResetMFA}
                onFetchAuditLogs={handleFetchAuditLogs}
              />
            )}

            {/* 6. VISÃO RELATÓRIOS / REPORTS OU SETTINGS */}
            {(activeView === 'reports' || activeView === 'settings') && currentUser?.role === 'admin' && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3">
                <h2 className="text-lg font-bold text-slate-900 capitalize">{activeView}</h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Módulo de {activeView} do MediCare Admin em operação integrada com o Upstash Redis.
                </p>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Voltar ao Dashboard
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal de Cadastro Rápido */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPatient={handleAddPatient}
      />

      {/* Modal de Notificações e Solicitações de Acesso */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        requests={accessRequests}
        allUsers={allClinicUsers}
        upcomingAppointments={todayAppointments}
        onApprove={handleApproveAccess}
        onReject={handleRejectAccess}
        onOpenUsers={() => setActiveView('users')}
        currentUser={currentUser}
        onOpenRecord={(id) => {
          setSelectedPatientId(id);
          setViewingRecordId(id);
          setActiveView('patients');
        }}
        onOpenAgenda={() => setActiveView('agenda')}
      />

      {/* Alerta Flutuante de Consulta Próxima (10 Minutos de Antecedência) */}
      <AppointmentAlertToast
        alert={activeAppointmentAlert}
        onOpenRecord={(id) => {
          setSelectedPatientId(id);
          setViewingRecordId(id);
          setActiveView('patients');
          setActiveAppointmentAlert(null);
        }}
        onOpenAgenda={() => {
          setActiveView('agenda');
          setActiveAppointmentAlert(null);
        }}
        onDismiss={() => {
          if (activeAppointmentAlert) {
            setDismissedAlerts((prev) => new Set([...prev, activeAppointmentAlert.appointmentId]));
          }
          setActiveAppointmentAlert(null);
        }}
      />

      {/* Modal de Configuração de 2FA / MFA (TOTP) */}
      <MFASetupModal
        isOpen={isMFAModalOpen}
        onClose={() => setIsMFAModalOpen(false)}
        currentUser={currentUser}
        onMFAStatusChanged={(enabled) => {
          const updated = { ...currentUser, mfaEnabled: enabled };
          setCurrentUser(updated);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
          fetchAccessRequests();
        }}
      />

      {/* Modal: Confirmar Exclusão Permanente de Prontuário */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir Prontuário Definitivamente?</h3>
                <p className="text-[11px] text-slate-500">Ação irreversível de segurança</p>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3.5 my-3">
              <p className="text-xs text-rose-950 leading-relaxed font-medium">
                Você está prestes a excluir permanentemente o prontuário de{' '}
                <strong className="text-rose-700">{deletingPatient.nome}</strong>
                {deletingPatient.cpf ? ` (CPF: ${deletingPatient.cpf})` : ''}.
              </p>
              <p className="text-[11px] text-rose-800 mt-1.5 leading-relaxed">
                Todo o histórico de consultas, evoluções diárias e avaliações clínicas será apagado do banco de dados na nuvem.
              </p>
            </div>

            {deletePatientError && (
              <div className="mb-3 p-2.5 bg-rose-100/70 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold">
                {deletePatientError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Para confirmar a exclusão, digite <span className="text-rose-600 font-extrabold">EXCLUIR</span> abaixo:
              </label>
              <input
                type="text"
                placeholder="EXCLUIR"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    deleteConfirmationInput.trim().toUpperCase() === 'EXCLUIR' &&
                    !isDeletingPatient
                  ) {
                    handleConfirmDeletePatient();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingPatient) {
                    setDeletingPatient(null);
                    setDeleteConfirmationInput('');
                    setDeletePatientError('');
                  }
                }}
                disabled={isDeletingPatient}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePatient}
                disabled={isDeletingPatient || deleteConfirmationInput.trim().toUpperCase() !== 'EXCLUIR'}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isDeletingPatient ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordApp;
