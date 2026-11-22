import Link from "next/link";
import { formatMoney } from "@/lib/api";

export default function BookCard({ libro }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/libros/${libro._id}`} className="block aspect-[3/4] overflow-hidden bg-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={libro.imagen}
          alt={libro.titulo}
          className="h-full w-full object-cover transition hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-[#b4533a]">{libro.categoria}</p>
        <Link href={`/libros/${libro._id}`}>
          <h2 className="font-serif text-lg font-bold leading-snug text-stone-900">
            {libro.titulo}
          </h2>
        </Link>
        <p className="text-sm text-stone-600">{libro.autor}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold">{formatMoney(libro.precio)}</span>
          <span className="text-xs text-stone-500">Stock: {libro.stock}</span>
        </div>
      </div>
    </article>
  );
}
