"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { setSupabaseUserEnabled } from "@/lib/supabase/user-status";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: { message: string } | null };

function failure(message: string): ActionResult {
  return { error: { message } };
}

export async function deleteModeratedProduct(productId: string, reason: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) return failure(claimsError.message);
  const moderatorId = claimsData?.claims?.sub;
  if (!moderatorId) return failure("Debes iniciar sesión.");

  const { data: moderator, error: moderatorError } = await supabase
    .from("profiles")
    .select("role, deleted_at, disabled_at")
    .eq("id", moderatorId)
    .maybeSingle();
  if (moderatorError) return failure(moderatorError.message);
  if (!moderator || !["admin", "moderator"].includes(moderator.role) || moderator.deleted_at || moderator.disabled_at) {
    return failure("No tienes permiso para moderar publicaciones.");
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", productId)
    .maybeSingle();
  if (productError) return failure(productError.message);
  if (!product) return failure("No se encontró la publicación.");

  const { data: strikeNumber, error: moderationError } = await supabase.rpc("moderate_product_action", {
    p_product_id: productId,
    p_action: "delete",
    p_reason: reason.trim(),
  });
  if (moderationError) return failure(moderationError.message);

  if (strikeNumber >= 3) {
    const admin = createAdminClient();
    const banError = await setSupabaseUserEnabled(admin, product.seller_id, false);
    if (banError) return failure(`La publicación se eliminó y se registró el tercer strike, pero no se pudo completar el baneo de Auth: ${banError}`);
  }

  return { error: null };
}
