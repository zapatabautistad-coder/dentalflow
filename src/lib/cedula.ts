// Validación de la Cédula de Identidad y Electoral dominicana: 11 dígitos
// con dígito verificador (módulo 10, pesos alternados 1,2,1,2,...).
export function validateCedula(cedula: string): boolean {
  const digits = cedula.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^0+$/.test(digits)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    let product = Number(digits[i]) * weights[i];
    if (product > 9) product -= 9;
    sum += product;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[10]);
}
