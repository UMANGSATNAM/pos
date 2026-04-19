import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import { BarcodeScanner } from "./BarcodeScanner";
import { CustomerSelector } from "./CustomerSelector";
import { PrintReceipt } from "./PrintReceipt";
import {
  IconShoppingCart, IconBarcode, IconCamera, IconSearch,
  IconX, IconPlus, IconMinus, IconTrash, IconCash, IconCard, IconQR,
  IconCheck, IconDue,
} from "./icons";

type CartItem = {
  productId: Id<"products">;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export function POSTerminal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Id<"categories"> | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate] = useState(0.18);
  const [includeGST, setIncludeGST] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<"success" | "error" | null>(null);
  const [justAddedId, setJustAddedId] = useState<Id<"products"> | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{
    invoiceNumber: string;
    total: number;
    change: number;
    dueAdded?: number;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    paymentMethod: string;
    amountPaid: number;
    customerName?: string;
    customerMobile?: string;
  } | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  // Customer
  const [customerId, setCustomerId] = useState<Id<"customers"> | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerDue, setCustomerDue] = useState(0);
  const [payDue, setPayDue] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef("");
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = useQuery(api.categories.list) ?? [];
  const products = useQuery(api.products.search, { query: searchQuery }) ?? [];
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const createSale = useMutation(api.sales.create);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = includeGST ? taxableAmount * taxRate : 0;
  const cartTotal = taxableAmount + taxAmount;
  const duePayment = payDue && customerDue > 0 ? customerDue : 0;
  const grandTotal = cartTotal + duePayment;
  const change = parseFloat(amountPaid || "0") - grandTotal;

  // Hardware barcode scanner (keyboard wedge)
  useEffect(() => {
    if (barcodeMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 2) handleBarcodeSubmit(barcodeBuffer.current);
        barcodeBuffer.current = "";
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        return;
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ""; }, 100);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeMode, cart]);

  useEffect(() => {
    if (barcodeMode && barcodeRef.current) barcodeRef.current.focus();
  }, [barcodeMode]);

  const handleBarcodeSubmit = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setBarcodeInput("");
    const found = products.find((p) => p.barcode === code.trim() || p.sku === code.trim());
    if (found) {
      addToCartDirect(found);
      setScanFeedback("success");
      setTimeout(() => setScanFeedback(null), 1000);
    } else {
      toast.error(`No product found for: ${code}`);
      setScanFeedback("error");
      setTimeout(() => setScanFeedback(null), 1000);
    }
  }, [products]);

  function addToCartDirect(product: (typeof products)[0]) {
    setJustAddedId(product._id);
    setTimeout(() => setJustAddedId(null), 600);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error("Insufficient stock"); return prev; }
        return prev.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice * (1 - i.discount / 100) }
            : i
        );
      }
      if (product.stock === 0) { toast.error("Out of stock"); return prev; }
      return [...prev, {
        productId: product._id, productName: product.name, sku: product.sku,
        quantity: 1, unitPrice: product.price, discount: 0, total: product.price,
      }];
    });
  }

  function updateQty(productId: Id<"products">, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCart((prev) => prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: qty, total: qty * i.unitPrice * (1 - i.discount / 100) }
          : i
      ));
    }
  }

  function updateItemDiscount(productId: Id<"products">, disc: number) {
    setCart((prev) => prev.map((i) =>
      i.productId === productId
        ? { ...i, discount: disc, total: i.quantity * i.unitPrice * (1 - disc / 100) }
        : i
    ));
  }

  async function handleCheckout() {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    const paid = parseFloat(amountPaid || "0");
    const actualPaid = paymentMethod === "cash" ? paid : grandTotal;
    const shortfall = Math.max(0, grandTotal - actualPaid);
    const dueAdded = shortfall > 0 ? shortfall : 0;

    try {
      const result = await createSale({
        items: cart,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total: grandTotal,
        amountPaid: actualPaid,
        change: paymentMethod === "cash" ? Math.max(0, change) : 0,
        paymentMethod,
        customerId: customerId ?? undefined,
        customerName: customerName || undefined,
        customerMobile: customerMobile || undefined,
        dueAdded: dueAdded > 0 ? dueAdded : undefined,
      });
      setLastReceipt({
        invoiceNumber: result.invoiceNumber,
        total: grandTotal,
        change: paymentMethod === "cash" ? Math.max(0, change) : 0,
        dueAdded: dueAdded > 0 ? dueAdded : undefined,
        items: [...cart],
        subtotal,
        discountAmount,
        taxAmount,
        paymentMethod,
        amountPaid: actualPaid,
        customerName: customerName || undefined,
        customerMobile: customerMobile || undefined,
      });
      setCart([]);
      setDiscount(0);
      setIncludeGST(true);
      setAmountPaid("");
      setCustomerId(null);
      setCustomerName("");
      setCustomerMobile("");
      setCustomerDue(0);
      setPayDue(false);
      setShowCart(false);
      toast.success(`Sale complete! ${result.invoiceNumber}`);
    } catch {
      toast.error("Failed to process sale");
    }
  }

  const CartPanel = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b bg-gradient-to-r from-slate-50 to-indigo-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
            <IconShoppingCart className="w-4 h-4 text-indigo-600" />
            Cart
            {cart.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">{cart.length}</span>
            )}
          </h2>
          <button onClick={() => setShowCart(false)} className="md:hidden text-gray-400 hover:text-gray-600 p-1">
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <CustomerSelector
          selectedCustomerId={customerId}
          selectedCustomerName={customerName}
          selectedCustomerMobile={customerMobile}
          onSelect={(id, name, mobile, due) => {
            setCustomerId(id);
            setCustomerName(name);
            setCustomerMobile(mobile);
            setCustomerDue(due);
          }}
        />
        {customerDue > 0 && customerId && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer bg-red-50 rounded-lg px-2 py-1.5">
            <input
              type="checkbox"
              checked={payDue}
              onChange={(e) => setPayDue(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600"
            />
            <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
              <IconDue className="w-3.5 h-3.5" />
              Collect due ₹{customerDue.toFixed(2)}
            </span>
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
            <IconShoppingCart className="w-14 h-14 mb-3 opacity-40" />
            <p className="text-sm font-medium text-gray-400">Cart is empty</p>
            <p className="text-xs mt-1 text-gray-300">Tap products to add</p>
          </div>
        ) : (
          <div className="divide-y">
            {cart.map((item) => (
              <div key={item.productId} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">₹{item.unitPrice.toFixed(2)} each</p>
                  </div>
                  <button onClick={() => updateQty(item.productId, 0)} className="text-red-400 hover:text-red-600 ml-2 p-1 rounded-lg hover:bg-red-50">
                    <IconX className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center border rounded-lg overflow-hidden shadow-sm">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="px-2.5 py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-600 active:bg-red-100 transition-colors">
                      <IconMinus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-bold min-w-[2rem] text-center bg-white">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="px-2.5 py-1.5 bg-gray-50 hover:bg-green-50 hover:text-green-600 active:bg-green-100 transition-colors">
                      <IconPlus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">D%</span>
                    <input type="text" inputMode="decimal" value={item.discount}
                      onChange={(e) => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                      className="w-10 px-1 py-1 text-xs border rounded text-center focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                  </div>
                  <span className="text-sm font-bold text-indigo-600 ml-auto">₹{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-3 bg-gray-50 flex-shrink-0">
        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span>Discount</span>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="decimal" value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-10 px-1 py-0.5 text-xs border rounded text-center focus:outline-none" />
              <span className="text-xs">%</span>
              <span className="text-red-500 text-xs font-medium">-₹{discountAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeGST}
                onChange={(e) => setIncludeGST(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              <span>GST (18%)</span>
            </label>
            <span>{includeGST ? `₹${taxAmount.toFixed(2)}` : "—"}</span>
          </div>
          {duePayment > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Previous Due</span><span>+₹{duePayment.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-800 border-t pt-2 mt-1">
            <span>TOTAL</span>
            <span className="text-indigo-600 text-lg">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-1 mb-2">
          {[
            { id: "cash", label: "Cash", icon: <IconCash className="w-3.5 h-3.5" /> },
            { id: "card", label: "Card", icon: <IconCard className="w-3.5 h-3.5" /> },
            { id: "upi", label: "UPI", icon: <IconQR className="w-3.5 h-3.5" /> },
          ].map((m) => (
            <button key={m.id} onClick={() => setPaymentMethod(m.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                paymentMethod === m.id
                  ? "bg-indigo-600 text-white shadow-md scale-[1.02]"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {paymentMethod === "cash" && (
          <div className="mb-2">
            <input type="text" inputMode="decimal" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Amount paid (₹)"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            {parseFloat(amountPaid || "0") > 0 && (
              change >= 0 ? (
                <p className="text-green-600 text-xs mt-1 font-semibold bg-green-50 px-2 py-1 rounded-lg">✓ Change: ₹{change.toFixed(2)}</p>
              ) : (
                <p className="text-red-500 text-xs mt-1 font-semibold bg-red-50 px-2 py-1 rounded-lg">
                  Short ₹{Math.abs(change).toFixed(2)} → added to due
                </p>
              )
            )}
          </div>
        )}

        <button onClick={handleCheckout} disabled={cart.length === 0}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold rounded-xl transition-all text-sm active:scale-95 flex items-center justify-center gap-2 shadow-lg">
          <IconCheck className="w-4 h-4" />
          Complete Sale — ₹{grandTotal.toFixed(2)}
        </button>
        {cart.length > 0 && (
          <button onClick={() => setCart([])}
            className="w-full py-2 mt-1 text-xs text-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-1">
            <IconTrash className="w-3.5 h-3.5" />
            Clear Cart
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Camera barcode scanner overlay */}
      {showCameraScanner && (
        <BarcodeScanner
          onScan={(code) => { handleBarcodeSubmit(code); }}
          onClose={() => setShowCameraScanner(false)}
        />
      )}

      {/* Products Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 min-w-0">
        {/* Search / Barcode bar */}
        <div className="p-2 bg-white border-b flex gap-2 items-center flex-shrink-0 shadow-sm">
          {barcodeMode ? (
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 border-2 rounded-xl transition-colors ${
              scanFeedback === "success" ? "border-green-400 bg-green-50" :
              scanFeedback === "error" ? "border-red-400 bg-red-50" : "border-indigo-400 bg-indigo-50"
            }`}>
              <IconBarcode className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <input ref={barcodeRef} value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSubmit(barcodeInput); }}
                placeholder="Scan or type barcode..."
                className="flex-1 bg-transparent text-sm focus:outline-none font-mono" />
              {scanFeedback === "success" && <span className="text-green-600 font-bold text-xs flex items-center gap-1"><IconCheck className="w-3 h-3" />Added</span>}
              {scanFeedback === "error" && <span className="text-red-600 font-bold text-xs flex items-center gap-1"><IconX className="w-3 h-3" />Not found</span>}
            </div>
          ) : (
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch className="w-4 h-4" />
              </div>
              <input ref={searchRef} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
            </div>
          )}
          <button onClick={() => { setBarcodeMode((v) => !v); setBarcodeInput(""); setScanFeedback(null); }}
            title="Hardware barcode scanner"
            className={`px-2.5 py-2 rounded-xl text-sm font-medium transition-all border flex-shrink-0 ${
              barcodeMode ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}>
            <IconBarcode className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCameraScanner(true)}
            title="Camera barcode scanner"
            className="px-2.5 py-2 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 flex-shrink-0">
            <IconCamera className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCart(true)}
            className="md:hidden relative px-2.5 py-2 rounded-xl text-sm font-medium bg-indigo-600 text-white border border-indigo-600 flex-shrink-0 shadow-md">
            <IconShoppingCart className="w-4 h-4" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 px-2 py-2 overflow-x-auto bg-white border-b flex-shrink-0 scrollbar-hide shadow-sm">
          <button onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              !selectedCategory ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>All</button>
          {categories.map((cat) => (
            <button key={cat._id}
              onClick={() => setSelectedCategory(selectedCategory === cat._id ? null : cat._id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === cat._id ? "text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={selectedCategory === cat._id ? { backgroundColor: cat.color } : {}}>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product._id);
            const isJustAdded = justAddedId === product._id;
            return (
              <button key={product._id} onClick={() => addToCartDirect(product)}
                disabled={product.stock === 0}
                className={`relative bg-white rounded-2xl p-2.5 text-left shadow-sm border-2 transition-all active:scale-95 select-none ${
                  product.stock === 0
                    ? "opacity-50 cursor-not-allowed border-gray-100"
                    : inCart
                    ? "border-indigo-400 shadow-md bg-indigo-50"
                    : "border-transparent hover:shadow-md hover:border-indigo-200"
                } ${isJustAdded ? "scale-95 border-green-400 bg-green-50" : ""}`}>
                {/* Selection indicator */}
                {inCart && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-md z-10">
                    <span className="text-white text-xs font-bold leading-none">{inCart.quantity}</span>
                  </span>
                )}
                {isJustAdded && !inCart && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md z-10">
                    <IconCheck className="w-3 h-3 text-white" />
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: product.category?.color ?? "#6B7280" }}>
                  {product.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate font-mono">{product.sku}</p>
                <p className="text-sm font-bold text-indigo-600 mt-1">₹{product.price.toFixed(2)}</p>
                <p className={`text-xs mt-0.5 font-medium ${product.stock === 0 ? "text-red-500" : product.stock < 10 ? "text-amber-500" : "text-gray-400"}`}>
                  {product.stock === 0 ? "Out of stock" : `${product.stock} ${product.unit}`}
                </p>
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400">
              <IconPackageEmpty />
              <p className="text-sm mt-3 font-medium">No products found</p>
            </div>
          )}
        </div>

        {/* Mobile: floating total bar */}
        {cart.length > 0 && (
          <div className="md:hidden bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-lg">
            <div>
              <span className="text-sm font-semibold">{cart.length} item{cart.length > 1 ? "s" : ""}</span>
              <span className="text-indigo-200 text-xs ml-2">₹{grandTotal.toFixed(2)}</span>
            </div>
            <button onClick={() => setShowCart(true)}
              className="bg-white text-indigo-600 px-5 py-2 rounded-xl text-sm font-bold active:scale-95 shadow-md">
              View Cart →
            </button>
          </div>
        )}
      </div>

      {/* Desktop Cart Panel */}
      <div className="hidden md:flex w-80 xl:w-96 flex-col border-l shadow-xl">
        <CartPanel />
      </div>

      {/* Mobile Cart Drawer */}
      {showCart && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="bg-white rounded-t-3xl flex flex-col shadow-2xl" style={{ maxHeight: "92vh" }}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
            <CartPanel />
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {lastReceipt && !showPrint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <IconCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Sale Complete!</h3>
            <p className="text-gray-400 text-sm mt-1 font-mono bg-gray-100 px-3 py-1 rounded-lg inline-block">{lastReceipt.invoiceNumber}</p>
            <div className="mt-4 bg-gray-50 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-800">₹{lastReceipt.total.toFixed(2)}</span>
              </div>
              {lastReceipt.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Change</span>
                  <span className="font-bold text-green-600">₹{lastReceipt.change.toFixed(2)}</span>
                </div>
              )}
              {lastReceipt.dueAdded && lastReceipt.dueAdded > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Added to Due</span>
                  <span className="font-bold text-red-600">₹{lastReceipt.dueAdded.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowPrint(true)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                🖨️ Print Bill
              </button>
              <button onClick={() => setLastReceipt(null)}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all active:scale-95 text-sm">
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt */}
      {showPrint && lastReceipt && (
        <PrintReceipt
          receipt={lastReceipt}
          onClose={() => { setShowPrint(false); setLastReceipt(null); }}
        />
      )}
    </div>
  );
}

function IconPackageEmpty() {
  return (
    <svg className="w-12 h-12 mx-auto text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  );
}
