# Resumen enumerado del trabajo en `data_miners`

1. Se creó la ruta de orquestación `POST /miners/run-all-engines` dentro de `app/modules/data_miners/router.py`.
2. La ruta acepta un body JSON con `platforms`, `engine` y `limit`.
3. La lógica recorre las combinaciones de plataformas y motores para encolar tareas en segundo plano con `BackgroundTasks`.
4. Cada tarea obtiene sus propias API keys aleatorias mediante `utils.get_random_keys()`.
5. En cada combinación se instancian `MinerSearchService` y `MinerLLMService` de forma independiente para aislar la ejecución.
6. Se mantuvieron las rutas individuales existentes de minería por plataforma sin cambiar el contrato del módulo.
7. En `app/modules/data_miners/services/miner_llm.py` se añadió sanitización de texto para limpiar contexto ruidoso antes de enviarlo a Gemini.
8. En `app/modules/data_miners/services/miner_llm.py` también se reforzó el manejo del esquema JSON de Pydantic v2 y la caché en memoria para evitar repetir consultas iguales.
9. En `app/modules/data_miners/crud.py` se añadió validación de duplicados por URL para evitar insertar registros repetidos.
10. En `app/modules/data_miners/prompts.py` se reescribió el system prompt para inteligencia competitiva enfocada en Unity, Unreal Engine y Godot.
11. En `app/modules/data_miners/services/miner_search.py` se fortaleció la construcción de queries, la concurrencia y el manejo de errores HTTP.
12. Se validó sintácticamente el código nuevo para confirmar que no quedaran errores en los archivos tocados.
