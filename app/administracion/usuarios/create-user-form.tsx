"use client";

import { useState } from "react";
import { createAdminUser } from "./actions";

export function CreateUserForm() {
  const [role, setRole] = useState("user");

  return (
    <form action={createAdminUser}>
      <label>Nombre completo<input autoComplete="name" maxLength={120} minLength={2} name="fullName" required /></label>
      <label>Correo electrónico<input autoComplete="email" name="email" required type="email" /></label>
      <label>Fecha de nacimiento<input autoComplete="bday" name="birthDate" required type="date" /></label>
      <label>Rol
        <select name="role" required value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Usuario</option>
          <option value="moderator">Moderador</option>
        </select>
      </label>
      <label>
        {role === "user" ? "Contraseña temporal" : "Clave"}
        <input autoComplete="new-password" minLength={8} name="password" required type="password" />
      </label>
      <button className="button" type="submit">Crear cuenta</button>
    </form>
  );
}
