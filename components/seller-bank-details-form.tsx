"use client";

import { type FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BankDetails = { bank_name: string; account_number: string; account_email: string; national_id: string };

export function SellerBankDetailsForm() {
  const [details, setDetails] = useState<BankDetails | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadDetails() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data, error } = await supabase.from("seller_bank_details").select("bank_name, account_number, account_email, national_id").eq("seller_id", userData.user.id).maybeSingle();
      if (error) setMessage(error.message); else setDetails(data);
      setLoading(false);
    }
    void loadDetails();
  }, []);
  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const form = new FormData(event.currentTarget); const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) { setMessage("Tu sesión expiró. Ingresa nuevamente."); setLoading(false); return; }
    const values = { seller_id: userData.user.id, bank_name: String(form.get("bankName")).trim(), account_number: String(form.get("accountNumber")).trim(), account_email: String(form.get("accountEmail")).trim(), national_id: String(form.get("nationalId")).trim() };
    const { error } = await supabase.from("seller_bank_details").upsert(values);
    setMessage(error ? error.message : "Datos bancarios guardados. Los compradores solo los verán cuando inicien un pedido contigo.");
    if (!error) setDetails(values);
    setLoading(false);
  }
  return <form className="publish-form" onSubmit={saveDetails}><label>Banco<input defaultValue={details?.bank_name ?? "Banco Pichincha"} disabled={loading && !details} maxLength={80} minLength={2} name="bankName" required /></label><label>Número de cuenta<input defaultValue={details?.account_number ?? ""} disabled={loading && !details} inputMode="numeric" maxLength={40} minLength={4} name="accountNumber" placeholder="Ej.: 2200..." required /></label><label>Correo asociado a la cuenta<input defaultValue={details?.account_email ?? ""} disabled={loading && !details} name="accountEmail" type="email" placeholder="tu@correo.com" required /></label><label>Cédula del titular<input defaultValue={details?.national_id ?? ""} disabled={loading && !details} inputMode="numeric" maxLength={30} minLength={6} name="nationalId" placeholder="Ej.: 1712345678" required /></label><p className="form-help">Estos datos se guardan de forma privada y solo se muestran al comprador que genere un pedido de uno de tus productos.</p><button className="button" disabled={loading} type="submit">{loading ? "Cargando..." : "Guardar datos bancarios"}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
