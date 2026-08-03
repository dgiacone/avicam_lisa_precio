import { loadLatestList } from "@/lib/store";
import type { PriceList, Category, Subcategory, Item } from "@/lib/parseXlsx";
import Link from "next/link";

export const dynamic = "force-dynamic";

const C_RED = "#8B1A1A";
const C_BLUE = "#2C4A6B";

export default function ListaPage() {
  const data = loadLatestList();

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-3">No hay lista disponible.</p>
          <Link href="/" className="font-semibold underline" style={{ color: C_RED }}>
            Generá una primero
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="py-10 px-6 text-white text-center" style={{ backgroundColor: C_RED }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-80">
          Carnes Premium
        </p>
        <h1 className="text-3xl font-bold">Lista de Precios</h1>
        <p className="text-sm mt-2 opacity-80">Vigente desde el {data.date}</p>
        <p className="text-xs mt-1 opacity-60">
          Todos los precios incluyen IVA · Sujetos a modificación sin previo aviso
        </p>
      </div>

      {/* Index */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold mb-4" style={{ color: C_BLUE }}>
            Índice de Categorías
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.categories.map((cat) => (
              <a key={cat.name} href={`#${slugify(cat.name)}`} className="block group">
                <span className="font-semibold text-sm group-hover:underline" style={{ color: C_RED }}>
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  {cat.subcategories.map((s) => s.name).join(" · ")}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Categories */}
        {data.categories.map((cat) => (
          <CategorySection key={cat.name} cat={cat} />
        ))}
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-xs text-gray-400 border-t border-gray-200">
        Emitido: {data.date} &nbsp;·&nbsp; Precios sujetos a modificación sin previo aviso
        &nbsp;·&nbsp;{" "}
        <Link href="/" className="underline hover:text-gray-600">
          Actualizar lista
        </Link>
      </div>
    </main>
  );
}

function CategorySection({ cat }: { cat: Category }) {
  return (
    <section id={slugify(cat.name)} className="mb-10 scroll-mt-4">
      {/* Category header */}
      <div
        className="rounded-xl px-6 py-4 mb-4 text-white"
        style={{ backgroundColor: C_RED }}
      >
        <h2 className="text-xl font-bold">{cat.name}</h2>
        <p className="text-xs mt-1 opacity-75">
          {cat.subcategories.map((s) => s.name).join("  ·  ")}
        </p>
      </div>

      {cat.subcategories.map((sub) => (
        <SubcategoryTable key={sub.name} sub={sub} />
      ))}
    </section>
  );
}

function SubcategoryTable({ sub }: { sub: Subcategory }) {
  return (
    <div className="mb-4 rounded-lg overflow-hidden shadow-sm border border-gray-100">
      {/* Subcategory header */}
      <div
        className="px-4 py-2 text-white text-sm font-semibold"
        style={{ backgroundColor: C_BLUE }}
      >
        {sub.name}
      </div>

      {/* Column headers */}
      <div
        className="grid text-white text-xs font-semibold px-4 py-1"
        style={{ backgroundColor: C_BLUE, gridTemplateColumns: "80px 1fr 110px 90px", opacity: 0.9 }}
      >
        <span>Código</span>
        <span>Producto</span>
        <span className="text-right">Precio</span>
        <span className="pl-3">Presentación</span>
      </div>

      {/* Rows */}
      <div className="bg-white divide-y divide-gray-100">
        {sub.items.map((item, i) => (
          <ItemRow key={`${item.code}-${i}`} item={item} odd={i % 2 === 1} />
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, odd }: { item: Item; odd: boolean }) {
  return (
    <div
      className="grid items-center px-4 py-1.5 text-sm"
      style={{
        gridTemplateColumns: "80px 1fr 110px 90px",
        backgroundColor: odd ? "#F9F9F9" : "#FFFFFF",
      }}
    >
      <span className="text-gray-400 text-xs">{item.code}</span>
      <span className="text-gray-700 truncate pr-2">{item.name}</span>
      {item.isConsultar ? (
        <span className="text-right text-xs italic font-medium" style={{ color: "#B87333" }}>
          Consultar
        </span>
      ) : (
        <span className="text-right font-semibold text-gray-800 text-xs">{item.price}</span>
      )}
      <span className="pl-3 text-gray-400 text-xs">{item.unit}</span>
    </div>
  );
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
