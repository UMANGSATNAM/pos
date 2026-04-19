import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function Dashboard() {
  const summary = useQuery(api.sales.todaySummary);
  const products = useQuery(api.products.list, { activeOnly: true }) ?? [];
  const recentSales = useQuery(api.sales.list, { limit: 5 }) ?? [];

  const lowStock = products.filter((p) => p.stock < 10 && p.stock > 0);
  const outOfStock = products.filter((p) => p.stock === 0);
  const recentProducts = [...products]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, 5);

  return (
    <div className="p-3 md:p-6 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-gray-800 mb-3">📊 Dashboard</h2>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard icon="💰" label="Today's Revenue" value={`₹${(summary?.totalRevenue ?? 0).toFixed(0)}`}
          color="bg-green-50 border-green-200" textColor="text-green-700" />
        <StatCard icon="🧾" label="Transactions" value={String(summary?.totalTransactions ?? 0)}
          color="bg-blue-50 border-blue-200" textColor="text-blue-700" />
        <StatCard icon="📈" label="Avg. Sale" value={`₹${(summary?.avgTransaction ?? 0).toFixed(0)}`}
          color="bg-purple-50 border-purple-200" textColor="text-purple-700" />
        <StatCard icon="📦" label="Total Products" value={String(products.length)}
          color="bg-orange-50 border-orange-200" textColor="text-orange-700" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border p-3">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">🧾 Recent Sales</h3>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No sales yet today</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div key={sale._id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{sale.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(sale._creationTime).toLocaleTimeString("en-IN")} · {sale.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">₹{sale.total.toFixed(0)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{sale.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-3">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">⚠️ Stock Alerts</h3>
          {outOfStock.length === 0 && lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">✅ All stock levels healthy</p>
          ) : (
            <div className="space-y-1.5">
              {outOfStock.map((p) => (
                <div key={p._id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <p className="text-sm text-gray-800 truncate flex-1 mr-2">{p.name}</p>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Out of Stock</span>
                </div>
              ))}
              {lowStock.map((p) => (
                <div key={p._id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <p className="text-sm text-gray-800 truncate flex-1 mr-2">{p.name}</p>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Low: {p.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-3 mt-3">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm">🆕 Recently Added Products</h3>
        {recentProducts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No products yet</p>
        ) : (
          <div className="space-y-1.5">
            {recentProducts.map((p) => (
              <div key={p._id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.sku} · {new Date(p._creationTime).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-sm font-bold text-indigo-600">₹{p.price.toFixed(0)}</p>
                  <p className="text-xs text-gray-400">{p.stock} {p.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live sync indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 justify-center">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        Live sync — all devices update in real-time
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, textColor }: {
  icon: string; label: string; value: string; color: string; textColor: string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <p className="text-xl mb-1">{icon}</p>
      <p className={`text-lg font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
