# Tech Trends: estrategia de queries y tradeoffs

## Contexto

El módulo `tech_trends` usa Tavily como motor de búsqueda para capturar señales sobre:

- `Unity`
- `Robotic`
- `AI`
- `Digital twins`

Luego un primer LLM transforma los resultados en registros estructurados y un segundo LLM consolida esos registros en reportes ejecutivos.

## Por qué se usan varias queries

No conviene depender de una sola query porque una búsqueda única suele traer resultados sesgados o incompletos.

Usar varias queries mejora la cobertura por estas razones:

- aumenta el recall, es decir, la probabilidad de encontrar más señales relevantes;
- reduce el riesgo de quedarse solo con un ángulo del tema;
- captura variaciones semánticas del mismo concepto, por ejemplo `Unity robotics simulation`, `Unity AI workflow` o `industrial digital twins`;
- permite balancear intención de búsqueda: una parte enfocada en Unity y otra parte más amplia para contexto del mercado.

En otras palabras, más queries no significa solo más ruido. Bien diseñadas, permiten obtener datos de mejor calidad y una visión más completa del mercado.

## Por qué el servicio puede parecer “caro”

El costo no está en una sola llamada de negocio, sino en la estrategia interna de búsqueda.

Cuando el servicio hace varias queries:

- consume más peticiones HTTP hacia Tavily;
- aumenta la latencia total del scrape;
- puede acercarse a límites de uso o rate limit;
- genera más resultados para filtrar, deduplicar y clasificar.

Eso no es un error de diseño por sí mismo. Es el precio de mejorar cobertura y calidad de datos.

## Por qué no está mal tener más queries

Tener más queries está justificado cuando el objetivo es vigilancia tecnológica y no solo una búsqueda puntual.

En este caso el sistema busca señales, no solo documentos exactos. Por eso conviene:

- ampliar la superficie de búsqueda;
- combinar consultas específicas y consultas generales;
- dejar que el clasificador posterior seleccione lo útil.

Esto suele producir mejores insights que una búsqueda mínima con pocos resultados, especialmente cuando el dominio cambia rápido.

## Riesgo actual

El riesgo principal no es funcional, sino operativo:

- demasiadas queries pueden volver el proceso lento;
- se puede gastar cuota de búsqueda innecesariamente;
- el volumen de resultados puede crecer más rápido que la capacidad de análisis.

## Mejor solución propuesta

La mejor solución no es eliminar queries, sino hacer la búsqueda más inteligente.

### Estrategia recomendada

1. Mantener un núcleo pequeño de queries muy bien diseñadas.
2. Ejecutar pocas consultas de alto valor en cada corrida.
3. Re-ranquear y deduplicar localmente los resultados.
4. Guardar resultados históricos para no repetir búsquedas similares.
5. Expandir queries solo cuando una categoría quede subrepresentada.

### Ejemplo práctico

- 1 query fuerte de Unity;
- 1 query fuerte de AI;
- 1 query fuerte de Digital Twins;
- 1 query broad para capturar contexto externo.

Eso mantiene buena cobertura con menos costo que una matriz grande de consultas.

## Solución ideal a mediano plazo

La mejor arquitectura sería un enfoque híbrido:

- **fase 1**: pocas queries base por categoría;
- **fase 2**: deduplicación y ranking local;
- **fase 3**: caché de resultados por ventana temporal;
- **fase 4**: queries adicionales solo si faltan señales en una categoría;
- **fase 5**: consolidación ejecutiva con el segundo LLM.

Con eso se obtiene un equilibrio mejor entre:

- costo;
- cobertura;
- calidad del dato;
- velocidad de respuesta.

## Mensaje para liderazgo

La implementación actual no está mal porque prioriza descubrir más señales y no solo hacer menos requests.

Más queries pueden entregar mejores datos, porque aumentan la probabilidad de encontrar evidencia relevante y reducen puntos ciegos.

Sin embargo, la solución óptima no es crecer sin control, sino convertir esa búsqueda en un sistema más selectivo: menos peticiones base, mejor ranking local y más reutilización de resultados.
