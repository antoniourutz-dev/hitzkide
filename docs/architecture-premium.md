# Arquitectura objetivo premium

## Principios

- El frontend debe seguir funcionando sin Supabase y sin red siempre que exista cache local utilizable.
- La logica pedagogica no depende de la UI.
- La persistencia y la observabilidad no deben contaminar la capa de presentacion.
- Cada release debe poder validarse con una barra de calidad automatizable.

## Limites por capa

### UI

- `src/pages`
- `src/components`
- `src/hooks`

Responsabilidad:
- Navegacion
- Renderizado
- Feedback inmediato al usuario

### Dominio

- `src/types`
- `src/services/questionService.ts`
- `src/services/discourseClozeDiagnosisService.ts`
- partes de `src/services/playerService.ts` relacionadas con progreso, niveles y mastery

Responsabilidad:
- Reglas pedagogicas
- Generacion de sesiones
- Calculo de progreso y repeticion

### Persistencia

- `src/lib/supabase.ts`
- `src/lib/storage.ts`
- `src/services/contentCache.ts`
- partes de `src/services/playerService.ts` relacionadas con snapshots locales y cloud sync

Responsabilidad:
- Cache local
- Sincronizacion con Supabase
- Serializacion del estado

### Analitica y observabilidad

- `src/analytics/observabilityService.ts`
- `src/config/appMetadata.ts`

Responsabilidad:
- Eventos de runtime
- Errores de sync y Supabase
- Metricas de uso por feature y modo
- Preparacion para sink remoto en `client_observability_events`

## Politica de versionado

- La version de referencia vive en `package.json`.
- El bundle expone esa version mediante `__APP_VERSION__`.
- Regla recomendada:
  - `MAJOR`: ruptura de compatibilidad o cambios de modelo de datos
  - `MINOR`: nuevas capacidades estables
  - `PATCH`: correcciones, rendimiento, accesibilidad, contenido

## Criterios de release premium

Una version solo debe considerarse publicable si cumple:

- `npm run lint`
- `npm run lint:eslint`
- `npm run test:run`
- `npm run build`

Y ademas:

- Sin perdida de progreso local/cloud en pruebas manuales
- Rutas criticas verificadas
- PWA instalable y con fallback offline valido
- Accesibilidad basica de foco, zoom y navegacion por teclado

## Observabilidad minima exigida

- Error global de runtime capturado
- Fallos de Supabase y sync capturados
- Metricas de uso por:
  - `synonym`
  - `cloze`
  - `discourse`
- Eventos por fase:
  - `requested`
  - `started`
  - `completed`
  - `failed`

## Siguiente evolucion recomendada

- Extraer `playerService` en modulos de dominio y persistencia separados.
- Añadir dashboard interno o export de snapshot de observabilidad.
- Completar migraciones del dominio linguistico en SQL reproducible extremo a extremo.
