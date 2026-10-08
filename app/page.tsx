import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { products as sampleProducts } from "@/lib/catalog";
import { fromDatabaseProduct, fromSampleProduct, type DatabaseProduct } from "@/lib/listings";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

const categories = ["Hogar", "Tecnología", "Moda", "Deportes", "Libros", "Otros"];

async function getPublishedProducts() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position)")
      .eq("status", "published")
      // Un moderador puede leer todos los registros por sus permisos. Este filtro
      // evita que una publicación retirada aparezca también en el catálogo público.
      .or(`moderation_status.eq.active,and(moderation_status.eq.suspended,suspended_until.lte.${new Date().toISOString()})`)
      .order("created_at", { ascending: false })
      .limit(12);

    if (!error && data?.length) return (data as DatabaseProduct[]).map(fromDatabaseProduct);
  } catch {
    // Mientras se configura Supabase se conserva el catálogo de demostración.
  }
  return sampleProducts.map(fromSampleProduct);
}

export default async function Home() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    await redirectSuperadminFromMarketplace(await createClient());
  }
  const products = await getPublishedProducts();
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
              <input aria-label="Buscar productos" id="search" name="q" placeholder="¿Qué estás buscando?" type="search" />
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
          {categories.map((category) => <a href="#explorar" key={category}>{category}</a>)}
        </section>

        <section className="catalog-section" id="explorar">
          <div className="section-heading">
            <div><p className="eyebrow">Recién publicados</p><h2>Explora productos</h2></div>
            <a className="text-link" href="#explorar">Ver todo <span>→</span></a>
          </div>
          <div className="product-grid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
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
      <footer>Marketplace Arqui <span>·</span> Compra y venta entre personas</footer>
    </>
  );
}
