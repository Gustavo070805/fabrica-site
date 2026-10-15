import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  hashPassword,
  verifyPassword,
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
  recordAuditLog,
  getAuditLogs,
  encryptData,
  decryptData,
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  getOtpAuthUrl,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
} from './securityUtils.js';

const USERS_KEY = 'usuarios';

function getRedis() {
  const url =
    process.env.DB_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.DB_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function resolveUserRole(user, isFirstUser = false) {
  if (user && user.role) return user.role;
  const clean = ((user && user.email) || '').toLowerCase().trim();
  if (isFirstUser || clean === 'gustavocandile@gmail.com' || clean === 'victorcandile@gmail.com') {
    return 'admin';
  }
  return 'doctor';
}

const TOKEN_SECRET =
  process.env.DB_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  'medsync_jwt_secret_salt_key_2026_clinical_suite';

export function generateToken(user, role) {
  const payload = {
    id: user.id,
    email: user.email,
    role: role || user?.role || resolveUserRole(user),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function generateTempMFAToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    mfaPending: true,
    exp: Date.now() + 1000 * 60 * 5, // 5 minutos de validade
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyTempMFAToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
  const [data, signature] = tokenStr.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    if (!payload.mfaPending) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
  const [data, signature] = tokenStr.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAuthFromReq(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return verifyToken(authHeader.substring(7).trim());
  }
  const xAuth = req.headers ? req.headers['x-auth-token'] : null;
  if (xAuth) {
    return verifyToken(String(xAuth).trim());
  }
  return null;
}

export default async function handler(req, res) {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({
      error: 'Variáveis de ambiente do Upstash Redis não foram encontradas na Vercel.',
    });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const {
      action,
      name,
      email,
      password,
      currentPassword,
      newPassword,
      targetUserId,
      reviewerName,
      assignedRole,
      requesterUserId,
      newName,
      newRole,
      newStatus,
    } = body;

    const users = (await redis.get(USERS_KEY)) || [];

    // ==========================================
    // 1. LISTAR AUDIT LOGS (SOMENTE ADMIN)
    // ==========================================
    if (action === 'get_audit_logs') {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado: apenas administradores podem visualizar trilha de auditoria.' });
      }
      const logs = await getAuditLogs(redis, 300);
      return res.status(200).json({ success: true, logs });
    }

    // ==========================================
    // 2. LISTAR SOLICITAÇÕES E USUÁRIOS (SOMENTE ADMIN)
    // ==========================================
    if (action === 'get_access_requests' || action === 'get_all_users') {
      const auth = getAuthFromReq(req);
      if (!auth) {
        return res.status(401).json({ error: 'Sessão inválida ou não autenticada.' });
      }

      if (auth.role !== 'admin') {
        return res.status(200).json({
          success: true,
          requests: [],
          allUsers: [],
        });
      }

      const sanitizedUsers = users.map((u, idx) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: resolveUserRole(u, idx === 0),
        status: u.status || 'approved',
        mfaEnabled: !!u.mfaEnabled,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt || null,
        approvedBy: u.approvedBy || null,
        rejectedAt: u.rejectedAt || null,
      }));

      const pendingRequests = sanitizedUsers.filter((u) => u.status === 'pending');

      return res.status(200).json({
        success: true,
        requests: pendingRequests,
        allUsers: sanitizedUsers,
      });
    }

    // ==========================================
    // 3. APROVAR ACESSO (SOMENTE ADMIN/AUTORIZADO)
    // ==========================================
    if (action === 'approve_access') {
      const auth = getAuthFromReq(req);
      if (!targetUserId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

      const userIndex = users.findIndex((u) => u.id === targetUserId);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      users[userIndex].status = 'approved';
      if (assignedRole) {
        users[userIndex].role = assignedRole;
      } else if (!users[userIndex].role) {
        users[userIndex].role = 'doctor';
      }
      users[userIndex].approvedAt = new Date().toISOString();
      users[userIndex].approvedBy = reviewerName || auth?.email || 'Administrador Autorizado';

      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth?.id || 'admin',
        userName: reviewerName || auth?.email || 'Administrador',
        userRole: auth?.role || 'admin',
        action: 'APPROVE_ACCESS',
        targetId: targetUserId,
        details: `Acesso liberado para ${users[userIndex].name} (${users[userIndex].email}) com perfil ${users[userIndex].role}`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `Acesso liberado com sucesso para ${users[userIndex].name}!`,
        user: {
          id: users[userIndex].id,
          name: users[userIndex].name,
          email: users[userIndex].email,
          role: resolveUserRole(users[userIndex], userIndex === 0),
          status: 'approved',
        },
      });
    }

    // ==========================================
    // 4. RECUSAR ACESSO
    // ==========================================
    if (action === 'reject_access') {
      const auth = getAuthFromReq(req);
      if (!targetUserId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

      const userIndex = users.findIndex((u) => u.id === targetUserId);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      users[userIndex].status = 'rejected';
      users[userIndex].rejectedAt = new Date().toISOString();

      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth?.id || 'admin',
        userName: auth?.email || 'Administrador',
        userRole: auth?.role || 'admin',
        action: 'REJECT_ACCESS',
        targetId: targetUserId,
        details: `Solicitação recusada para ${users[userIndex].name} (${users[userIndex].email})`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `Solicitação de acesso de ${users[userIndex].name} foi recusada.`,
        user: {
          id: users[userIndex].id,
          name: users[userIndex].name,
          email: users[userIndex].email,
          role: resolveUserRole(users[userIndex], userIndex === 0),
          status: 'rejected',
        },
      });
    }

    // ==========================================
    // 5. ATUALIZAR USUÁRIO (SOMENTE ADMIN)
    // ==========================================
    if (action === 'update_user') {
      if (!targetUserId) {
        return res.status(400).json({ error: 'ID do usuário a atualizar é obrigatório.' });
      }

      const auth = getAuthFromReq(req);
      const requesterIndex = users.findIndex((u) => u.id === requesterUserId);
      const requester = requesterIndex !== -1 ? users[requesterIndex] : null;
      const isRequesterAdmin =
        (auth && auth.role === 'admin') ||
        (requester && resolveUserRole(requester, requesterIndex === 0) === 'admin');

      if (!isRequesterAdmin) {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem editar usuários.',
        });
      }

      const targetIndex = users.findIndex((u) => u.id === targetUserId);
      if (targetIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado no sistema.' });
      }

      if (newName && newName.trim()) {
        users[targetIndex].name = newName.trim();
      }
      if (newRole) {
        users[targetIndex].role = newRole;
      }
      if (newStatus) {
        users[targetIndex].status = newStatus;
      }
      users[targetIndex].updatedAt = new Date().toISOString();

      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth?.id || requesterUserId,
        userName: auth?.email || 'Administrador',
        userRole: 'admin',
        action: 'UPDATE_USER',
        targetId: targetUserId,
        details: `Usuário ${users[targetIndex].name} atualizado: cargo=${users[targetIndex].role}, status=${users[targetIndex].status}`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `Dados de ${users[targetIndex].name} atualizados com sucesso!`,
        user: {
          id: users[targetIndex].id,
          name: users[targetIndex].name,
          email: users[targetIndex].email,
          role: resolveUserRole(users[targetIndex], targetIndex === 0),
          status: users[targetIndex].status,
        },
      });
    }

    // ==========================================
    // 6. EXCLUIR USUÁRIO (SOMENTE ADMIN)
    // ==========================================
    if (action === 'delete_user') {
      if (!targetUserId) {
        return res.status(400).json({ error: 'ID do usuário a excluir é obrigatório.' });
      }

      const auth = getAuthFromReq(req);
      const requesterIndex = users.findIndex((u) => u.id === requesterUserId);
      const requester = requesterIndex !== -1 ? users[requesterIndex] : null;
      const isRequesterAdmin =
        (auth && auth.role === 'admin') ||
        (requester && resolveUserRole(requester, requesterIndex === 0) === 'admin');

      if (!isRequesterAdmin) {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem excluir usuários.',
        });
      }

      if (targetUserId === requesterUserId || (auth && auth.id === targetUserId)) {
        return res.status(400).json({
          error: 'Você não pode excluir sua própria conta de administrador.',
        });
      }

      const targetIndex = users.findIndex((u) => u.id === targetUserId);
      if (targetIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
      }

      const deletedUser = users[targetIndex];
      users.splice(targetIndex, 1);

      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth?.id || requesterUserId,
        userName: auth?.email || 'Administrador',
        userRole: 'admin',
        action: 'DELETE_USER',
        targetId: targetUserId,
        details: `Usuário ${deletedUser.name} (${deletedUser.email}) excluído permanentemente`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `O usuário ${deletedUser.name} foi excluído permanentemente do banco de dados com sucesso.`,
      });
    }

    // ==========================================
    // 7. ADMIN RESET USER PASSWORD
    // ==========================================
    if (action === 'admin_reset_user_password') {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem redefinir senhas da equipe.' });
      }

      if (!targetUserId || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'ID do usuário e nova senha de no mínimo 6 dígitos são obrigatórios.' });
      }

      const targetIndex = users.findIndex((u) => u.id === targetUserId);
      if (targetIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      users[targetIndex].passwordHash = hashPassword(newPassword, 210000);
      users[targetIndex].updatedAt = new Date().toISOString();
      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth.id,
        userName: auth.email,
        userRole: 'admin',
        action: 'ADMIN_RESET_PASSWORD',
        targetId: targetUserId,
        details: `Senha de ${users[targetIndex].name} redefinida pelo administrador`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `Senha de ${users[targetIndex].name} redefinida com sucesso!`,
      });
    }

    // ==========================================
    // 8. ADMIN RESET USER MFA
    // ==========================================
    if (action === 'admin_reset_user_mfa') {
      const auth = getAuthFromReq(req);
      if (!auth || auth.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem redefinir o 2FA de membros da equipe.' });
      }

      if (!targetUserId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

      const userIndex = users.findIndex((u) => u.id === targetUserId);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      users[userIndex].mfaEnabled = false;
      delete users[userIndex].mfaSecret;
      delete users[userIndex].mfaBackupCodes;
      delete users[userIndex].pendingMfaSecret;
      users[userIndex].updatedAt = new Date().toISOString();
      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: auth.id,
        userName: auth.email,
        userRole: 'admin',
        action: 'ADMIN_RESET_USER_MFA',
        targetId: targetUserId,
        details: `2FA de ${users[userIndex].name} reiniciado pelo administrador para novo pareamento`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `O 2FA de ${users[userIndex].name} foi reiniciado com sucesso. No próximo login com senha, o usuário verá o novo QR Code para parear o novo aplicativo autenticador.`,
      });
    }

    // ==========================================
    // 9. INICIAR CONFIGURAÇÃO DE 2FA (SETUP MFA)
    // ==========================================
    if (action === 'setup_mfa') {
      const auth = getAuthFromReq(req);
      if (!auth) {
        return res.status(401).json({ error: 'Você precisa estar autenticado para configurar a verificação em duas etapas.' });
      }

      const userIndex = users.findIndex((u) => u.id === auth.id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const user = users[userIndex];
      const secret = generateBase32Secret(20);
      const otpauthUrl = getOtpAuthUrl(user.email, secret, 'ViguMed');
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        margin: 2,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      users[userIndex].pendingMfaSecret = encryptData(secret);
      await redis.set(USERS_KEY, users);

      return res.status(200).json({
        success: true,
        secret,
        qrCodeDataUrl,
        otpauthUrl,
      });
    }

    // ==========================================
    // 10. CONFIRMAR E ATIVAR 2FA (CONFIRM SETUP MFA)
    // ==========================================
    if (action === 'confirm_setup_mfa') {
      const { mfaCode, tempToken } = body;
      if (!mfaCode) {
        return res.status(400).json({ error: 'Informe o código de 6 dígitos gerado pelo aplicativo autenticador.' });
      }

      let userId = null;
      let isTempAuth = false;
      if (tempToken) {
        const payload = verifyTempMFAToken(tempToken);
        if (!payload || !payload.id) {
          return res.status(401).json({ error: 'Sessão de configuração expirada. Faça login novamente com e-mail e senha.' });
        }
        userId = payload.id;
        isTempAuth = true;
      } else {
        const auth = getAuthFromReq(req);
        if (!auth) {
          return res.status(401).json({ error: 'Você precisa estar autenticado.' });
        }
        userId = auth.id;
      }

      const userIndex = users.findIndex((u) => u.id === userId);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const user = users[userIndex];
      if (!user.pendingMfaSecret) {
        return res.status(400).json({ error: 'Nenhuma ativação de 2FA em andamento. Inicie novamente a configuração.' });
      }

      const plainSecret = decryptData(user.pendingMfaSecret);
      const verify = verifyTOTP(mfaCode, plainSecret, 1);
      if (!verify.isValid) {
        return res.status(400).json({ error: 'Código de autenticação incorreto. Verifique o horário do seu celular e tente novamente.' });
      }

      const { plainCodes, hashedCodes } = generateBackupCodes(5);
      users[userIndex].mfaEnabled = true;
      users[userIndex].mfaSecret = user.pendingMfaSecret; // Criptografado com AES-256-GCM
      delete users[userIndex].pendingMfaSecret;
      users[userIndex].mfaBackupCodes = hashedCodes;
      users[userIndex].mfaActivatedAt = new Date().toISOString();
      users[userIndex].updatedAt = new Date().toISOString();

      await redis.set(USERS_KEY, users);

      const userRole = resolveUserRole(user, userIndex === 0);
      const token = generateToken(user, userRole);

      await recordAuditLog(redis, {
        userId: user.id,
        userName: user.name,
        userRole: userRole,
        action: 'MFA_ACTIVATED',
        details: isTempAuth
          ? 'Autenticação de dois fatores configurada no primeiro acesso obrigatório'
          : 'Autenticação de dois fatores ativada pelo usuário',
        ip,
      });

      return res.status(200).json({
        success: true,
        message: 'Autenticação em dois fatores ativada com sucesso!',
        backupCodes: plainCodes,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole,
          status: user.status || 'approved',
          mfaEnabled: true,
        },
      });
    }

    // ==========================================
    // 11. DESATIVAR 2FA (DISABLE MFA)
    // ==========================================
    if (action === 'disable_mfa') {
      return res.status(400).json({
        error: 'A autenticação em dois fatores é obrigatória para todos os membros da clínica para conformidade com a LGPD e o CFM.',
      });
    }

    // ==========================================
    // 12. VALIDAR CÓDIGO 2FA NO LOGIN (VERIFY MFA)
    // ==========================================
    if (action === 'verify_mfa') {
      const { tempToken, mfaCode } = body;
      if (!tempToken || !mfaCode) {
        return res.status(400).json({ error: 'Token temporário e código de 6 dígitos são obrigatórios.' });
      }

      const tempPayload = verifyTempMFAToken(tempToken);
      if (!tempPayload) {
        return res.status(401).json({ error: 'Sessão de verificação expirada. Faça login novamente com e-mail e senha.' });
      }

      const userIndex = users.findIndex((u) => u.id === tempPayload.id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const user = users[userIndex];
      if (!user.mfaEnabled || !user.mfaSecret) {
        return res.status(400).json({ error: 'A autenticação de dois fatores não está ativa nesta conta.' });
      }

      const plainSecret = decryptData(user.mfaSecret);
      const totpResult = verifyTOTP(mfaCode, plainSecret, 1);

      let isSuccess = totpResult.isValid;
      let usedBackupCode = false;

      // Se não bateu com TOTP de 6 dígitos, verifica se é um código de backup (ex: A4B2-9F1C)
      if (!isSuccess && Array.isArray(user.mfaBackupCodes) && user.mfaBackupCodes.length > 0) {
        const backupResult = verifyAndConsumeBackupCode(mfaCode, user.mfaBackupCodes);
        if (backupResult.isValid) {
          isSuccess = true;
          usedBackupCode = true;
          users[userIndex].mfaBackupCodes = backupResult.remainingHashedCodes;
          await redis.set(USERS_KEY, users);
        }
      }

      if (!isSuccess) {
        await recordAuditLog(redis, {
          userId: user.id,
          userName: user.name,
          userRole: user.role || 'doctor',
          action: 'MFA_FAILED',
          details: 'Código MFA incorreto ou expirado',
          ip,
        });
        return res.status(400).json({ error: 'Código de autenticação incorreto ou expirado. Tente novamente.' });
      }

      const userRole = resolveUserRole(user, userIndex === 0);
      const token = generateToken(user, userRole);

      await recordAuditLog(redis, {
        userId: user.id,
        userName: user.name,
        userRole: userRole,
        action: 'MFA_VERIFIED_SUCCESS',
        details: usedBackupCode ? 'Login com código de backup de emergência' : 'Login confirmado com código TOTP',
        ip,
      });

      return res.status(200).json({
        success: true,
        message: 'Autenticação em dois fatores confirmada com sucesso!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole,
          status: user.status || 'approved',
          mfaEnabled: true,
        },
      });
    }

    // Ações que exigem e-mail
    if (!email) {
      return res.status(400).json({ error: 'O e-mail é obrigatório.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // ==========================================
    // 8. CADASTRO (SIGNUP)
    // ==========================================
    if (action === 'signup') {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório no cadastro.' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      }

      const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(400).json({
          error: 'Este e-mail já está cadastrado. Faça login ou solicite redefinição.',
        });
      }

      const isFirstUser = users.length === 0;
      const initialStatus = isFirstUser ? 'approved' : 'pending';
      const initialRole = isFirstUser ? 'admin' : 'doctor';

      const newUser = {
        id: 'usr_' + Date.now(),
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashPassword(password, 210000), // OWASP 210k iterações
        createdAt: new Date().toISOString(),
        status: initialStatus,
        role: initialRole,
        ...(isFirstUser
          ? {
              approvedAt: new Date().toISOString(),
              approvedBy: 'Sistema (Primeiro Usuário)',
            }
          : {}),
      };

      users.push(newUser);
      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: newUser.id,
        userName: newUser.name,
        userRole: newUser.role,
        action: 'SIGNUP_CREATED',
        details: isFirstUser ? 'Primeiro administrador cadastrado' : 'Nova solicitação de acesso pendente de aprovação',
        ip,
      });

      const token = initialStatus === 'approved' ? generateToken(newUser, newUser.role) : null;

      return res.status(201).json({
        success: true,
        pendingApproval: initialStatus === 'pending',
        token,
        message:
          initialStatus === 'pending'
            ? 'Solicitação de acesso enviada com sucesso! Aguarde a liberação por um profissional autorizado da clínica.'
            : 'Primeiro usuário cadastrado e aprovado com sucesso!',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
      });
    }

    // ==========================================
    // 9. LOGIN (COM RATE LIMITING & REHASH AUTOMÁTICO)
    // ==========================================
    if (action === 'login') {
      // Verificar bloqueio por tentativas excessivas (Anti-Brute Force)
      const rateCheck = await checkRateLimit(redis, cleanEmail, 5);
      if (!rateCheck.allowed) {
        await recordAuditLog(redis, {
          userId: null,
          userName: cleanEmail,
          action: 'LOGIN_BLOCKED_RATE_LIMIT',
          details: `Bloqueio por força bruta (${rateCheck.retryAfter}s restantes)`,
          ip,
        });
        return res.status(429).json({
          error: rateCheck.message,
          retryAfter: rateCheck.retryAfter,
        });
      }

      if (!password) {
        return res.status(400).json({ error: 'Informe a sua senha de acesso.' });
      }

      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (userIndex === -1) {
        await incrementRateLimit(redis, cleanEmail);
        await recordAuditLog(redis, {
          userId: null,
          userName: cleanEmail,
          action: 'LOGIN_FAILED',
          details: 'E-mail não cadastrado',
          ip,
        });
        return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
      }

      const user = users[userIndex];
      const { isValid, needsRehash } = verifyPassword(password, user.passwordHash);

      if (!isValid) {
        await incrementRateLimit(redis, cleanEmail);
        await recordAuditLog(redis, {
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_FAILED',
          details: 'Senha incorreta digitada',
          ip,
        });
        return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
      }

      // Sucesso na senha: zera o contador de tentativas
      await resetRateLimit(redis, cleanEmail);

      // Migração transparente de hash legado para 210.000 iterações
      if (needsRehash) {
        users[userIndex].passwordHash = hashPassword(password, 210000);
        await redis.set(USERS_KEY, users);
      }

      // Verificar status de aprovação
      const userStatus = user.status || 'approved';
      if (userStatus === 'pending') {
        return res.status(403).json({
          error: 'Seu cadastro está aguardando aprovação. Um profissional da clínica precisa autorizar seu acesso antes do primeiro login.',
          status: 'pending',
        });
      }

      if (userStatus === 'rejected') {
        return res.status(403).json({
          error: 'Seu pedido de acesso foi recusado pela equipe. Em caso de dúvidas, contate o administrador da clínica.',
          status: 'rejected',
        });
      }

      const userRole = resolveUserRole(user, userIndex === 0);

      // ==========================================
      // 2FA OBRIGATÓRIO PARA TODOS OS USUÁRIOS
      // ==========================================
      // Caso 1: Usuário já possui 2FA configurado -> exige código do app autenticador
      if (user.mfaEnabled && user.mfaSecret) {
        const tempToken = generateTempMFAToken(user);
        return res.status(200).json({
          success: true,
          requiresMFA: true,
          mfaMode: 'verify',
          message: 'Autenticação de dois fatores necessária. Informe o código de 6 dígitos do aplicativo autenticador.',
          tempToken,
          email: user.email,
        });
      }

      // Caso 2: Usuário ainda NÃO possui 2FA ativo -> 2FA Obrigatório no Login
      // Gera novo segredo Base32 e QR Code, salvando pendingMfaSecret
      const secret = generateBase32Secret(20);
      const otpauthUrl = getOtpAuthUrl(user.email, secret, 'ViguMed');
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        margin: 2,
        width: 256,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      users[userIndex].pendingMfaSecret = encryptData(secret);
      await redis.set(USERS_KEY, users);

      const tempToken = generateTempMFAToken(user);
      return res.status(200).json({
        success: true,
        requiresMFA: true,
        mfaMode: 'setup',
        message: 'A verificação em duas etapas é obrigatória para acessar o sistema. Escaneie o QR Code no seu aplicativo autenticador para continuar.',
        tempToken,
        secret,
        qrCodeDataUrl,
        otpauthUrl,
        email: user.email,
      });
    }

    // ==========================================
    // 10. REDEFINIR SENHA SEGURO (ANTI-ACCOUNT TAKEOVER)
    // ==========================================
    if (action === 'reset_password') {
      const targetPass = newPassword || password;
      if (!targetPass || targetPass.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (userIndex === -1) {
        return res.status(400).json({ error: 'E-mail não encontrado no sistema.' });
      }

      const auth = getAuthFromReq(req);
      const isAdmin = auth && auth.role === 'admin';

      // Se não for admin, exige a confirmação da senha atual para alterar
      if (!isAdmin) {
        if (!currentPassword) {
          return res.status(403).json({
            error: 'Por segurança, informe a sua senha atual para definir uma nova, ou solicite a redefinição ao administrador da clínica.',
            requiresCurrentPassword: true,
          });
        }

        const { isValid } = verifyPassword(currentPassword, users[userIndex].passwordHash);
        if (!isValid) {
          await recordAuditLog(redis, {
            userId: users[userIndex].id,
            userName: users[userIndex].name,
            action: 'PASSWORD_RESET_FAILED',
            details: 'Tentativa de alteração com senha atual incorreta',
            ip,
          });
          return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
        }
      }

      users[userIndex].passwordHash = hashPassword(targetPass, 210000);
      users[userIndex].updatedAt = new Date().toISOString();

      await redis.set(USERS_KEY, users);

      await recordAuditLog(redis, {
        userId: users[userIndex].id,
        userName: users[userIndex].name,
        action: 'PASSWORD_RESET_SUCCESS',
        details: isAdmin ? 'Senha redefinida pelo administrador' : 'Senha alterada pelo próprio usuário com senha atual',
        ip,
      });

      return res.status(200).json({
        success: true,
        message: 'Senha alterada com sucesso! Faça login com a nova senha.',
      });
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (error) {
    console.error('Erro na autenticação Upstash:', error);
    return res.status(500).json({ error: 'Erro interno ao processar a autenticação.' });
  }
}
