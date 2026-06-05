# TS Sports — Web + CRM

Sitio web de una sola página para **TS Sports** (agencia de marketing y consultoría
deportiva), con un **panel de administración** para cambiar colores, fotos, textos,
servicios, proyectos y aliados **sin tocar código**.

---

## 📁 Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página pública. |
| `admin.html` | El panel de administración (CRM). Ábrelo en `tudominio.com/admin.html`. |
| `styles.css` / `admin.css` | Diseño del sitio y del panel. |
| `script.js` / `render.js` | Lógica del sitio público. |
| `admin.js` | Lógica del panel. |
| `content-defaults.js` | Contenido por defecto (lo que se ve antes de editar nada). |
| `store.js` | Conexión con la base de datos (Supabase) o con el navegador. |
| `config.js` | **Aquí pegas tus claves de Supabase.** |
| `supabase-setup.sql` | Script para preparar tu base de datos. |

---

## 🚀 Probarlo ahora (sin configurar nada)

1. Abre `index.html` con doble clic → ves la web.
2. Abre `admin.html` → entra con cualquier email/contraseña (modo prueba).
3. Cambia cosas y pulsa **Guardar**. Los cambios se guardan **solo en tu navegador**
   (sirve para probar; todavía no se comparten con los visitantes).

---

## 🌐 Activar el CRM real (que todos vean los cambios)

Necesitas una cuenta gratis de **Supabase**. Toma ~5 minutos.

### Paso 1 — Crear el proyecto
1. Entra a <https://supabase.com> → **Start your project** → crea una cuenta.
2. **New project**. Ponle un nombre y una contraseña de base de datos (guárdala).
3. Espera ~1 min a que se cree.

### Paso 2 — Preparar la base de datos
1. En el menú lateral: **SQL Editor** → **New query**.
2. Abre el archivo `supabase-setup.sql`, **copia todo** y pégalo.
3. Pulsa **Run**. Debe decir *Success*.

### Paso 3 — Crear tu usuario admin
1. Menú lateral: **Authentication** → **Users** → **Add user** → **Create new user**.
2. Escribe tu email y una contraseña. (Marca *Auto Confirm User* si aparece.)
3. Ese será el usuario para entrar al panel.

### Paso 4 — Conectar la web con Supabase
1. Menú lateral: **Project Settings** → **API**.
2. Copia **Project URL** y la clave **anon public**.
3. Abre `config.js` y pégalas:
   ```js
   window.TS_SUPABASE = {
     url: "https://TU-PROYECTO.supabase.co",
     anonKey: "eyJhbGciOi..."
   };
   ```
4. ¡Listo! Ahora el panel guarda en la nube y **todos los visitantes ven los cambios**.

> En el login del panel verás “● CRM en la nube” cuando esté bien conectado.

---

## ☁️ Publicar la web (gratis)

Es un sitio estático, así que cualquiera de estos sirve. La forma más fácil:

**Netlify (arrastrar y soltar):**
1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta completa `tssports`.
3. Te da una URL pública al instante. El panel quedará en `…/admin.html`.

(También funcionan **Vercel** o **GitHub Pages**.)

> Recomendación: comparte solo la URL principal. El panel (`/admin.html`) está
> protegido con login, pero es buena idea no difundir el enlace.

---

## ✏️ Cómo editar el contenido (día a día)

1. Entra a `tudominio.com/admin.html`.
2. Inicia sesión con tu email y contraseña.
3. Usa las pestañas: **Colores, Imágenes, Textos, Servicios, Proyectos, Aliados, Contacto**.
4. Pulsa **Guardar cambios**.
5. Abre la web (botón **Ver sitio**) y recarga para ver el resultado.

---

## ❓ Dudas frecuentes

- **¿Pierdo los cambios si no configuro Supabase?** En modo prueba se guardan en tu
  navegador; si limpias el navegador o usas otro equipo, no estarán. Con Supabase
  quedan guardados para siempre y en todos lados.
- **¿Puedo cambiar el logo “TS”?** Sí, dímelo y lo cambio por tu logo en imagen.
- **¿El formulario de contacto envía correos?** Aún no; muestra un mensaje de
  confirmación. Se conecta fácil con Formspree o EmailJS si lo necesitas.
