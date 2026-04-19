import { useRef } from "react";
import { BRAND } from "./branding";

interface ReceiptData {
  invoiceNumber: string;
  total: number;
  change: number;
  dueAdded?: number;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  paymentMethod: string;
  amountPaid: number;
  customerName?: string;
  customerMobile?: string;
}

interface PrintReceiptProps {
  receipt: ReceiptData;
  shopName: string;
  gstNumber?: string;
  onClose: () => void;
}

export function PrintReceipt({ receipt, shopName, gstNumber, onClose }: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) { alert("Please allow popups to print"); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; }
            .receipt { width: 80mm; max-width: 100%; margin: 0 auto; padding: 8px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .xlarge { font-size: 20px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 60px; text-align: right; }
            .total-row { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 8px; font-size: 10px; color: #555; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const payIcon = receipt.paymentMethod === "cash" ? "💵" : receipt.paymentMethod === "card" ? "💳" : "📱";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-800 text-base">🖨️ Print Bill</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div ref={printRef} className="receipt bg-white font-mono text-xs" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Store Header */}
            <div className="center" style={{ textAlign: "center", marginBottom: "8px" }}>
              <div className="xlarge bold" style={{ fontSize: "18px", fontWeight: "bold" }}>{BRAND.receiptEmoji} {shopName.toUpperCase()}</div>
              {gstNumber && <div style={{ fontSize: "11px", color: "#555" }}>GSTIN: {gstNumber}</div>}
              <div style={{ fontSize: "10px", color: "#777", marginTop: "2px" }}>Thank you for shopping with us!</div>
            </div>

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* Invoice Info */}
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>Invoice:</span>
              <span className="bold" style={{ fontWeight: "bold" }}>{receipt.invoiceNumber}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>Date:</span><span>{dateStr}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>Time:</span><span>{timeStr}</span>
            </div>
            {receipt.customerName && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>Customer:</span><span>{receipt.customerName}</span>
              </div>
            )}
            {receipt.customerMobile && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>Mobile:</span><span>{receipt.customerMobile}</span>
              </div>
            )}

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* Items Header */}
            <div className="row bold" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", margin: "2px 0" }}>
              <span style={{ flex: 1 }}>Item</span>
              <span style={{ width: "30px", textAlign: "center" }}>Qty</span>
              <span style={{ width: "70px", textAlign: "right" }}>Amount</span>
            </div>
            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

            {/* Items */}
            {receipt.items.map((item, i) => (
              <div key={i} style={{ marginBottom: "4px" }}>
                <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "1px 0" }}>
                  <span style={{ flex: 1, overflow: "hidden" }}>{item.productName.slice(0, 18)}</span>
                  <span style={{ width: "30px", textAlign: "center" }}>{item.quantity}</span>
                  <span style={{ width: "70px", textAlign: "right" }}>₹{item.total.toFixed(2)}</span>
                </div>
                <div style={{ color: "#666", fontSize: "10px", paddingLeft: "2px" }}>
                  ₹{item.unitPrice.toFixed(2)}/unit{item.discount > 0 ? ` (-${item.discount}%)` : ""}
                </div>
              </div>
            ))}

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            {/* Totals */}
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>Subtotal</span><span>₹{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>Discount</span><span>-₹{receipt.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.taxAmount > 0 && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>GST Tax</span><span>₹{receipt.taxAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

            <div className="row total-row" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", margin: "2px 0" }}>
              <span>TOTAL</span><span>₹{receipt.total.toFixed(2)}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
              <span>{payIcon} {receipt.paymentMethod.toUpperCase()}</span>
              <span>₹{receipt.amountPaid.toFixed(2)}</span>
            </div>
            {receipt.change > 0 && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                <span>Change</span><span>₹{receipt.change.toFixed(2)}</span>
              </div>
            )}
            {receipt.dueAdded && receipt.dueAdded > 0 && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "2px 0", color: "#c00" }}>
                <span>Added to Due</span><span>₹{receipt.dueAdded.toFixed(2)}</span>
              </div>
            )}

            <div className="divider" style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />

            {/* Footer */}
            <div className="footer" style={{ textAlign: "center", fontSize: "10px", color: "#666" }}>
              <div>{BRAND.receiptFooter}</div>
              <div style={{ marginTop: "4px" }}>{BRAND.poweredBy}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl text-sm font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2">
            🖨️ Print
          </button>
        </div>
      </div>
    </div>
  );
}
