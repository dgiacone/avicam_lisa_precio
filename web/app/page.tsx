"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setError(null); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("archivo", file);
      const res = await fetch("/api/generar", { method: "POST", body: form });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error desconocido");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Lista_de_Precios_Carnes_Premium.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setGenerated(true);
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="inline-block px-4 py-1 rounded-full text-white text-xs font-semibold mb-4"
            style={{ backgroundColor: "#8B1A1A" }}
          >
            CARNES PREMIUM
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Generador de Lista de Precios</h1>
          <p className="text-gray-500 text-sm mt-1">
            Subí tu XLSX y descargá el PDF listo para compartir
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-red-400 hover:bg-red-50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleChange}
          />
          {file ? (
            <>
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024).toFixed(0)} KB · Clic para cambiar
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">📂</div>
              <p className="font-semibold text-gray-600">Arrastrá tu XLSX aquí</p>
              <p className="text-xs text-gray-400 mt-1">o hacé clic para buscar el archivo</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ backgroundColor: "#8B1A1A" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generando PDF...
            </span>
          ) : (
            "Generar y Descargar PDF"
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          El PDF incluye portada, índice y lista completa de precios
        </p>

        {generated && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center text-sm">
            <span className="text-green-700">PDF generado. </span>
            <Link
              href="/lista"
              className="font-semibold underline"
              style={{ color: "#8B1A1A" }}
            >
              Ver lista como HTML →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
