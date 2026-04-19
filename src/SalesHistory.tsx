import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { BRAND } from "./branding";

export function SalesHistory() {
  const [selectedSale, setSelectedSale] = useState<Id<"sales"> | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const sales = useQuery(api.sales.list, { limit: 100 }) ?? [];
  const saleDetail = useQuery(api.sales.get, selectedSale ? { id: selectedSale } : "skip");
  const voidSale = useMutation(api.sales.voidSale);

  const totalRevenue = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.total, 0);

  async function handleVoid(id: Id<"sales">) {
    if (!confirm("Void this sale? Stock will be restored.")) return;
    try {
      await voidSale({ id });
      toast.success("Sale voided");
      setSelectedSale(null);
      setShowDetail(false);
    } catch {
      toast.error("Failed to void sale");
    }
  }

  const paymentIcon = (method: string) =>
    method === "cash" ? "💵" : method === "card" ? "💳" : "📱";

  const ReceiptPanel = () => (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Receipt</h3>
        <button onClick={() => { setShowDetail(false); setSelectedSale(null); }}
          className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
      </div>

      {saleDetail && (
        <>
          <div className="text-center border-b pb-4 mb-4">
            <p className="text-2xl">{BRAND.receiptEmoji}</p>
            <p className="font-bold text-lg text-gray-800 mt-1">{BRAND.name}</p>
            <p className="text-xs text-gray-500">{BRAND.shortTagline}</p>
            <p className="text-sm font-mono font-semibold mt-2">{saleDetail.invoiceNumber}</p>
            <p className="text-xs text-gray-400">{new Date(saleDetail._creationTime).toLocaleString("en-IN")}</p>
            {saleDetail.customerName && (
              <p className="text-xs text-gray-600 mt-1">👤 {saleDetail.customerName}</p>
            )}
          </div>

          <div className="space-y-2 mb-4">
            {saleDetail.items?.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-gray-800 font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                    {item.discount > 0 && ` (-${item.discount}%)`}
                  </p>
                </div>
                <p className="font-semibold text-gray-800 whitespace-nowrap">₹{item.total.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>₹{saleDetail.subtotal.toFixed(2)}</span>
            </div>
            {saleDetail.discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Discount</span><span>-₹{saleDetail.discount.toFixed(2)}</span>
              </div>
            )}
            {saleDetail.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>GST (18%)</span><span>₹{saleDetail.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1">
              <span>Total</span>
              <span className="text-indigo-600">₹{saleDetail.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Paid ({saleDetail.paymentMethod.toUpperCase()})</span>
              <span>₹{saleDetail.amountPaid.toFixed(2)}</span>
            </div>
            {saleDetail.change > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Change</span><span>₹{saleDetail.change.toFixed(2)}</span>
              </div>
            )}
          </div>

          {saleDetail.status === "completed" && (
            <button onClick={() => handleVoid(saleDetail._id)}
              className="mt-4 w-full py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 active:scale-95">
              Void Sale
            </button>
          )}
          {saleDetail.status === "voided" && (
            <div className="mt-4 text-center py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
              This sale has been voided
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sales list */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">🧾 Sales History</h2>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-base font-bold text-indigo-600">₹{totalRevenue.toFixed(0)}</p>
          </div>
        </div>

        <div className="space-y-2">
          {sales.map((sale) => (
            <div key={sale._id}
              onClick={() => { setSelectedSale(sale._id); setShowDetail(true); }}
              className={`bg-white rounded-xl border p-3 cursor-pointer transition-all active:scale-[0.99] ${
                selectedSale === sale._id ? "border-indigo-400 shadow-md" : "hover:shadow-md"
              }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{sale.invoiceNumber}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(sale._creationTime).toLocaleString("en-IN")}
                  </p>
                  {sale.customerName && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">👤 {sale.customerName}</p>
                  )}
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <p className="font-bold text-indigo-600">₹{sale.total.toFixed(0)}</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-xs text-gray-400">{paymentIcon(sale.paymentMethod)} {sale.paymentMethod.toUpperCase()}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{sale.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {sales.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-3xl mb-2">🧾</p>
              <p className="text-sm">No sales yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop receipt panel */}
      <div className="hidden md:block w-80 xl:w-96 border-l bg-white">
        {selectedSale && saleDetail ? (
          <ReceiptPanel />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-300">
            <p className="text-4xl">🧾</p>
            <p className="mt-2 text-sm">Select a sale to view receipt</p>
          </div>
        )}
      </div>

      {/* Mobile receipt drawer */}
      {showDetail && selectedSale && saleDetail && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/50" onClick={() => { setShowDetail(false); }} />
          <div className="bg-white rounded-t-2xl" style={{ maxHeight: "85vh" }}>
            <ReceiptPanel />
          </div>
        </div>
      )}
    </div>
  );
}
