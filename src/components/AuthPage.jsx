import React, { useState } from 'react';
import {
  Stethoscope,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  KeyRound,
  Clock,
  AlertCircle,
  ShieldAlert,
  Smartphone,
  Download,
  Copy,
  Check
} from 'lucide-react';

const AuthPage = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset' | 'mfa'
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [signupPendingInfo, setSignupPendingInfo] = useState(null);

  // MFA State (Verificação e Configuração Obrigatória)
  const [tempMfaToken, setTempMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [mfaMode, setMfaMode] = useState('verify'); // 'verify' | 'setup'
  const [mfaSetupData, setMfaSetupData] = useState(null); // { secret, qrCodeDataUrl, otpauthUrl }
  const [mfaSetupStep, setMfaSetupStep] = useState('scan'); // 'scan' | 'backup_codes'
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [confirmedSavedCodes, setConfirmedSavedCodes] = useState(false);
  const [completedAuthPayload, setCompletedAuthPayload] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    currentPassword: '',
    newPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'signup' && !formData.name.trim()) {
      setErrorMessage('Por favor, informe seu nome e titulação (ex: Dr(a). Nome).');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Por favor, preencha o seu e-mail.');
      return;
    }

    if (mode === 'signup' && !agreeTerms) {
      setErrorMessage('Você deve concordar com as normas de sigilo e LGPD para criar o acesso.');
      return;
    }

    if (mode === 'reset' && !formData.currentPassword) {
      setErrorMessage('Informe sua senha atual para autorizar a alteração de segurança.');
      return;
    }

    const targetPassword = mode === 'reset' ? formData.newPassword : formData.password;
    if (!targetPassword) {
      setErrorMessage('Por favor, informe a senha.');
      return;
    }

    if ((mode === 'signup' || mode === 'reset') && targetPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: mode === 'signup' ? 'signup' : mode === 'reset' ? 'reset_password' : 'login',
          name: formData.name,
          email: formData.email,
          password: formData.password,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha na autenticação.');
      }

      if (mode === 'signup') {
        if (data.pendingApproval) {
          setSignupPendingInfo({
            name: formData.name,
            email: formData.email,
          });
          setFormData({ name: '', email: '', password: '', newPassword: '' });
          return;
        }

        setSuccessMessage('Conta médica criada e aprovada! Acessando...');
        setTimeout(() => {
          onLoginSuccess({ ...data.user, token: data.token });
        }, 800);
      } else if (mode === 'reset') {
        setSuccessMessage('Senha redefinida com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage('Senha atualizada! Digite sua nova senha para entrar.');
          setFormData((prev) => ({ ...prev, password: '', newPassword: '' }));
        }, 1200);
      } else {
        // Modo login: verificar se requer 2FA
        if (data.requiresMFA) {
          setTempMfaToken(data.tempToken);
          setMode('mfa');
          const isSetup = data.mfaMode === 'setup';
          setMfaMode(isSetup ? 'setup' : 'verify');
          setMfaCode('');
          setUseBackupCode(false);

          if (isSetup) {
            setMfaSetupData({
              secret: data.secret,
              qrCodeDataUrl: data.qrCodeDataUrl,
              otpauthUrl: data.otpauthUrl,
            });
            setMfaSetupStep('scan');
            setBackupCodes([]);
            setConfirmedSavedCodes(false);
            setCompletedAuthPayload(null);
            setSuccessMessage('');
          } else {
            setSuccessMessage('Digite o código de 6 dígitos gerado no seu aplicativo autenticador.');
          }
          return;
        }

        setSuccessMessage('Acesso autorizado! Carregando prontuários...');
        setTimeout(() => {
          onLoginSuccess({ ...data.user, token: data.token });
        }, 500);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setErrorMessage(useBackupCode ? 'Informe o código de recuperação.' : 'Informe o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_mfa',
          tempToken: tempMfaToken,
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Código incorreto.');
      }

      setSuccessMessage('Autenticação confirmada com sucesso! Acessando...');
      setTimeout(() => {
        onLoginSuccess({ ...data.user, token: data.token });
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Código incorreto. Verifique o horário do celular.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetupMFA = async (e) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setErrorMessage('Informe o código de 6 dígitos gerado pelo app autenticador.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_setup_mfa',
          tempToken: tempMfaToken,
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Código incorreto.');
      }

      setBackupCodes(data.backupCodes || []);
      setCompletedAuthPayload({ ...data.user, token: data.token });
      setMfaSetupStep('backup_codes');
      setMfaCode('');
      setSuccessMessage('2FA ativado com sucesso! Guarde seus códigos de recuperação.');
    } catch (err) {
      setErrorMessage(err.message || 'Código incorreto. Verifique o horário do celular.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 3000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `VIGUMED - CODIGOS DE RECUPERACAO DE EMERGENCIA 2FA\nGerados em: ${new Date().toLocaleString()}\nConta: ${formData.email}\n\nCada codigo pode ser usado apenas UMA vez caso perca o celular:\n\n${backupCodes.join('\n')}\n\nGuarde em local seguro e confidencial.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vigumed-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setConfirmedSavedCodes(true);
  };

  const handleFinishOnboarding = () => {
    if (completedAuthPayload) {
      setSuccessMessage('Acesso liberado com segurança! Entrando...');
      setTimeout(() => {
        onLoginSuccess(completedAuthPayload);
      }, 400);
    }
  };

  const handleCopyKey = () => {
    if (mfaSetupData?.secret) {
      navigator.clipboard.writeText(mfaSetupData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#f8fafc] flex flex-col lg:flex-row lg:overflow-hidden select-none">
      {/* LADO ESQUERDO: Formulário Clínico de Acesso */}
      <div className="w-full lg:w-[48%] h-full flex items-center justify-center p-5 sm:p-10 xl:p-14 overflow-y-auto">
        <div className="w-full max-w-[410px] space-y-5 my-auto">
          {/* Logo e Cabeçalho do Sistema */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0">
              <Stethoscope size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                ViguMed
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Prontuário & Gestão Clínica</p>
            </div>
          </div>

          {signupPendingInfo ? (
            /* Tela de Confirmação: Solicitação Enviada para Análise */
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                <Clock size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Solicitação em Análise
                </h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Obrigado pelo cadastro, <strong className="text-slate-900">{signupPendingInfo.name}</strong>!
                </p>
              </div>

              <div className="p-4 bg-white border border-amber-200/80 rounded-2xl shadow-xs text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <ShieldCheck size={16} />
                  <span>Protocolo de Segurança Clínica</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-2xs">
                  Por conformidade com as resoluções do CFM e da LGPD, todo novo acesso profissional
                  precisa ser autorizado por um colega já ativo na clínica.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSignupPendingInfo(null);
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('Solicitação cadastrada. Ao ser liberado, faça login com sua senha.');
                }}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ir para a Tela de Login</span>
                <ArrowRight size={15} />
              </button>
            </div>
          ) : mode === 'mfa' ? (
            /* ========================================================================= */
            /* TELA 2FA COMPACTA (SEM SCROLL) */
            /* ========================================================================= */
            mfaMode === 'setup' ? (
              mfaSetupStep === 'scan' ? (
                /* PASSO 1 DO SETUP: QR CODE COMPACTO */
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-1">
                      <Lock size={10} />
                      <span>Configuração Obrigatória</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      Ativar 2FA no Celular
                    </h1>
                    <p className="text-slate-500 text-2xs mt-0.5 leading-relaxed">
                      Escaneie com o <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong>:
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-2xs rounded-xl flex items-center gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Card Central com QR Code Compacto */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center justify-center space-y-2">
                    {mfaSetupData?.qrCodeDataUrl && (
                      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <img
                          src={mfaSetupData.qrCodeDataUrl}
                          alt="QR Code ViguMed 2FA"
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg"
                        />
                      </div>
                    )}

                    <div className="text-center w-full">
                      <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                        <span className="text-[10px] text-slate-400">Chave:</span>
                        <code className="font-mono font-bold text-slate-800 tracking-wider">
                          {mfaSetupData?.secret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="text-slate-500 hover:text-slate-800 p-0.5 cursor-pointer ml-1"
                          title="Copiar Chave"
                        >
                          {copiedKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmSetupMFA} className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 text-center">
                        Digite o código de 6 dígitos gerado:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000 000"
                        value={mfaCode}
                        onChange={(e) => {
                          setMfaCode(e.target.value.replace(/\D/g, ''));
                          if (errorMessage) setErrorMessage('');
                        }}
                        autoFocus
                        required
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-xl text-center text-lg font-mono font-extrabold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-2xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || mfaCode.length < 6}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <ShieldCheck size={15} />
                          <span>Confirmar e Ativar 2FA</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setTempMfaToken('');
                        setMfaCode('');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-medium hover:underline cursor-pointer"
                    >
                      ← Voltar para o login
                    </button>
                  </div>
                </div>
              ) : (
                /* PASSO 2 DO SETUP: CÓDIGOS DE RECUPERAÇÃO */
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-1">
                      <CheckCircle2 size={11} />
                      <span>2FA Ativado</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      Códigos de Recuperação
                    </h1>
                    <p className="text-slate-500 text-2xs mt-0.5 leading-relaxed">
                      Guarde seus 5 códigos de emergência para usar caso perca o celular:
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-xs font-bold text-slate-800">
                      {backupCodes.map((code, idx) => (
                        <div key={idx} className="bg-white border border-slate-200/80 rounded-lg py-1.5 px-2 text-center shadow-2xs">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyBackupCodes}
                      className="flex-1 py-2 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-2xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {copiedCodes ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedCodes ? 'Copiados!' : 'Copiar Todos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBackupCodes}
                      className="flex-1 py-2 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-2xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Download size={13} />
                      <span>Baixar (.txt)</span>
                    </button>
                  </div>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedSavedCodes}
                      onChange={(e) => setConfirmedSavedCodes(e.target.checked)}
                      className="mt-0.5 rounded border-amber-300 text-slate-900 focus:ring-slate-900 cursor-pointer shrink-0"
                    />
                    <span className="leading-tight">
                      Confirmo que copiei ou baixei os códigos e os guardei com segurança.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleFinishOnboarding}
                    disabled={!confirmedSavedCodes}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Concluir e Acessar o Sistema</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )
            ) : (
              /* MODO VERIFY (LOGIN REGULAR COM 2FA ATIVO) */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Autenticação em Duas Etapas
                  </h1>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    {useBackupCode
                      ? 'Digite um dos seus códigos de emergência (XXXX-XXXX):'
                      : 'Digite o código de 6 dígitos gerado no seu aplicativo autenticador:'}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyMFA} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                      {useBackupCode ? 'Código de Recuperação' : 'Código de 6 Dígitos'}
                    </label>
                    <input
                      type="text"
                      inputMode={useBackupCode ? 'text' : 'numeric'}
                      pattern={useBackupCode ? undefined : '[0-9]*'}
                      maxLength={useBackupCode ? 9 : 6}
                      placeholder={useBackupCode ? 'XXXX-XXXX' : '000 000'}
                      value={mfaCode}
                      onChange={(e) => {
                        const val = useBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '');
                        setMfaCode(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      autoFocus
                      required
                      className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-xl text-center text-xl font-mono font-extrabold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-2xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !mfaCode}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Confirmar e Entrar</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setMfaCode('');
                      setErrorMessage('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold block w-full hover:underline cursor-pointer"
                  >
                    {useBackupCode
                      ? '← Voltar para código do app autenticador'
                      : 'Perdeu o celular? Usar código de emergência'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setTempMfaToken('');
                      setMfaCode('');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-700 font-medium block w-full hover:underline cursor-pointer pt-0.5"
                  >
                    Cancelar e voltar para a tela de login
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ========================================================================= */
            /* FORMULÁRIO DE LOGIN / CADASTRO / RESET (EXATAMENTE COMO NA FOTO) */
            /* ========================================================================= */
            <>
              {/* Título Principal */}
              <div className="pt-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {mode === 'signup'
                    ? 'Criar Acesso Clínico'
                    : mode === 'reset'
                    ? 'Redefinir Senha'
                    : 'Portal do Profissional'}
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  {mode === 'signup'
                    ? 'Cadastre-se para gerenciar prontuários, consultas e evoluções'
                    : mode === 'reset'
                    ? 'Digite seu e-mail e escolha uma nova senha de acesso'
                    : 'Acesse seu sistema seguro de gestão de pacientes'}
                </p>
              </div>

              {/* Mensagens de Feedback */}
              {errorMessage && (
                <div
                  className={`p-3 border text-xs rounded-xl flex items-start gap-2.5 ${
                    errorMessage.includes('aguardando aprovação')
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                      : errorMessage.includes('recusado')
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {errorMessage.includes('aguardando aprovação') ? (
                    <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  ) : errorMessage.includes('recusado') ? (
                    <ShieldAlert size={16} className="text-rose-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold">
                      {errorMessage.includes('aguardando aprovação')
                        ? 'Acesso Pendente de Aprovação'
                        : errorMessage.includes('recusado')
                        ? 'Solicitação Não Autorizada'
                        : 'Atenção'}
                    </p>
                    <p className="text-2xs mt-0.5 leading-relaxed">{errorMessage}</p>
                    {errorMessage.includes('Senha incorreta') && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setErrorMessage('');
                        }}
                        className="text-2xs font-bold text-red-800 underline mt-1 block"
                      >
                        Esqueceu sua senha? Clique para redefinir.
                      </button>
                    )}
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-medium leading-relaxed">{successMessage}</p>
                </div>
              )}

              {/* Formulário Principal */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nome Completo com Titulação
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Ex: Dra. Juliana Santos"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail Institucional
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="medico@hospital.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    required
                  />
                </div>

                {mode === 'reset' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Senha Atual (Confirmação de Segurança)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="currentPassword"
                        placeholder="Informe sua senha atual..."
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Esqueceu sua senha atual? Solicite a redefinição direta ao administrador da clínica.
                    </p>
                  </div>
                )}

                {mode === 'login' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                        Senha de Acesso
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setErrorMessage('');
                          setSuccessMessage('');
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-700 font-medium transition cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {(mode === 'signup' || mode === 'reset') && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      {mode === 'reset' ? 'Nova Senha (Mínimo 6 dígitos)' : 'Criar Senha Segura'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name={mode === 'reset' ? 'newPassword' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={mode === 'reset' ? formData.newPassword : formData.password}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-2xs text-slate-600 select-none cursor-pointer leading-relaxed">
                      Declaro conformidade com o <span className="font-semibold text-slate-900">Código de Ética Médica</span> e as diretrizes da <span className="font-semibold text-slate-900">LGPD</span>.
                    </label>
                  </div>
                )}

                {/* Botão de Ação Primário */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-sm rounded-lg transition duration-150 shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Criar Acesso Clínico</span>
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition" />
                    </>
                  ) : mode === 'reset' ? (
                    <>
                      <KeyRound size={16} />
                      <span>Salvar Nova Senha</span>
                    </>
                  ) : (
                    <>
                      <span>Acessar Prontuário</span>
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition" />
                    </>
                  )}
                </button>
              </form>

              {/* Alternância de Modo */}
              <div className="pt-3 border-t border-slate-200/80 text-center space-y-1.5">
                {mode === 'reset' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-xs text-slate-900 font-bold hover:underline cursor-pointer"
                  >
                    ← Voltar para o Login
                  </button>
                ) : mode === 'signup' ? (
                  <p className="text-xs text-slate-600">
                    Já possui credenciais cadastradas?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-slate-900 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Fazer Login
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    Ainda não possui conta de profissional?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-slate-900 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Criar Acesso
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Rodapé de Segurança */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Banco de Dados Criptografado na Nuvem (Upstash)</span>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Apresentação Visual com Fotografia Profissional da Clínica (Igual à Foto) */}
      <div className="hidden lg:flex lg:w-[52%] p-4 md:p-6 lg:p-8 items-center justify-center">
        <div className="w-full h-full min-h-[580px] max-h-[820px] rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden border border-slate-200/20 bg-slate-900">
          {/* Imagem de Fundo em Alta Resolução */}
          <img
            src="/clinic-bg.jpg"
            alt="Ambiente Clínico Profissional ViguMed"
            className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition duration-1000 ease-out"
          />
          {/* Gradiente Suave para Leitura Perfeita */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/60 backdrop-blur-[1px]"></div>

          {/* Topo: Badges de Confiabilidade */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/15 text-xs text-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium">ViguMed Clinical Platform • Online</span>
            </div>
            <span className="text-xs text-white/70 font-mono px-3 py-1 rounded-full bg-slate-950/50 backdrop-blur-md border border-white/10">
              v1.2 Hospital Pro
            </span>
          </div>

          {/* Rodapé do Painel com Card em Vidro / Glassmorphism */}
          <div className="relative z-10 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-950/75 backdrop-blur-md border border-white/15 shadow-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck size={13} />
                <span>Consultório & Gestão Médica</span>
              </div>
              <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
                Gestão Inteligente de Prontuários e Pacientes
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Ambiente seguro para acompanhamento clínico diário, evoluções terapêuticas, diagnósticos e controle financeiro integrado para profissionais da saúde.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300 border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Conforme CFM & LGPD
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock size={14} className="text-emerald-400" />
                  Criptografia em Nuvem
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/70 px-2">
              <span>Acesso Restrito a Profissionais de Saúde</span>
              <span>ViguMed Cloud Health</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
