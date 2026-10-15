/**
 * Validação do algoritmo oficial da Receita Federal para CPF (Cadastro de Pessoas Físicas)
 */
export function isValidCPF(cpf) {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = String(cpf).replace(/\D/g, '');

  // Deve ter exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Rejeita sequências conhecidas de dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit >= 10) firstDigit = 0;

  if (firstDigit !== parseInt(cleanCPF.charAt(9), 10)) {
    return false;
  }

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit >= 10) secondDigit = 0;

  return secondDigit === parseInt(cleanCPF.charAt(10), 10);
}

/**
 * Aplica máscara automática de CPF: 000.000.000-00
 */
export function formatCPF(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
