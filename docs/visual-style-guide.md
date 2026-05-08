# Visual Style Guide — Estilo Zinok

## 1. Objetivo

Aplicar a la aplicación un estilo visual inspirado en Zinok: una interfaz educativa, moderna, enérgica y neobrutalista.

El objetivo no es copiar pantallas, sino trasladar un sistema visual coherente:

- fuente
- colores
- botones
- tarjetas
- sombras
- bordes
- animaciones
- navegación
- experiencia móvil

La aplicación debe mantener su lógica actual intacta.

---

## 2. Identidad visual

El estilo debe ser **neobrutalista educativo**.

Características principales:

- Fondo claro.
- Tarjetas blancas.
- Bordes negros gruesos.
- Sombras duras desplazadas.
- Esquinas rectas.
- Tipografía fuerte.
- Botones grandes, claros y físicos.
- Transiciones rápidas.
- Feedback visual inmediato.
- Sensación de juego serio, moderno y dinámico.

La interfaz debe transmitir:

- claridad
- energía
- precisión
- personalidad
- facilidad de uso en móvil

---

## 3. Fuente

Fuente principal:

```css

```

Importar desde Google Fonts:

```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
```

Pesos recomendados:

- `400`: texto normal.
- `500`: texto auxiliar.
- `600`: etiquetas y subtítulos.
- `700`: títulos secundarios.
- `800`: títulos destacados.
- `900`: botones, titulares y elementos principales.

Reglas tipográficas:

- Usar `font-black` en botones y elementos principales.
- Usar `uppercase` en botones, etiquetas, niveles y acciones cortas.
- Usar `tracking-widest` en botones.
- Usar `tracking-tight` en títulos grandes.
- No usar mayúsculas en textos largos, explicaciones o definiciones.
- Priorizar legibilidad en contenidos lingüísticos largos.

---

## 4. Paleta de colores

Tokens principales:

```
--color-brand-primary: #3b82f6;--color-brand-secondary: #f59e0b;--color-brand-accent: #8b5cf6;--color-brand-bg: #f8fafc;--color-brand-text: #0f172a;--color-brand-border: #0f172a;
```

Uso recomendado:

| Token             | Color     | Uso                                              |
| ----------------- | --------- | ------------------------------------------------ |
| `brand-primary`   | `#3b82f6` | Acción principal, progreso, botones destacados   |
| `brand-secondary` | `#f59e0b` | Acentos, logros, avisos positivos                |
| `brand-accent`    | `#8b5cf6` | Elementos especiales, categorías, detalle visual |
| `brand-bg`        | `#f8fafc` | Fondo general                                    |
| `brand-text`      | `#0f172a` | Texto principal                                  |
| `brand-border`    | `#0f172a` | Bordes y sombras duras                           |

Colores funcionales:

```
Correcto: emerald-500 / emerald-600Error: rose-500 / rose-600Advertencia: amber-400 / amber-500Neutro claro: slate-50 / slate-100Texto secundario: slate-500 / slate-600Texto débil: slate-400
```

Reglas:

- Usar azul para acciones principales.
- Usar ámbar para progreso, logros o elementos motivadores.
- Usar morado solo como acento.
- Usar verde y rojo solo para feedback.
- Evitar fondos oscuros extensos.
- Mantener contraste alto.

---

## 5. Fondo general

La app debe usar un fondo claro:

```
bg-brand-bg text-brand-text font-sans
```

Estructura recomendada:

```
min-h-screen bg-brand-bg text-brand-text font-sans antialiased
```

En pantallas centradas:

```
min-h-screen bg-brand-bg text-brand-text font-sans flex items-center justify-center p-4
```

---

## 6. Tarjetas base

Clase principal:

```
.sleek-card {  @apply bg-white rounded-none border-[3px] border-brand-border shadow-[8px_8px_0px_0px_#0f172a];}
```

Reglas visuales:

- Fondo blanco.
- Esquinas rectas.
- Borde negro de 3px.
- Sombra dura desplazada.
- Sin blur.
- Sin sombra suave tipo SaaS.
- Padding generoso.
- Aspecto de bloque físico.

