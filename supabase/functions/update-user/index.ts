// =====================================================================
//  TS SPORTS — Edge Function: editar un usuario
//
//  Sirve para dos cosas:
//    · Un ADMIN edita a cualquier usuario (nombre, correo, rol, zona,
//      contraseña).
//    · Cualquier usuario edita SUS PROPIOS datos (nombre, correo,
//      contraseña) desde la página de perfil. No puede cambiarse el rol
//      ni la zona a sí mismo (eso sería escalar privilegios).
//
//  Cambia el correo de LOGIN, cosa que no se puede hacer desde el
//  navegador con la llave pública: requiere la service_role, que vive
//  solo aquí en el servidor.
//
//  Supabase inyecta SUPABASE_URL, SUPABASE_ANON_KEY y
//  SUPABASE_SERVICE_ROLE_KEY automáticamente: no hay que configurar nada.
//
//  Desplegar:
//    supabase link --project-ref itlfmmvanjqeimxrzipo
//    supabase functions deploy update-user
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Devolvemos 200 con { ok } o { error } para que el cliente lo lea fácil.
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1) ¿Quién llama? (con su propio token de sesión)
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: "No autenticado." }, 401);

    // 2) Cliente con service_role para el resto (salta RLS)
    const admin = createClient(url, service);

    // 3) Rol del que llama
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = !!me && me.role === "admin";

    // 4) Qué cambiar y sobre quién
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) return json({ error: "Falta el id del usuario." }, 400);

    const isSelf = id === user.id;
    // Solo el admin edita a otros; cualquiera puede editarse a sí mismo.
    if (!isAdmin && !isSelf) return json({ error: "No puedes editar a otro usuario." }, 403);

    const email = body.email != null ? String(body.email).trim().toLowerCase() : undefined;
    const name = body.name != null ? String(body.name).trim() : undefined;
    const password = body.password ? String(body.password) : undefined;
    // Rol y zona SOLO los toca un admin (evita que alguien se auto-promueva)
    const role = isAdmin && body.role != null ? String(body.role) : undefined;
    const zona = isAdmin && body.zona != null ? String(body.zona) : undefined;

    if (role && !["admin", "comercial", "vendedor"].includes(role))
      return json({ error: "Rol inválido." }, 400);
    if (password && password.length < 6)
      return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return json({ error: "El correo no tiene un formato válido." }, 400);

    // 5) Cambios en Auth (correo de login / contraseña)
    const authPatch: Record<string, unknown> = {};
    if (email) { authPatch.email = email; authPatch.email_confirm = true; } // queda confirmado al instante
    if (password) authPatch.password = password;
    if (Object.keys(authPatch).length) {
      const { error } = await admin.auth.admin.updateUserById(id, authPatch);
      if (error) return json({ error: "No se pudo actualizar el acceso: " + error.message }, 200);
    }

    // 6) Cambios en el perfil (nombre / correo mostrado / rol / zona)
    const profPatch: Record<string, unknown> = {};
    if (email !== undefined) profPatch.email = email;
    if (name !== undefined) profPatch.name = name;
    if (role !== undefined) profPatch.role = role;
    if (zona !== undefined) profPatch.zona = zona;
    if (Object.keys(profPatch).length) {
      const { error } = await admin.from("profiles").update(profPatch).eq("id", id);
      if (error) return json({ error: "No se pudo actualizar el perfil: " + error.message }, 200);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 200);
  }
});
