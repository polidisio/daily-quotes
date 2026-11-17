# daily-quotes

Una cita nueva cada día con estética de Windows 98. Sitio estático desplegado en Vercel, sin backend.

## Estructura

```
index.html          Maquetación (ventana WordPad, iconos, menú Inicio, barra de tareas)
css/style.css       Estilos retro (variables CSS para el bisel y los colores)
js/app.js           Cita del día, navegación por días, idioma, copiar
js/desktop.js       Gestor de ventanas (mover, foco, minimizar, maximizar, cerrar), menús, diálogos
js/apps.js          Ventanas: Mis documentos (recientes/favoritas), Buscar, Propiedades, Papelera
js/games.js         Interfaz de Calculadora y Buscaminas
js/favorites.js     Favoritas y papelera (localStorage)
js/i18n.js          Textos es/en
lib/quotes.js       58 citas bilingües. Añade nuevas AL FINAL del array
lib/daily.js        Fechas y rotación con semilla (testeable, sin DOM)
lib/calc.js         Máquina de estados de la calculadora
lib/minesweeper.js  Lógica del Buscaminas
test/               Tests con node:test
```

## Cómo se elige la cita

Rotación con semilla en `lib/daily.js`:

- El tiempo se divide en ciclos de N días (N = nº de citas). Cada ciclo usa un orden distinto, barajado con la semilla y el número de ciclo.
- Todas las citas salen una vez por ciclo y nunca se repite la misma dos días seguidos.
- Es determinista: misma fecha y semilla dan la misma cita para todos los visitantes. Se usa la fecha local.
- El color de la nota también cambia cada día (8 colores de la paleta clásica).
- `?seed=loquesea` en la URL da una secuencia propia. La semilla por defecto es `DEFAULT_SEED`.

Ojo: al añadir citas cambia N y, por tanto, toda la secuencia futura.

## Desarrollo local

```bash
npm run dev     # http://localhost:3000 (los módulos ES no cargan desde file://)
npm test
```

## Interacción

- Flechas izquierda/derecha: día anterior/siguiente (con WordPad enfocado). Ver: Hoy, idioma.
- Editar > Añadir a favoritas (o botón F de la barra): guarda la cita. Se ven en Mis documentos > Favoritas.
- Quitar una favorita (botón Eliminar o tecla Supr) la envía a la Papelera; desde allí se puede restaurar o vaciar con confirmación.
- Las favoritas se guardan en el navegador (localStorage) por índice de cita, por eso las citas nuevas se añaden siempre al final.
- Doble clic en iconos: Mis documentos, Buscar citas (próxima fecha de cada cita), Mi PC (propiedades), Papelera.
- Menú Inicio: además, Calculadora (con teclado) y Buscaminas 9x9 (clic derecho o tecla F para bandera; botón Modo bandera en táctil).
