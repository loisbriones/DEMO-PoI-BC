// Datos del ejemplo. Cuentas, saldos y pagos son inventados;
// los parámetros son los reales de NEM (NIS1, Technical Reference v1.2.1).

// vest: saldo consolidado (vested) en XEM. x, y: posición en el mapa.
export const ACCOUNTS = [
  { id: 'Ana',   x: 130, y: 200, vest: 60000 },
  { id: 'Bruno', x: 110, y: 320, vest: 40000 },
  { id: 'Carla', x: 240, y: 325, vest: 25000 },
  { id: 'Dani',  x: 250, y: 190, vest: 30000 },
  { id: 'Elena', x: 195, y: 95,  vest: 15000 },
  { id: 'Fabio', x: 315, y: 410, vest: 12000 },
  { id: 'Gema',  x: 425, y: 190, vest: 80000 },
  { id: 'Hugo',  x: 430, y: 325, vest: 35000 },
  { id: 'Inés',  x: 560, y: 320, vest: 20000 },
  { id: 'Jorge', x: 550, y: 200, vest: 45000 },
  { id: 'Kike',  x: 475, y: 95,  vest: 18000 },
  { id: 'Lucía', x: 335, y: 65,  vest: 120000 },
  { id: 'Marta', x: 440, y: 450, vest: 50000 },
  { id: 'Nico',  x: 70,  y: 445, vest: 4000 },
];

// Pagos: [emisor, receptor, XEM, hace cuántos días]
export const TXS = [
  ['Ana', 'Bruno', 5000, 2], ['Bruno', 'Dani', 4000, 1], ['Carla', 'Ana', 6000, 3], ['Ana', 'Carla', 1500, 0],
  ['Carla', 'Bruno', 3000, 0], ['Dani', 'Ana', 2500, 1], ['Dani', 'Carla', 3500, 4], ['Ana', 'Elena', 3000, 2],
  ['Carla', 'Fabio', 2000, 0], ['Gema', 'Hugo', 4000, 0], ['Hugo', 'Jorge', 3000, 1], ['Inés', 'Gema', 5000, 2],
  ['Inés', 'Hugo', 2000, 0], ['Jorge', 'Gema', 3000, 3], ['Jorge', 'Inés', 2500, 0], ['Kike', 'Gema', 3000, 1],
  ['Elena', 'Lucía', 4000, 1], ['Lucía', 'Kike', 8000, 2], ['Marta', 'Fabio', 6000, 5], ['Nico', 'Ana', 2000, 0],
  ['Gema', 'Lucía', 9000, 35], ['Hugo', 'Kike', 600, 1],
];

export const P = {
  MINB: 10000,   // saldo consolidado mínimo para participar
  MINL: 1000,    // mínimo por transferencia y por arista del grafo
  DAYS: 30,      // ventana de pagos que se leen
  DECAY: 0.9,    // cada día un pago pesa un 10 % menos
  EPS: 0.3,      // SCAN: parecido mínimo para ser "vecina parecida"
  MU: 4,         // SCAN: vecinas parecidas (contándose) para ser núcleo
  ETA: 0.7,      // NCDawareRank: seguir los pagos
  MUR: 0.1,      // NCDawareRank: saltar al "barrio" (grupo)
  TELE: 0.2,     // NCDawareRank: saltar a cualquiera
  WO: 1.25,      // peso de la actividad neta (salidas − entradas)
  WI: 0.1337,    // peso del ranking
  NEG: 0.6,      // la actividad negativa se suaviza
  CHI: 0.9,      // penalización a hubs y outliers
  RECALC: 359,   // bloques entre recálculos (~6 h)
  BLOCK: 60,     // segundos objetivo entre bloques
};

// Semilla del sorteo que muestra la demo (gana Jorge; se ven bien varios hits)
export const DEMO_SEED = 1434;

// Colores con significado (los mismos que en las diapositivas)
export const KCOL = { g1: '#2F6DB5', g2: '#E08A1E', g3: '#2A9D8F', g4: '#9C6B30', hub: '#7B4FBF', outlier: '#C8406A' };
export const KNAME = { g1: 'Grupo 1', g2: 'Grupo 2', g3: 'Grupo 3', g4: 'Grupo 4', hub: 'Hub', outlier: 'Outlier' };
export const OFF = '#B5B9BF';
export const NEUTRAL = '#5C6B7A';
