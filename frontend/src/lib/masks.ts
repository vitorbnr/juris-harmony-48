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
