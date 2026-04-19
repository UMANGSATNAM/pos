import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

type ProductForm = {
  name: string; sku: string; price: string; costPrice: string;
  stock: string; categoryId: string; unit: string; barcode: string;
};

const emptyForm: ProductForm = {
  name: "", sku: "", price: "", costPrice: "", stock: "",
  categoryId: "", unit: "piece", barcode: "",
};

export function Inventory() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<Id<"products"> | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [stockAdjust, setStockAdjust] = useState<{ id: Id<"products">; name: string; delta: string } | null>(null);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const barcodeFieldRef = useRef<HTMLInputElement>(null);

  const products = useQuery(api.products.list, {}) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const adjustStock = useMutation(api.products.adjustStock);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setForm(emptyForm); setEditId(null); setScanningBarcode(false); setShowForm(true);
  }

  function openEdit(product: (typeof products)[0]) {
    setForm({
      name: product.name, sku: product.sku, price: String(product.price),
      costPrice: String(product.costPrice), stock: String(product.stock),
      categoryId: product.categoryId ?? "", unit: product.unit, barcode: product.barcode ?? "",
    });
    setEditId(product._id); setScanningBarcode(false); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name, sku: form.sku, price: parseFloat(form.price),
      costPrice: parseFloat(form.costPrice), stock: parseInt(form.stock),
      categoryId: form.categoryId ? (form.categoryId as Id<"categories">) : undefined,
      unit: form.unit, barcode: form.barcode || undefined,
    };
    try {
      if (editId) {
        await updateProduct({ id: editId, ...data, isActive: true });
        toast.success("Product updated");
      } else {
        await createProduct(data);
        toast.success("Product created");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save product");
    }
  }

  async function handleAdjustStock() {
    if (!stockAdjust) return;
    const delta = parseInt(stockAdjust.delta);
    if (isNaN(delta)) { toast.error("Invalid amount"); return; }
    await adjustStock({ id: stockAdjust.id, delta });
    toast.success("Stock adjusted");
    setStockAdjust(null);
  }

  return (
    <div className="p-3 md:p-6 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row gap-2 mb-3 items-start sm:items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">📦 Inventory</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, barcode..."
            className="flex-1 sm:w-56 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <button onClick={openCreate}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap active:scale-95">
            + Add
          </button>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {filtered.map((product) => (
          <div key={product._id} className="bg-white rounded-xl border p-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 text-sm">{product.name}</p>
                  {product.category && (
                    <span className="px-1.5 py-0.5 rounded-full text-white text-xs"
                      style={{ backgroundColor: product.category.color }}>
                      {product.category.name}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Cost</p>
                  <p className="font-medium text-gray-700">₹{product.costPrice.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Price</p>
                  <p className="font-bold text-indigo-600">₹{product.price.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Stock</p>
                  <p className={`font-semibold ${product.stock === 0 ? "text-red-600" : product.stock < 10 ? "text-yellow-600" : "text-green-600"}`}>
                    {product.stock} {product.unit}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setStockAdjust({ id: product._id, name: product.name, delta: "" })}
                  className="px-2.5 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg active:scale-95">±</button>
                <button onClick={() => openEdit(product)}
                  className="px-2.5 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg active:scale-95">Edit</button>
                <button onClick={async () => { await removeProduct({ id: product._id }); toast.success("Deactivated"); }}
                  className="px-2.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg active:scale-95">Del</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">No products found</p>
          </div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Product</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Category</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Cost</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Price</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Stock</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Status</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{product.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku}</td>
                  <td className="px-4 py-3">
                    {product.category ? (
                      <span className="px-2 py-0.5 rounded-full text-white text-xs"
                        style={{ backgroundColor: product.category.color }}>{product.category.name}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">₹{product.costPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">₹{product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${product.stock === 0 ? "text-red-600" : product.stock < 10 ? "text-yellow-600" : "text-green-600"}`}>
                      {product.stock} {product.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setStockAdjust({ id: product._id, name: product.name, delta: "" })}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">±</button>
                      <button onClick={() => openEdit(product)}
                        className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">Edit</button>
                      <button onClick={async () => { await removeProduct({ id: product._id }); toast.success("Deactivated"); }}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-4 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800">{editId ? "Edit Product" : "Add Product"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Product Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">SKU *</label>
                  <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Barcode
                    <button type="button" onClick={() => { setScanningBarcode((v) => !v); setTimeout(() => barcodeFieldRef.current?.focus(), 50); }}
                      className={`ml-2 px-1.5 py-0.5 rounded text-xs border ${scanningBarcode ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-100 text-gray-600 border-gray-300"}`}>
                      📷 {scanningBarcode ? "Scanning..." : "Scan"}
                    </button>
                  </label>
                  <input ref={barcodeFieldRef} value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter" && scanningBarcode) { e.preventDefault(); setScanningBarcode(false); toast.success("Barcode: " + form.barcode); } }}
                    placeholder={scanningBarcode ? "🔴 Scan now..." : "Optional"}
                    className={`w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none font-mono ${scanningBarcode ? "border-indigo-400 ring-2 ring-indigo-300 bg-indigo-50 animate-pulse" : "focus:ring-2 focus:ring-indigo-300"}`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Cost Price (₹) *</label>
                  <input required type="text" inputMode="decimal" value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Selling Price (₹) *</label>
                  <input required type="text" inputMode="decimal" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Stock *</label>
                  <input required type="text" inputMode="numeric" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Unit *</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {["piece", "kg", "g", "liter", "ml", "pack", "box", "can", "bottle", "carton", "loaf", "cup", "tube"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Category</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">No Category</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:scale-95">
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {stockAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-gray-800 mb-1">Adjust Stock</h3>
            <p className="text-xs text-gray-500 mb-3">{stockAdjust.name}</p>
            <p className="text-xs text-gray-500 mb-2">Positive to add, negative to remove.</p>
            <input type="text" inputMode="numeric" value={stockAdjust.delta}
              onChange={(e) => setStockAdjust({ ...stockAdjust, delta: e.target.value })}
              placeholder="e.g. +50 or -10"
              className="w-full px-3 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3 text-center text-lg font-bold" />
            <div className="flex gap-2">
              <button onClick={() => setStockAdjust(null)}
                className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdjustStock}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:scale-95">Adjust</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
