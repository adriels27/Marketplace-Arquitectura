-- Los pedidos creados antes del flujo de revisión del vendedor se reinician.
-- Así no conservan una aprobación automática de la demostración anterior.
update public.orders
set status = 'pending_transfer',
    proof_path = null,
    verified_at = null,
    verification_note = 'Pedido reiniciado para la revisión manual del vendedor.'
where status = 'verified_demo';
