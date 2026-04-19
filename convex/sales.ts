import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 50);
    return sales;
  },
});

export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const sale = await ctx.db.get(args.id);
    if (!sale || sale.userId !== userId) return null;
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    return { ...sale, items };
  },
});

export const todaySummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalRevenue: 0, totalTransactions: 0, avgTransaction: 0, sales: [] };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();
    const todaySales = sales.filter((s) => s._creationTime >= startOfDay.getTime());
    const totalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = todaySales.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    return { totalRevenue, totalTransactions, avgTransaction, sales: todaySales };
  },
});

export const create = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        sku: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        discount: v.number(),
        total: v.number(),
      })
    ),
    subtotal: v.number(),
    discount: v.number(),
    tax: v.number(),
    total: v.number(),
    amountPaid: v.number(),
    change: v.number(),
    paymentMethod: v.string(),
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    customerMobile: v.optional(v.string()),
    dueAdded: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const count = await ctx.db.query("sales").withIndex("by_user", q => q.eq("userId", userId)).collect();
    const invoiceNumber = `INV-${String(count.length + 1).padStart(5, "0")}`;

    const saleId = await ctx.db.insert("sales", {
      userId,
      invoiceNumber,
      subtotal: args.subtotal,
      discount: args.discount,
      tax: args.tax,
      total: args.total,
      amountPaid: args.amountPaid,
      change: args.change,
      paymentMethod: args.paymentMethod,
      cashierId: userId ?? undefined,
      customerId: args.customerId,
      customerName: args.customerName,
      customerMobile: args.customerMobile,
      dueAdded: args.dueAdded,
      status: "completed",
      notes: args.notes,
    });

    for (const item of args.items) {
      await ctx.db.insert("saleItems", { userId, saleId, ...item });
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          stock: Math.max(0, product.stock - item.quantity),
        });
      }
    }

    // Update customer stats
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (customer) {
        const dueAdded = args.dueAdded ?? 0;
        await ctx.db.patch(args.customerId, {
          totalSpent: customer.totalSpent + args.total,
          visitCount: customer.visitCount + 1,
          lastVisit: Date.now(),
          dueBalance: customer.dueBalance + dueAdded,
        });
      }
    }

    return { saleId, invoiceNumber };
  },
});

export const voidSale = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const sale = await ctx.db.get(args.id);
    if (!sale || sale.userId !== userId) throw new Error("Sale not found");
    await ctx.db.patch(args.id, { status: "voided" });
    const items = await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .filter(q => q.eq(q.field("userId"), userId))
      .collect();
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, { stock: product.stock + item.quantity });
      }
    }
    // Reverse customer stats
    if (sale.customerId) {
      const customer = await ctx.db.get(sale.customerId);
      if (customer) {
        await ctx.db.patch(sale.customerId, {
          totalSpent: Math.max(0, customer.totalSpent - sale.total),
          visitCount: Math.max(0, customer.visitCount - 1),
          dueBalance: Math.max(0, customer.dueBalance - (sale.dueAdded ?? 0)),
        });
      }
    }
  },
});
