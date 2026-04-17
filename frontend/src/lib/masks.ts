export const maskCPF = (value: string) => {
  const v = value.replace(/\D/g, "").substring(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const maskCNPJ = (value: string) => {
  const v = value.replace(/\D/g, "").substring(0, 14);
  return v
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const maskPhone = (value: string) => {
  const v = value.replace(/\D/g, "").substring(0, 11);
  return v
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{4,5})(\d{4})$/, "$1-$2");
};

const digitsOnly = (value: string, max: number) => value.replace(/\D/g, "").substring(0, max);

export const maskRG = (value: string) => {
  const v = digitsOnly(value, 9);
  return v
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)$/, "$1-$2");
};

export const maskCTPS = (value: string) => {
  const v = digitsOnly(value, 13);
  return v
    .replace(/(\d{7})(\d)/, "$1 $2")
    .replace(/(\d{7}) (\d{4})(\d)/, "$1 $2 $3");
};

export const maskPIS = (value: string) => {
  const v = digitsOnly(value, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{5})(\d)/, "$1.$2")
    .replace(/(\d{2})(\d)$/, "$1-$2");
};

export const maskTituloEleitorNumero = (value: string) => {
  const v = digitsOnly(value, 12);
  return v
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4}) (\d{4})(\d)/, "$1 $2 $3");
};

export const maskTituloEleitorZona = (value: string) => digitsOnly(value, 3);

export const maskTituloEleitorSessao = (value: string) => digitsOnly(value, 4);

export const maskCnhNumero = (value: string) => digitsOnly(value, 11);

export const maskPassaporte = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 20);

export const maskReservista = (value: string) => digitsOnly(value, 20);

export const maskProcesso = (value: string) => {
  // Padrão CNJ: 0000000-00.0000.8.00.0000 (20 dígitos)
  let v = value.replace(/\D/g, "").substring(0, 20);
  v = v.replace(/^(\d{7})(\d)/, "$1-$2");
  v = v.replace(/^(\d{7})-(\d{2})(\d)/, "$1-$2.$3");
  v = v.replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/, "$1-$2.$3.$4");
  v = v.replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d{1})(\d)/, "$1-$2.$3.$4.$5");
  v = v.replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d{1})\.(\d{2})(\d)/, "$1-$2.$3.$4.$5.$6");
  return v;
};

export const maskCurrency = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (!v) return "";
  const num = (Number(v) / 100).toFixed(2);
  const formatted = num.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return `R$ ${formatted}`;
};

export const parseCurrency = (value: string) => {
  const v = value.replace(/\D/g, "");
  if (!v) return null;
  return Number(v) / 100;
};
