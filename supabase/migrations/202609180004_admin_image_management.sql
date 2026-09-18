-- Permite a los administradores eliminar archivos de fotos al editar cualquier publicación.
create policy "Administrators can delete any product photo"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select public.is_admin())
);
