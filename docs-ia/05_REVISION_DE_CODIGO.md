# Checklist de revisión de código

## Funcionalidad

- [ ] El cambio resuelve el problema descrito.
- [ ] No rompe funcionalidades existentes.
- [ ] Gestiona casos vacíos o errores.
- [ ] Funciona en móvil y escritorio, si aplica.
- [ ] El comportamiento es coherente con el resto de la app.

## Calidad del código

- [ ] El código es claro y legible.
- [ ] Los nombres de variables y funciones son descriptivos.
- [ ] No hay duplicación innecesaria.
- [ ] Las funciones no son demasiado largas.
- [ ] La lógica compleja está bien separada.
- [ ] No se han añadido dependencias innecesarias.

## Arquitectura

- [ ] El cambio encaja en la estructura existente.
- [ ] No mezcla responsabilidades.
- [ ] No introduce acoplamiento innecesario.
- [ ] Es fácil de ampliar en el futuro.

## Rendimiento

- [ ] No hay cálculos pesados innecesarios en renderizados.
- [ ] No se hacen peticiones repetidas sin control.
- [ ] Se evita cargar datos innecesarios.
- [ ] Se usan memorias, cachés o lazy loading si procede.

## Seguridad

- [ ] No se exponen claves ni secretos.
- [ ] Se validan entradas del usuario.
- [ ] Se evita inyectar HTML sin control.
- [ ] Se gestionan permisos correctamente.
- [ ] Se controlan errores del backend.

## Accesibilidad

- [ ] Los botones tienen texto comprensible.
- [ ] Los formularios tienen etiquetas.
- [ ] Hay contraste suficiente.
- [ ] Se puede navegar con teclado, si aplica.
- [ ] Los mensajes de error son claros.

## Testing

- [ ] Hay pruebas manuales claras.
- [ ] Hay pruebas automáticas si la funcionalidad lo requiere.
- [ ] Se han probado casos límite.
- [ ] Se ha probado el flujo principal.

## Documentación

- [ ] Se ha actualizado el README si procede.
- [ ] Se han documentado decisiones importantes.
- [ ] Se ha actualizado el registro de cambios.
