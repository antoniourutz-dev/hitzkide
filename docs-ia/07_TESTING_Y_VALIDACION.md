# Testing y validación

## Objetivo

Todo cambio realizado con ayuda de IA debe poder probarse de forma clara.

## Niveles de prueba

### 1. Prueba visual

Comprobar que la interfaz se ve correctamente.

- Móvil
- Tablet
- Escritorio
- Modo claro/oscuro, si existe

### 2. Prueba funcional

Comprobar que el flujo principal funciona.

Ejemplo:

1. Abrir la aplicación.
2. Ir a la sección afectada.
3. Ejecutar la acción principal.
4. Comprobar el resultado esperado.

### 3. Prueba de errores

Comprobar qué ocurre cuando algo falla.

- Campo vacío.
- Datos incorrectos.
- Sin conexión.
- Respuesta lenta.
- Elemento no encontrado.

### 4. Prueba de regresión

Comprobar que lo anterior sigue funcionando.

- Inicio de la app.
- Navegación principal.
- Funciones críticas.
- Guardado de datos.
- Carga de información.

## Plantilla de validación

```md
## Validación de cambio

Fecha:

Tarea:

Archivos modificados:

## Pruebas realizadas

- [ ] Prueba 1
- [ ] Prueba 2
- [ ] Prueba 3

## Resultado

- [ ] Correcto
- [ ] Parcial
- [ ] Incorrecto

## Problemas detectados

- Problema 1
- Problema 2

## Decisión

- [ ] Aceptar cambio
- [ ] Corregir antes de aceptar
- [ ] Revertir cambio
```

## Prompt para pedir pruebas a la IA

```txt
Revisa este cambio y propón una estrategia de pruebas. Separa pruebas manuales, pruebas automáticas, casos límite y posibles regresiones.
```
