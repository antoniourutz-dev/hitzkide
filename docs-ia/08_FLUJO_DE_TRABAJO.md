# Flujo profesional de trabajo con IA

## Fase 1: Preparar contexto

Antes de pedir una tarea:

1. Revisar `01_CONTEXTO_DEL_PROYECTO.md`.
2. Confirmar el estado actual de la app.
3. Identificar archivos implicados.
4. Definir restricciones.

## Fase 2: Pedir análisis

No empezar directamente con código.

Prompt recomendado:

```txt
Analiza esta tarea con el contexto del proyecto. Dame diagnóstico, riesgos, archivos afectados y plan de implementación. No escribas código todavía.
```

## Fase 3: Implementar en pasos pequeños

Cada cambio debe ser limitado.

Buenas prácticas:

- Una funcionalidad por iteración.
- Un bug por iteración.
- Una refactorización por bloque.
- Un objetivo comprobable por respuesta.

## Fase 4: Revisar

Después del código, pedir:

```txt
Revisa el cambio como si fueras un revisor senior. Busca errores, riesgos, duplicación, problemas de rendimiento y casos límite.
```

## Fase 5: Probar

Usar `07_TESTING_Y_VALIDACION.md`.

La IA debe indicar:

- Qué probar.
- Cómo probarlo.
- Qué resultado esperar.
- Qué errores podrían aparecer.

## Fase 6: Documentar

Actualizar:

- `10_CONTROL_DE_CAMBIOS.md`
- `06_ARQUITECTURA_Y_DECISIONES.md`, si hay una decisión técnica importante.
- README del proyecto, si cambia el uso de la app.

## Fase 7: Cerrar tarea

Una tarea se cierra cuando:

- El objetivo está cumplido.
- Se han probado los flujos principales.
- No hay regresiones conocidas.
- El cambio está documentado.
