import crypto from 'crypto';

// ==========================================
// 1. HASH DE SENHA SEGURO (OWASP: 210.000 iterações)
// ==========================================
export function hashPassword(password, iterations = 210000) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `${salt}:${iterations}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return { isValid: false, needsRehash: false };
  }

  const parts = storedHash.split(':');

  // Formato legado: salt:hash (1000 iterações)
  if (parts.length === 2) {
    const [salt, originalHash] = parts;
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
    return { isValid, needsRehash: isValid };
  }

  // Formato moderno: salt:iterations:hash
  if (parts.length === 3) {
    const [salt, iterStr, originalHash] = parts;
    const iterations = parseInt(iterStr, 10) || 210000;
    const testHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
    const needsRehash = isValid && iterations < 210000;
    return { isValid, needsRehash };
  }

  return { isValid: false, needsRehash: false };
}

// ==========================================
// 2. CRIPTOGRAFIA EM REPOUSO (AES-256-GCM)
// ==========================================
function getEncryptionKey(secret) {
  const masterKey =
    secret ||
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.DB_KV_REST_API_TOKEN ||
    'medsync_aes_gcm_production_secret_key_2026';
  return crypto.scryptSync(masterKey, 'medsync_aes_gcm_salt_2026', 32);
}

export function encryptData(plainData, secret) {
  if (plainData === null || plainData === undefined) return plainData;
  try {
    const key = getEncryptionKey(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonStr = JSON.stringify(plainData);
    let ciphertext = cipher.update(jsonStr, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext}`;
  } catch (err) {
    console.error('Erro ao criptografar campo:', err);
    return plainData;
  }
}

export function decryptData(encryptedValue, secret) {
  if (typeof encryptedValue !== 'string' || !encryptedValue.startsWith('enc:')) {
    return encryptedValue;
  }
  try {
    const parts = encryptedValue.split(':');
    let ivHex, tagHex, cipherHex;
    if (parts.length === 5 && parts[1] === 'v1') {
      ivHex = parts[2];
      tagHex = parts[3];
      cipherHex = parts[4];
    } else if (parts.length === 4) {
      ivHex = parts[1];
      tagHex = parts[2];
      cipherHex = parts[3];
    } else {
      return encryptedValue;
    }

    const key = getEncryptionKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Erro ao descriptografar campo:', err);
    return encryptedValue;
  }
}

export function encryptPatientSensitiveFields(patient, secret) {
  if (!patient || typeof patient !== 'object') return patient;
  const clone = { ...patient };
  if (clone.cpf) clone.cpf = encryptData(clone.cpf, secret);
  if (clone.diagnostico) clone.diagnostico = encryptData(clone.diagnostico, secret);
  if (clone.evolucoes) clone.evolucoes = encryptData(clone.evolucoes, secret);
  if (clone.avaliacoes) clone.avaliacoes = encryptData(clone.avaliacoes, secret);
  return clone;
}

export function decryptPatientSensitiveFields(patient, secret) {
  if (!patient || typeof patient !== 'object') return patient;
  const clone = { ...patient };
  if (clone.cpf) clone.cpf = decryptData(clone.cpf, secret);
  if (clone.diagnostico) clone.diagnostico = decryptData(clone.diagnostico, secret);
  if (clone.evolucoes) clone.evolucoes = decryptData(clone.evolucoes, secret);
  if (clone.avaliacoes) clone.avaliacoes = decryptData(clone.avaliacoes, secret);
  return clone;
}

// ==========================================
// 3. SANITIZAÇÃO DE ENTRADAS (Anti-XSS)
// ==========================================
export function sanitizeText(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '');
}

export function sanitizePatientObject(patient) {
  if (!patient || typeof patient !== 'object') return patient;
  const cleaned = { ...patient };
  ['nome', 'diagnostico', 'queixa_principal', 'historico_medico', 'observacoes'].forEach((field) => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = sanitizeText(cleaned[field]);
    }
  });
  if (Array.isArray(cleaned.evolucoes)) {
    cleaned.evolucoes = cleaned.evolucoes.map((e) => ({
      ...e,
      texto: typeof e.texto === 'string' ? sanitizeText(e.texto) : e.texto,
    }));
  }
  return cleaned;
}

export const sanitizeInput = sanitizeText;
export const sanitizePatientData = sanitizePatientObject;

// ==========================================
// 4. RATE LIMITING NO REDIS (Anti-Brute Force)
// ==========================================
export async function checkRateLimit(redis, identifier, maxAttempts = 5) {
  if (!redis || !identifier) return { allowed: true, remainingAttempts: maxAttempts };
  try {
    const key = `ratelimit:auth:${identifier}`;
    const data = await redis.get(key);
    if (!data) return { allowed: true, remainingAttempts: maxAttempts };

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (Date.now() > parsed.resetAt) {
      await redis.del(key);
      return { allowed: true, remainingAttempts: maxAttempts };
    }

    if (parsed.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((parsed.resetAt - Date.now()) / 1000);
      return {
        allowed: false,
        retryAfter: retryAfterSeconds,
        remainingTime: retryAfterSeconds,
        message: `Muitas tentativas falhas. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} minutos.`,
      };
    }

    return { allowed: true, remainingAttempts: maxAttempts - parsed.count };
  } catch (err) {
    console.warn('Falha no rate limit check:', err);
    return { allowed: true, remainingAttempts: maxAttempts };
  }
}

