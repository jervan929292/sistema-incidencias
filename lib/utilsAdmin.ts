// Archivo: lib/utilsAdmin.ts

// LISTA ESTRICTA DE ORGANISMOS DEL ESTADO FALCÓN
export const LISTA_ORGANISMOS = [
  "CICPC",
  "CUERPO DE POLICIA NACIONAL BOLIVARIANA",
  "GUARDIA NACIONAL BOLIVARIANA",
  "POLICIA DEL ESTADO FALCON",
  "POLICIA MUNICIPAL DE CARIRUBANA",
  "POLICIA MUNICIPAL DE MIRANDA"
];

// DICCIONARIO PARA OBTENER LAS SIGLAS DEL ORGANISMO
export const getSiglas = (organismo: string) => {
  const orgLow = (organismo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (orgLow.includes('cicpc')) return 'CICPC';
  if (orgLow.includes('cuerpo de policia nacional bolivariana') || orgLow.includes('pnb') || orgLow.includes('cpnb')) return 'CPNB';
  if (orgLow.includes('guardia nacional bolivariana') || orgLow.includes('gnb')) return 'GNB';
  if (orgLow.includes('policia del estado falcon') || orgLow.includes('estadal') || orgLow.includes('polifalcon')) return 'POLIFALCÓN';
  if (orgLow.includes('policia municipal de carirubana')) return 'POLICARIRUBANA';
  if (orgLow.includes('policia municipal de miranda')) return 'POLIMIRANDA';
  
  return organismo || 'SIN ORGANISMO';
};

// FILTRO ESTRICTO: Compara el valor de la BD contra la selección
export const matchesOrganismo = (dbValue: string, targetOrg: string) => {
  if (!targetOrg) return true;
  
  const normalize = (s: string) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  
  const val = normalize(dbValue);
  const target = normalize(targetOrg);

  return val === target;
};