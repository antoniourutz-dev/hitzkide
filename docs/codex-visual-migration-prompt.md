Lee el archivo /docs/visual-style-guide.md.

Quiero aplicar este sistema visual a la aplicación actual.

Reglas estrictas:

1. No modificar lógica de negocio.
2. No tocar Supabase.
3. No cambiar servicios.
4. No cambiar tipos.
5. No cambiar rutas.
6. No cambiar datos.
7. Mantener todos los textos visibles de la UI en euskera.
8. Mantener nombres internos de código en inglés.
9. Aplicar mobile-first.
10. Evitar scroll innecesario en pantallas de juego.
11. Respetar accesibilidad y contraste.
12. Respetar prefers-reduced-motion.
13. No hacer una migración masiva de toda la app en una sola intervención.

Primera fase:

- Revisa el sistema de estilos actual.
- Detecta si el proyecto usa Tailwind CSS 3 o Tailwind CSS 4.
- Añade los tokens visuales necesarios.
- Añade clases reutilizables:
  - .sleek-card
  - .sleek-card-interactive
  - .sleek-btn-primary
  - .sleek-btn-secondary
  - .sleek-btn-option
  - .skeleton

Segunda fase:
Aplica el sistema visual únicamente a:

- Button
- Card
- PageLayout
- Header
- BottomNavigation

No modifiques todavía GamePage, StatsPage ni Supabase.

Entrega:

- Archivos modificados.
- Resumen técnico de cambios.
- Riesgos detectados.
- Siguiente fase recomendada.