Uso:

- Contenedores de pregunta.
- Resultados.
- Estadísticas.
- Paneles importantes.
- Tarjetas de navegación.

---

## 7. Tarjetas interactivas

Clase principal:

```
.sleek-card-interactive {  @apply bg-white rounded-none border-[3px] border-brand-border shadow-[10px_10px_0px_0px_#1e293b];  @apply cursor-pointer transition-all duration-200 hover:shadow-[4px_4px_0px_0px_#1e293b] hover:translate-x-[6px] hover:translate-y-[6px] active:scale-[0.98];}
```

Comportamiento:

- Estado normal: tarjeta elevada con sombra dura.
- Hover: la tarjeta se desplaza hacia abajo/derecha y la sombra se reduce.
- Active: ligera reducción de escala.
- Duración: 200 ms.
- Sensación física de pulsación.

Uso:

- Opciones de menú.
- Tarjetas de nivel.
- Tarjetas de modo de juego.
- Accesos principales.
- Elementos clicables importantes.

---

## 8. Botón primario

Clase principal:

```
.sleek-btn-primary {  @apply px-6 py-3 md:px-10 md:py-4 bg-brand-primary text-white rounded-none font-black uppercase tracking-widest border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] active:scale-95 flex items-center justify-center gap-3;}
```

Uso:

- Empezar.
- Continuar.
- Confirmar.
- Reintentar.
- Guardar.
- Acción principal de cada pantalla.

Reglas:

- Solo debe haber una acción primaria clara por pantalla.
- Debe tener texto breve.
- Debe mantener buen tamaño táctil en móvil.
- No debe crecer de forma exagerada.

---

## 9. Botón secundario

Clase principal:

```
.sleek-btn-secondary {  @apply px-6 py-3 md:px-10 md:py-4 bg-white text-slate-800 rounded-none font-black uppercase tracking-widest border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] active:scale-95 flex items-center justify-center gap-3;}
```

Uso:

- Volver.
- Cancelar.
- Menú.
- Ver detalles.
- Acción alternativa.

---

## 10. Botones de opción / respuesta

Clase principal:

```
.sleek-btn-option {  @apply p-4 md:p-6 rounded-none border-[3px] border-brand-border text-center font-black uppercase tracking-tight transition-all duration-200 disabled:pointer-events-none;}
```

Estados recomendados:

### Normal

```
bg-white text-slate-900 border-brand-border shadow-[5px_5px_0px_0px_#0f172a]
```

### Hover

```
hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0px_0px_#0f172a]
```

### Correcto

```
bg-emerald-500 text-white border-emerald-700 shadow-[5px_5px_0px_0px_#047857]
```

### Error seleccionado

```
bg-rose-500 text-white border-rose-700 shadow-[5px_5px_0px_0px_#be123c]
```

### Desactivado

```
opacity-60 grayscale
```

Reglas:

- En móvil, los botones no deben ocupar demasiado alto.
- Mantener texto legible.
- Evitar scroll innecesario.
- Feedback inmediato al responder.

---

## 11. Sombras

Sombras principales:

```
Tarjeta base: 8px 8px 0px 0px #0f172aTarjeta interactiva: 10px 10px 0px 0px #1e293bBotón: 6px 6px 0px 0px #0f172aBotón hover: 2px 2px 0px 0px #0f172a
```

Reglas:

- Las sombras deben ser duras.
- No usar blur.
- No usar sombras suaves salvo en casos muy secundarios.
- La sombra debe reforzar la sensación física del componente.

---

## 12. Bordes y radios

Regla principal:

```
rounded-none
```

Bordes:

```
border-[3px] border-brand-border
```

Excepciones:

- Iconos dentro de círculos: se permite `rounded-full`.
- Avatares: se permite `rounded-full`.
- Chips muy pequeños: se puede usar `rounded-full` si mejora la lectura.
- Contenido largo o editorial: se puede suavizar con `rounded-xl`, pero evitarlo en elementos centrales del juego.

---

## 13. Animaciones

La app puede usar `motion` o `framer-motion`.

Dependencia original:

```
"motion": "^12.23.24"
```

