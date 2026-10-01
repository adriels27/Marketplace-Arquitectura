"use client";

import type { FormEvent } from "react";
import { deleteAdminUser, setAdminUserEnabled } from "@/app/administracion/usuarios/actions";

export function AdminUserActions({ userId, email, enabled, isCurrentUser }: { userId: string; email: string; enabled: boolean; isCurrentUser: boolean }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`¿Eliminar permanentemente la cuenta ${email}?`)) event.preventDefault();
  }

  return (
    <div className="admin-user-actions">
      <form action={setAdminUserEnabled}>
        <input name="userId" type="hidden" value={userId} />
        <input name="enabled" type="hidden" value={String(!enabled)} />
        <button className="text-button" disabled={isCurrentUser} type="submit">{enabled ? "Deshabilitar" : "Habilitar"}</button>
      </form>
      <form action={deleteAdminUser} onSubmit={confirmDelete}>
        <input name="userId" type="hidden" value={userId} />
        <button className="reject-button" disabled={isCurrentUser} type="submit">Eliminar</button>
      </form>
    </div>
  );
}