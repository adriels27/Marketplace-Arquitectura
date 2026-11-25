import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { fromDatabaseProduct, type DatabaseProduct } from "@/lib/listings";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

const categories = ["Hogar", "Tecnología", "Moda", "Deportes", "Libros", "Otros"];

const pageSize = 12;

function catalogHref(q: string, category: string, page = 1) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("categoria", category);
  if (page > 1) params.set("pagina", String(page));
  return `/${params.size ? `?${params}` : ""}#explorar`;
}

async function getPublishedProducts(q: string, category: string, page: number) {
  try {
    const supabase = await createClient();
    const offset = (page - 1) * pageSize;
    let query = supabase
      .from("products")
      .select("id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position)")
      .eq("status", "published")
      .or(`moderation_status.eq.active,and(moderation_status.eq.suspended,suspended_until.lte.${new Date().toISOString()})`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize);

    if (category) query = query.eq("category", category);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data, error } = await query;
    if (error) return null;

    return {
      products: ((data ?? []) as DatabaseProduct[]).slice(0, pageSize).map(fromDatabaseProduct),
      hasMore: (data?.length ?? 0) > pageSize,
    };
  } catch {
    return null;
  }
}

export default async function Home({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; categoria?: string | string[]; pagina?: string | string[] }>;
}) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    await redirectSuperadminFromMarketplace(await createClient());
  }
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const category = typeof params.categoria === "string" && categories.includes(params.categoria) ? params.categoria : "";
  const requestedPage = typeof params.pagina === "string" ? Number(params.pagina) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100_000 ? requestedPage : 1;
  const catalog = await getPublishedProducts(search, category, page);
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero">
          <div>
            <p className="eyebrow">Compra y vende con confianza</p>
            <h1>Encuentra algo que merece una segunda oportunidad.</h1>
            <p className="hero-copy">Descubre productos cerca de ti o publica aquello que ya no usas.</p>
            <form className="search-box" action="/#explorar" method="get">
              <label className="sr-only" htmlFor="search">¿Qué estás buscando?</label>
              <input aria-label="Buscar productos" defaultValue={search} id="search" maxLength={120} name="q" placeholder="¿Qué estás buscando?" type="search" />
              {category && <input name="categoria" type="hidden" value={category} />}
              <button className="button" type="submit">Buscar</button>
            </form>
          </div>
          <aside className="hero-note">
            <span className="note-icon">↗</span>
            <p>Publica gratis</p>
            <strong>Vende aquello que ya no necesitas.</strong>
            <Link href="/acceder">Crear una publicación <span>→</span></Link>
          </aside>
        </section>

        <section className="categories" aria-label="Categorías">
          {categories.map((selected) => <Link aria-current={category === selected ? "true" : undefined} href={catalogHref(search, selected)} key={selected}>{selected}</Link>)}
        </section>

        <section className="catalog-section" id="explorar">
          <div className="section-heading">
            <div><p className="eyebrow">Recién publicados</p><h2>Explora productos</h2></div>
            {(search || category) && <Link className="text-link" href={catalogHref("", "")}>Ver todo</Link>}
          </div>
          {!catalog && <p role="status">El catálogo no está disponible en este momento. Inténtalo más tarde.</p>}
          {catalog?.products.length === 0 && <p>No se encontraron publicaciones.</p>}
          <div className="product-grid">
            {catalog?.products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {(page > 1 || catalog?.hasMore) && <nav className="section-heading" aria-label="Páginas del catálogo">
            {page > 1 && <Link className="text-link" href={catalogHref(search, category, page - 1)}>Anterior</Link>}
            {catalog?.hasMore && <Link className="text-link" href={catalogHref(search, category, page + 1)}>Siguiente</Link>}
          </nav>}
        </section>

        <section className="how-it-works">
          <div><p className="eyebrow">Simple y seguro</p><h2>Así funciona Marketplace Arqui</h2></div>
          <ol>
            <li><span>01</span><strong>Encuentra o publica</strong><p>Busca lo que necesitas o crea tu anuncio en minutos.</p></li>
            <li><span>02</span><strong>Coordina la compra</strong><p>Habla directamente con la otra persona desde la plataforma.</p></li>
            <li><span>03</span><strong>Confirma tu pago</strong><p>Sube tu comprobante y recibe la validación de tu pago.</p></li>
          </ol>
        </section>
      </main>
    </>
  );
}