Import recomendado si se usa Motion:

```
import { motion, AnimatePresence } from "motion/react";
```

### Entrada general de pantalla

```
initial={{ opacity: 0, scale: 0.95 }}animate={{ opacity: 1, scale: 1 }}exit={{ opacity: 0, scale: 1.05 }}transition={{ duration: 0.2 }}
```

### Cambio lateral de pregunta

```
initial={{ opacity: 0, x: 20 }}animate={{ opacity: 1, x: 0 }}exit={{ opacity: 0, x: -20 }}transition={{ duration: 0.2 }}
```

### Feedback de error

```
animate={{ x: [0, -4, 4, -4, 4, 0] }}transition={{ duration: 0.4 }}
```

### Icono correcto

```
initial={{ opacity: 0, scale: 0.5, rotate: -45 }}animate={{ opacity: 1, scale: 1, rotate: 0 }}transition={{ type: "spring", stiffness: 260, damping: 18 }}
```

### Icono incorrecto

```
initial={{ opacity: 0, scale: 0.5, rotate: 45 }}animate={{ opacity: 1, scale: 1, rotate: 0 }}transition={{ type: "spring", stiffness: 260, damping: 18 }}
```

Reglas:

- Duración habitual: 150–300 ms.
- No bloquear interacción.
- No abusar de animaciones.
- Respetar `prefers-reduced-motion`.
- Animaciones rápidas, físicas y claras.

---

## 14. Barra de progreso

Modelo recomendado:

```
<div className="w-full h-2 bg-slate-100 absolute top-0 left-0 z-20">  <motion.div    className="h-full bg-brand-primary"    initial={{ width: 0 }}    animate={{ width: `${progress}%` }}    transition={{ duration: 0.5 }}  /></div>
```

Reglas:

- Barra fina.
- Situada arriba.
- Animación suave.
- Color primario.
- No debe quitar espacio útil a la pregunta.

---

## 15. Layout mobile-first

Reglas:

- Diseñar primero para móvil.
- Usar `p-4` o `p-5` en móvil.
- Usar `md:p-8`, `md:p-10` o `md:p-12` en escritorio.
- Evitar scroll innecesario durante el juego.
- Mantener botones de respuesta visibles.
- Header y bottom navigation pueden ser fijos si mejoran la orientación.
- La pantalla de juego debe priorizar:
  1. pregunta
  2. opciones
  3. feedback
  4. avance

Grid recomendado:

```
grid grid-cols-1 md:grid-cols-2 gap-4
```

Contenedor recomendado:

```
w-full max-w-4xl mx-auto
```

---

## 16. Navegación

### Header

Debe ser claro, compacto y con personalidad.

Recomendado:

```
<header className="sticky top-0 z-40 bg-brand-bg border-b-[3px] border-brand-border">
```

Elementos:

- Nombre de la app.
- Nivel o sección actual.
- Acción secundaria si procede.

### Bottom navigation

En móvil puede ser fija:

```
<nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-[3px] border-brand-border">
```

Reglas:

- Iconos claros.
- Estado activo muy visible.
- No tapar contenido.
- Añadir padding inferior al contenido si es fija.

---

## 17. Iconografía

Usar `lucide-react`.

Iconos recomendados:

```
ZapSparklesBookOpenCheckCircleXCircleRefreshCwSearchArrowRightCrownSkullStarTrophyBrainBarChart3HeartHomeSettings
```

Reglas:

- Iconos de tamaño 20–28 px.
- Iconos dentro de botones con `gap-3`.
- Iconos de feedback más grandes.
- No abusar de iconos decorativos.

---

## 18. Skeleton / carga

Clase:

```
.skeleton {  @apply bg-slate-100 rounded-none animate-pulse-subtle;}
```

Animación:

```
@theme {  --animate-pulse-subtle: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;  @keyframes pulse {    0%, 100% { opacity: 1; }    50% { opacity: 0.5; }  }}
```

---

## 19. Accesibilidad

Reglas obligatorias:

