# Proof of Importance — demo

Demo interactiva del protocolo de consenso **Proof of Importance (PoI)** de NEM, hecha para la tarea colaborativa 1 (Protocolos de consenso).

**Verla online:** https://loisbriones.github.io/DEMO-PoI-BC/

Se hizo una pequeña red de ejemplo, (14 cuentas). La demo enseña, paso a paso, cómo se calcula la importancia de cada cuenta y cómo se usa después para decidir quién crea el siguiente bloque:

1. **Calcular la importancia**
   - Quién participa: solo las cuentas con al menos 10.000 XEM consolidados.
   - Pagos: los del último mes, con peso que decae cada día.
   - Grupos: detección de grupos, hubs y outliers con SCAN.
   - Ranking: NCDawareRank sobre el grafo de pagos.
   - Importancia: la fórmula final que combina saldo, actividad neta y ranking.
2. **Quién crea el bloque**
   - El sorteo: a quién le toca crear el bloque según su importancia.
   - Simular bloques: muchas rondas seguidas para ver el reparto.

Las cuentas, saldos y pagos son inventados; los parámetros son los reales de NEM (NIS1, *Technical Reference* v1.2.1).

## Estructura

- `index.html` — la página.
- `css/demo.css` — estilos.
- `js/data.js` — datos del ejemplo y parámetros del algoritmo.
- `js/poi.js` — el cálculo de PoI.
- `js/steps.js` — el contenido de cada paso de la demo.
- `js/graph.js`, `js/ui.js`, `js/main.js` — dibujo del grafo, utilidades y reproductor.

## Abrir la demo en local

Los módulos JavaScript no funcionan abriendo el fichero con doble clic; hace falta un servidor:

```sh
python3 -m http.server
# y abrir http://localhost:8000/
```

Atajos: `←` `→` avanzar, `espacio` reproducir, `1` `2` secciones. Enlaces directos a un paso: `#2.1`.

## Uso de IA

El código de esta demo se generó en gran parte con **Claude** (Anthropic), un asistente de IA, a partir de nuestras indicaciones. Nosotros definimos el contenido, el ejemplo y los pasos a explicar, y revisamos el resultado, pero no escribimos la mayor parte del código a mano.