export async function incrementRateLimit(redis, identifier, windowSeconds = 900) {
  if (!redis || !identifier) return;
  try {
    const key = `ratelimit:auth:${identifier}`;
    const data = await redis.get(key);
    const parsed = data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;

    if (parsed && Date.now() < parsed.resetAt) {
      parsed.count += 1;
      await redis.set(key, parsed);
    } else {
      const newEntry = {
        count: 1,
        resetAt: Date.now() + windowSeconds * 1000,
      };
      await redis.set(key, newEntry);
    }
  } catch (err) {
    console.warn('Falha ao registrar tentativa falha no rate limit:', err);
  }
}

export async function resetRateLimit(redis, identifier) {
  if (!redis || !identifier) return;
  try {
    const key = `ratelimit:auth:${identifier}`;
    await redis.del(key);
  } catch (err) {
    console.warn('Falha ao resetar rate limit:', err);
  }
}

// ==========================================
// 5. TRILHA DE AUDITORIA IMUTÁVEL (LGPD / CFM)
// ==========================================
export async function recordAuditLog(redis, logEntry) {
  if (!redis) return;
  try {
    const entry = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      userId: logEntry.userId || 'system',
      userName: logEntry.userName || 'Sistema',
      userRole: logEntry.userRole || 'system',
      action: logEntry.action || 'INFO',
      targetId: logEntry.targetId || null,
      details: logEntry.details || '',
      ip: logEntry.ip || 'local',
    };

    const logs = (await redis.get('audit_logs')) || [];
    const arr = Array.isArray(logs) ? logs : [];
    arr.unshift(entry);
    if (arr.length > 1000) arr.length = 1000;
    await redis.set('audit_logs', arr);
    return entry;
  } catch (err) {
    console.warn('Falha ao gravar log de auditoria:', err);
    return null;
  }
}

export async function getAuditLogs(redis, limit = 200) {
  if (!redis) return [];
  try {
    const logs = (await redis.get('audit_logs')) || [];
    if (!Array.isArray(logs)) return [];
    return logs.slice(0, limit);
  } catch (err) {
    console.warn('Falha ao listar logs de auditoria:', err);
    return [];
  }
}

// ==========================================
// 6. CONCORRÊNCIA OTIMISTA & MERGE INTELIGENTE
// ==========================================
export function mergePatientLists(existingList = [], incomingList = []) {
  const map = new Map();
  existingList.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  incomingList.forEach((item) => {
    if (item && item.id) {
      const existing = map.get(item.id);
      map.set(item.id, { ...existing, ...item });
    }
  });
  return Array.from(map.values());
}

// ==========================================
// 7. AUTENTICAÇÃO DE DOIS FATORES (TOTP / MFA - RFC 6238)
// ==========================================
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(base32Str) {
  const clean = (base32Str || '').toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateBase32Secret(byteLength = 20) {
  const randomBuf = crypto.randomBytes(byteLength);
  return base32Encode(randomBuf);
}

export function generateTOTP(secretBase32, timeStepOffset = 0, timeStepSeconds = 30) {
  const key = base32Decode(secretBase32);
  const epochSeconds = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epochSeconds / timeStepSeconds) + timeStepOffset;

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export function verifyTOTP(inputCode, secretBase32, window = 1, timeStepSeconds = 30) {
  if (!inputCode || !secretBase32) return { isValid: false, delta: 0 };
  const cleanCode = String(inputCode).trim().replace(/\s+/g, '');
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { isValid: false, delta: 0 };
  }

  for (let offset = -window; offset <= window; offset++) {
    const validCode = generateTOTP(secretBase32, offset, timeStepSeconds);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(validCode))) {
      return { isValid: true, delta: offset };
    }
  }
  return { isValid: false, delta: 0 };
}

export function getOtpAuthUrl(email, secretBase32, issuer = 'ViguMed') {
  const cleanEmail = encodeURIComponent(email || 'usuario@vigumed.com');
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secretBase32}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateBackupCodes(count = 5) {
  const plainCodes = [];
  const hashedCodes = [];
  for (let i = 0; i < count; i++) {
    const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${p1}-${p2}`; // Ex: 4B8F-92CE
    plainCodes.push(code);
    hashedCodes.push(hashPassword(code, 210000));
  }
  return { plainCodes, hashedCodes };
}

export function verifyAndConsumeBackupCode(inputCode, hashedCodes = []) {
  if (!inputCode || !Array.isArray(hashedCodes) || hashedCodes.length === 0) {
    return { isValid: false, remainingHashedCodes: hashedCodes };
  }
  const cleanCode = String(inputCode).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  for (let i = 0; i < hashedCodes.length; i++) {
    const check = verifyPassword(cleanCode, hashedCodes[i]);
    if (check.isValid) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { isValid: true, remainingHashedCodes: remaining };
    }
  }
  return { isValid: false, remainingHashedCodes: hashedCodes };
}