- Buen contraste entre texto y fondo.
- Botones con área táctil suficiente.
- Estados `focus-visible`.
- No depender solo del color para correcto/error.
- Usar iconos y texto en feedback.
- Respetar `prefers-reduced-motion`.
- Mantener lectura clara en contenidos largos.
- No usar mayúsculas en párrafos extensos.

Ejemplo:

```
@media (prefers-reduced-motion: reduce) {  * {    animation-duration: 0.001ms !important;    animation-iteration-count: 1 !important;    transition-duration: 0.001ms !important;    scroll-behavior: auto !important;  }}
```

---

## 20. Aplicación específica para una app avanzada de euskera

La app puede tener dos niveles visuales:

### Zona de juego

Usar neobrutalismo completo:

- tarjetas fuertes
- botones físicos
- sombras duras
- mayúsculas en acciones
- feedback visual intenso
- animaciones rápidas

### Zona editorial / lingüística

Usar versión más sobria:

- mantener borde y sombra
- reducir mayúsculas
- priorizar lectura
- textos largos en caja clara
- menor densidad visual
- explicaciones desplegables

Regla importante:

La estética no debe perjudicar la precisión lingüística ni la lectura experta del euskera.

---

## 21. Reglas de migración

No modificar:

- lógica de negocio
- Supabase
- servicios
- tipos
- rutas
- datos
- autenticación
- estadísticas
- sincronización de progreso

Sí modificar:

- estilos globales
- tokens visuales
- componentes base
- botones
- tarjetas
- layout
- navegación
- estados visuales
- animaciones
- responsive

Orden recomendado:

1. `src/index.css`
2. `tailwind.config` si existe
3. `Button`
4. `Card`
5. `PageLayout`
6. `Header`
7. `BottomNavigation`
8. `HomePage`
9. `GamePage`
10. `ResultPage`
11. `StatsPage`
12. `Gogokoak`
13. Resto de pantallas

---

## 22. CSS base recomendado

Este bloque puede añadirse o adaptarse en `src/index.css`.

```
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');@import "tailwindcss";@theme {  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;  --color-brand-primary: #3b82f6;  --color-brand-secondary: #f59e0b;  --color-brand-accent: #8b5cf6;  --color-brand-bg: #f8fafc;  --color-brand-text: #0f172a;  --color-brand-border: #0f172a;  --animate-pulse-subtle: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;  @keyframes pulse {    0%, 100% { opacity: 1; }    50% { opacity: 0.5; }  }}body {  @apply antialiased bg-brand-bg text-brand-text;}.sleek-card {  @apply bg-white rounded-none border-[3px] border-brand-border shadow-[8px_8px_0px_0px_#0f172a];}.sleek-card-interactive {  @apply bg-white rounded-none border-[3px] border-brand-border shadow-[10px_10px_0px_0px_#1e293b];  @apply cursor-pointer transition-all duration-200 hover:shadow-[4px_4px_0px_0px_#1e293b] hover:translate-x-[6px] hover:translate-y-[6px] active:scale-[0.98];}.sleek-btn-primary {  @apply px-6 py-3 md:px-10 md:py-4 bg-brand-primary text-white rounded-none font-black uppercase tracking-widest border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] active:scale-95 flex items-center justify-center gap-3;}.sleek-btn-secondary {  @apply px-6 py-3 md:px-10 md:py-4 bg-white text-slate-800 rounded-none font-black uppercase tracking-widest border-[3px] border-brand-border shadow-[6px_6px_0px_0px_#0f172a] transition-all duration-200 hover:shadow-[2px_2px_0px_0px_#0f172a] hover:translate-x-[4px] hover:translate-y-[4px] active:scale-95 flex items-center justify-center gap-3;}.sleek-btn-option {  @apply p-4 md:p-6 rounded-none border-[3px] border-brand-border text-center font-black uppercase tracking-tight transition-all duration-200 disabled:pointer-events-none;}.skeleton {  @apply bg-slate-100 rounded-none animate-pulse-subtle;}@media (prefers-reduced-motion: reduce) {  * {    animation-duration: 0.001ms !important;    animation-iteration-count: 1 !important;    transition-duration: 0.001ms !important;    scroll-behavior: auto !important;  }}
```

---

# 
