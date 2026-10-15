import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import {
  encryptPatientSensitiveFields,
  decryptPatientSensitiveFields,
  sanitizePatientObject,
  recordAuditLog,
  mergePatientLists,
} from './securityUtils.js';

const KEY = 'medical_records';

const TOKEN_SECRET =
  process.env.DB_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  'medsync_jwt_secret_salt_key_2026_clinical_suite';

function verifyToken(tokenStr) {
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

function getAuthFromReq(req) {
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

export default async function handler(req, res) {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const auth = getAuthFromReq(req);
  if (!auth) {
    return res.status(401).json({
      error: 'Acesso não autorizado. Efetue login para visualizar os dados.',
    });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({
      error: 'Variáveis de ambiente do Upstash Redis não foram encontradas na Vercel.',
    });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body) body = {};

  try {
    // ==========================================
    // DELETE OU POST action === 'delete_patient'
    // ==========================================
    const isDeleteMethod = req.method === 'DELETE';
    const isDeleteAction =
      req.method === 'POST' &&
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      (body.action === 'delete_patient' || body.action === 'delete');

    if (isDeleteMethod || isDeleteAction) {
      if (auth.role === 'billing') {
        return res.status(403).json({
          error: 'Usuários do setor financeiro não possuem permissão para excluir prontuários clínicos.',
        });
      }

      let query = req.query || {};
      if ((!query || Object.keys(query).length === 0) && req.url && req.url.includes('?')) {
        try {
          const parsedUrl = new URL(req.url, 'http://localhost');
          query = Object.fromEntries(parsedUrl.searchParams.entries());
        } catch {}
      }

      const targetId = body?.patientId || body?.id || query?.id || query?.patientId;
      if (!targetId) {
        return res.status(400).json({ error: 'ID do paciente não informado para exclusão.' });
      }

      const existingRaw = (await redis.get(KEY)) || [];
      const existingArray = Array.isArray(existingRaw) ? existingRaw : [];
      const existingPatients = existingArray.map((p) => decryptPatientSensitiveFields(p, TOKEN_SECRET));

      const targetPatient = existingPatients.find(
        (p) => String(p.id) === String(targetId) || p.id === targetId || p.id === Number(targetId)
      );

      const remainingPatients = existingPatients.filter(
        (p) => String(p.id) !== String(targetId) && p.id !== targetId && p.id !== Number(targetId)
      );

      // Criptografa e grava a lista remanescente no Redis
      const encryptedToSave = remainingPatients.map((p) => encryptPatientSensitiveFields(p, TOKEN_SECRET));
      await redis.set(KEY, encryptedToSave);

      // Registra o ID na lista de pacientes excluídos para impedir ressurreição em sincronizações concorrentes
      const deletedIdsRaw = (await redis.get('medical_records_deleted_ids')) || [];
      const deletedIds = Array.isArray(deletedIdsRaw) ? deletedIdsRaw : [];
      const targetIdStr = String(targetId);
      if (!deletedIds.includes(targetIdStr)) {
        deletedIds.push(targetIdStr);
        if (deletedIds.length > 500) deletedIds.shift();
        await redis.set('medical_records_deleted_ids', deletedIds);
      }

      // Trilha de auditoria LGPD
      await recordAuditLog(redis, {
        userId: auth.id,
        userName: auth.email,
        userRole: auth.role,
        action: 'DELETE_PATIENT',
        details: `Exclusão definitiva de prontuário: ${targetPatient?.nome || 'ID ' + targetId}`,
        ip,
      });

      return res.status(200).json({
        success: true,
        message: `Prontuário do paciente ${targetPatient?.nome || targetId} excluído com sucesso.`,
        remainingCount: remainingPatients.length,
      });
    }

    // ==========================================
    // GET: BUSCAR PACIENTES COM DECRIPTOGRAFIA & FILTRAGEM RBAC
    // ==========================================
    if (req.method === 'GET') {
      const raw = (await redis.get(KEY)) || [];
      const rawArray = Array.isArray(raw) ? raw : [];

      // Filtra IDs excluídos
      const deletedIdsRaw = (await redis.get('medical_records_deleted_ids')) || [];
      const deletedIds = new Set(Array.isArray(deletedIdsRaw) ? deletedIdsRaw.map(String) : []);
      const activeRaw = rawArray.filter((p) => !deletedIds.has(String(p.id)));

      // Descriptografa campos em repouso
      const decryptedData = activeRaw.map((p) => decryptPatientSensitiveFields(p, TOKEN_SECRET));

      // 1. FILTRAGEM NO SERVIDOR PARA FINANCEIRO (billing):
      // Remove integralmente avaliações, evoluções, diagnósticos, acompanhante e anamnese
      if (auth.role === 'billing') {
        const billingOnly = decryptedData.map((p) => ({
          id: p.id,
          nome: p.nome,
          cpf: p.cpf,
          telefone: p.telefone,
          data_nascimento: p.data_nascimento,
          data_pagamento: p.data_pagamento,
          financeiro: p.financeiro || { valor_sessao: 0, pagamento: 0, status: 'pendente' },
        }));
        return res.status(200).json(billingOnly);
      }

      // 2. FILTRAGEM NO SERVIDOR PARA DOUTOR E RECEPÇÃO:
      // Remove dados de cobrança e valores financeiros
      if (auth.role === 'doctor' || auth.role === 'reception') {
        const clinicalOnly = decryptedData.map((p) => {
          const clone = { ...p };
          delete clone.financeiro;
          delete clone.data_pagamento;
          return clone;
        });
        return res.status(200).json(clinicalOnly);
      }

      // 3. Administrador recebe dados clínicos e financeiros completos
      return res.status(200).json(decryptedData);
    }

    // ==========================================
    // POST: ATUALIZAÇÃO COM SANITIZAÇÃO, MERGE INTELIGENTE & CRIPTOGRAFIA EM REPOUSO
    // ==========================================
    if (req.method === 'POST') {
      if (!Array.isArray(body)) {
        return res.status(400).json({ error: 'Body deve ser um array de pacientes ou conter action delete_patient' });
      }

      // Obter IDs excluídos para prevenir ressurreição acidental de pacientes apagados
      const deletedIdsRaw = (await redis.get('medical_records_deleted_ids')) || [];
      const deletedIds = new Set(Array.isArray(deletedIdsRaw) ? deletedIdsRaw.map(String) : []);

      // 1. Sanitizar dados contra XSS e filtrar excluídos
      const sanitizedBody = body
        .filter((p) => !deletedIds.has(String(p.id)))
        .map((p) => sanitizePatientObject(p));

      const existingRaw = (await redis.get(KEY)) || [];
      const existingArray = Array.isArray(existingRaw) ? existingRaw : [];
      const existingPatients = existingArray
        .filter((p) => !deletedIds.has(String(p.id)))
        .map((p) => decryptPatientSensitiveFields(p, TOKEN_SECRET));

      let merged = [];

      // Perfil Financeiro: Atualiza exclusivamente financeiro e data_pagamento
      if (auth.role === 'billing') {
        merged = existingPatients.map((existing) => {
          const inc = sanitizedBody.find((p) => p.id === existing.id);
          if (inc && inc.financeiro) {
            return {
              ...existing,
              financeiro: inc.financeiro,
              data_pagamento: inc.data_pagamento || existing.data_pagamento,
              updatedAt: new Date().toISOString(),
            };
          }
          return existing;
        });
      }
      // Perfil Doutor / Recepção: Atualiza dados clínicos com merge inteligente e preserva financeiro
      else if (auth.role === 'doctor' || auth.role === 'reception') {
        merged = sanitizedBody.map((inc) => {
          const existing = existingPatients.find((p) => p.id === inc.id);
          if (existing) {
            return {
              ...inc,
              financeiro: existing.financeiro,
              data_pagamento: existing.data_pagamento,
              // Merge inteligente de coleções para evitar sobrescrita concomitante
              consultas: mergePatientLists(existing.consultas, inc.consultas),
              evolucoes: mergePatientLists(existing.evolucoes, inc.evolucoes),
              avaliacoes: mergePatientLists(existing.avaliacoes, inc.avaliacoes),
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            ...inc,
            updatedAt: new Date().toISOString(),
          };
        });

        // Preserva pacientes que já existiam e não foram excluídos
        existingPatients.forEach((existing) => {
          if (!deletedIds.has(String(existing.id)) && !merged.some((m) => String(m.id) === String(existing.id))) {
            merged.push(existing);
          }
        });
      }
      // Perfil Admin: Permissão total com merge inteligente
      else {
        merged = sanitizedBody.map((inc) => {
          const existing = existingPatients.find((p) => p.id === inc.id);
          if (existing) {
            return {
              ...inc,
              consultas: mergePatientLists(existing.consultas, inc.consultas),
              evolucoes: mergePatientLists(existing.evolucoes, inc.evolucoes),
              avaliacoes: mergePatientLists(existing.avaliacoes, inc.avaliacoes),
              updatedAt: new Date().toISOString(),
            };
          }
          return { ...inc, updatedAt: new Date().toISOString() };
        });

        existingPatients.forEach((existing) => {
          if (!deletedIds.has(String(existing.id)) && !merged.some((m) => String(m.id) === String(existing.id))) {
            merged.push(existing);
          }
        });
      }

      // Criptografa todos os campos confidenciais antes de gravar no Redis
      const encryptedToSave = merged.map((p) => encryptPatientSensitiveFields(p, TOKEN_SECRET));
      await redis.set(KEY, encryptedToSave);

      // Trilha de auditoria LGPD
      await recordAuditLog(redis, {
        userId: auth.id,
        userName: auth.email,
        userRole: auth.role,
        action: 'UPDATE_PATIENTS',
        details: `Sincronização de prontuários (${merged.length} pacientes atualizados)`,
        ip,
      });

      return res.status(200).json({ success: true, count: merged.length });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro na API Upstash Redis:', error);
    return res.status(500).json({ error: 'Erro ao comunicar com o banco de dados' });
  }
}
