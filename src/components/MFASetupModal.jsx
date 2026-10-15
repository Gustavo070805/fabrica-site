import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Download,
  Smartphone,
  RefreshCw,
  X,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function MFASetupModal({
  isOpen,
  onClose,
  currentUser,
  onMFAStatusChanged,
}) {
  const [step, setStep] = useState('initial'); // 'initial' | 'setup' | 'backup_codes' | 'disable'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Setup state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // Disable state
  const [disablePassword, setDisablePassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setVerificationCode('');
      setDisablePassword('');
      setCopiedKey(false);
      setCopiedBackupCodes(false);

      if (currentUser?.mfaEnabled) {
        setStep('initial');
      } else {
        startSetup();
      }
    }
  }, [isOpen, currentUser]);

  const handleStartSetup = () => {
    startSetup();
  };

  const startSetup = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const token = currentUser?.token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'setup_mfa' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao iniciar configuração do 2FA.');
      }

      setQrCodeUrl(data.qrCodeDataUrl);
      setManualSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setErrorMessage('Digite os 6 números exibidos no seu aplicativo autenticador.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const token = currentUser?.token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'confirm_setup_mfa',
          mfaCode: verificationCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Código incorreto.');
      }

      setBackupCodes(data.backupCodes || []);
      setStep('backup_codes');
      if (onMFAStatusChanged) {
        onMFAStatusChanged(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Código incorreto. Verifique o horário do celular.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async (e) => {
    e.preventDefault();
    if (!disablePassword) {
      setErrorMessage('Informe sua senha atual para desativar o 2FA.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const token = currentUser?.token;
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'disable_mfa',
          currentPassword: disablePassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao desativar.');
      }

      setSuccessMessage('2FA desativado com sucesso.');
      if (onMFAStatusChanged) {
        onMFAStatusChanged(false);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    const content = `VIGUMED - CÓDIGOS DE RECUPERAÇÃO DE EMERGÊNCIA (2FA)\n` +
      `Usuário: ${currentUser?.email}\n` +
      `Data: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `Guarde estes códigos em local seguro. Cada código só pode ser usado 1 única vez caso você perca o acesso ao celular:\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\nEquipe de Segurança ViguMed`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vigumed-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Autenticação em Duas Etapas (2FA)</h3>
              <p className="text-2xs text-slate-500">Google Authenticator, Microsoft Authenticator ou Authy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Feedback de erro */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Feedback de sucesso */}
        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check size={14} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 1: JÁ ATIVADO (VISÃO INICIAL) */}
        {/* ========================================================================= */}
        {step === 'initial' && currentUser?.mfaEnabled && (
          <div className="mt-5 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <ShieldCheck size={24} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950">
                <p className="font-bold text-sm text-emerald-900 mb-1">O 2FA está ativo em sua conta!</p>
                <p className="leading-relaxed">
                  A cada novo login, além de e-mail e senha, você precisará informar o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Trocou de celular ou quer parear outro aplicativo?</p>
              <p className="text-2xs text-slate-500 leading-relaxed">
                Por política de segurança clínica (LGPD & CFM), o 2FA é obrigatório para toda a equipe. Você pode gerar um novo QR Code para parear o novo aparelho a qualquer momento.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleStartSetup}
                disabled={loading}
                className="px-3.5 py-2 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition font-semibold border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Reconfigurar / Trocar Aparelho</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 2: DESATIVAR 2FA */}
        {/* ========================================================================= */}
        {step === 'disable' && (
          <form onSubmit={handleDisableMFA} className="mt-4 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <p className="font-bold mb-1">Atenção ao desativar o 2FA</p>
              <p className="text-2xs leading-relaxed">
                Ao desativar a autenticação de dois fatores, sua conta passará a exigir apenas e-mail e senha para login. Confirme sua senha atual para continuar:
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sua Senha Atual
              </label>
              <input
                type="password"
                placeholder="Digite sua senha..."
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('initial')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !disablePassword}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirmar Desativação</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 3: CONFIGURAÇÃO (QR CODE + CHAVE + CÓDIGO TESTE) */}
        {/* ========================================================================= */}
        {step === 'setup' && (
          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw size={24} className="animate-spin mx-auto text-slate-400" />
                <p className="text-xs">Gerando credenciais criptográficas...</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Passo 1: Escaneie o QR Code com seu celular</p>
                  <p className="text-2xs text-slate-500">
                    Abra o <strong>Google Authenticator</strong> ou <strong>Microsoft Authenticator</strong>, toque em <strong>+</strong> e aponte a câmera:
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 border border-slate-200/90 rounded-2xl">
                  {qrCodeUrl && (
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code ViguMed 2FA"
                        className="w-36 h-36 rounded-lg"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-2xs text-slate-500 leading-relaxed">
                      Não consegue escanear? Adicione manualmente inserindo a chave abaixo no app:
                    </p>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-800 break-all select-all">
                      <span className="truncate">{manualSecret}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(manualSecret, 'key')}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition shrink-0"
                        title="Copiar chave"
                      >
                        {copiedKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {copiedKey && (
                      <p className="text-2xs text-emerald-600 font-semibold">Chave copiada para a área de transferência!</p>
                    )}
                  </div>
                </div>

                {/* Formulário de Confirmação */}
                <form onSubmit={handleConfirmSetup} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Passo 2: Digite o código de 6 dígitos gerado pelo aplicativo
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000 000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg font-mono font-extrabold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading && <RefreshCw size={12} className="animate-spin" />}
                      <span>Validar e Ativar 2FA</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ESTADO 4: CÓDIGOS DE RECUPERAÇÃO DE EMERGÊNCIA (BACKUP CODES) */}
        {/* ========================================================================= */}
        {step === 'backup_codes' && (
          <div className="mt-4 space-y-4 animate-in fade-in duration-200">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">2FA Ativado com Sucesso! </span>
                Guarde os <strong>códigos de emergência</strong> abaixo. Se você perder o celular, poderá usar qualquer um deles para entrar na conta.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {backupCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 rounded-lg p-2 font-mono text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs"
                >
                  <span className="text-slate-400 text-2xs">{idx + 1}.</span>
                  <span className="tracking-wider">{code}</span>
                  <span className="text-2xs text-slate-300 font-sans font-normal">1 uso</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
                className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {copiedBackupCodes ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedBackupCodes ? 'Códigos Copiados!' : 'Copiar Todos'}</span>
              </button>

              <button
                type="button"
                onClick={downloadBackupCodes}
                className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download size={14} className="text-slate-500" />
                <span>Baixar (.txt)</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-slate-900/10"
              >
                Concluir Configuração
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
