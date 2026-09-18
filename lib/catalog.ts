export type Product = {
  slug: string;
  name: string;
  price: string;
  category: string;
  location: string;
  seller: string;
  condition: string;
  icon: string;
  tone: string;
  description: string;
};

export const products: Product[] = [
  {
    slug: "lampara-de-mesa-nordica",
    name: "Lámpara de mesa nórdica",
    price: "$28,00",
    category: "Hogar",
    location: "Quito",
    seller: "María L.",
    condition: "Como nuevo",
    icon: "◒",
    tone: "sun",
    description: "Lámpara de cerámica en excelente estado. Ideal para sala, dormitorio o espacio de trabajo.",
  },
  {
    slug: "camara-instantanea-mini",
    name: "Cámara instantánea mini",
    price: "$74,00",
    category: "Tecnología",
    location: "Guayaquil",
    seller: "Diego P.",
    condition: "Usado · buen estado",
    icon: "▣",
    tone: "lilac",
    description: "Cámara instantánea lista para usar, incluye estuche y dos paquetes de película.",
  },
  {
    slug: "silla-de-madera-artesanal",
    name: "Silla de madera artesanal",
    price: "$45,00",
    category: "Hogar",
    location: "Cuenca",
    seller: "Taller Arrayán",
    condition: "Como nuevo",
    icon: "⌑",
    tone: "coral",
    description: "Pieza artesanal de madera tratada, firme y cómoda. Se vende por renovación de espacio.",
  },
  {
    slug: "casco-urbano-verde",
    name: "Casco urbano verde",
    price: "$32,00",
    category: "Deportes",
    location: "Ambato",
    seller: "Sofía R.",
    condition: "Nuevo",
    icon: "◓",
    tone: "mint",
    description: "Casco urbano de talla M, sin uso y con etiquetas. Incluye bolsa de tela.",
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
