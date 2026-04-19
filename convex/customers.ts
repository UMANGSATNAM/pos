import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("customers").withIndex("by_user", q => q.eq("userId", userId)).order("desc").collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    if (!args.query.trim()) {
      return await ctx.db.query("customers").withIndex("by_user", q => q.eq("userId", userId)).order("desc").take(20);
    }
    const byName = await ctx.db
      .query("customers")
      .withSearchIndex("search_customers", (q) => q.search("name", args.query).eq("userId", userId))
      .take(10);
    const byMobile = await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("userId", userId).eq("mobile", args.query.trim()))
      .collect();
    const combined = [...byName];
    for (const c of byMobile) {
      if (!combined.find((x) => x._id === c._id)) combined.push(c);
    }
    return combined;
  },
});

export const getByMobile = query({
  args: { mobile: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("userId", userId).eq("mobile", args.mobile))
      .first();
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const c = await ctx.db.get(args.id);
    return c?.userId === userId ? c : null;
  },
});

export const getWithHistory = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const customer = await ctx.db.get(args.id);
    if (!customer || customer.userId !== userId) return null;
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .filter(q => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const items = await ctx.db
          .query("saleItems")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
          .filter(q => q.eq(q.field("userId"), userId))
          .collect();
        return { ...sale, items };
      })
    );
    return { ...customer, sales: salesWithItems };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    mobile: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("userId", userId).eq("mobile", args.mobile))
      .first();
    if (existing) throw new Error("Customer with this mobile already exists");
    return await ctx.db.insert("customers", {
      ...args,
      userId,
      dueBalance: 0,
      totalSpent: 0,
      visitCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.string(),
    mobile: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const { id, ...rest } = args;
    const c = await ctx.db.get(id);
    if (c?.userId === userId) await ctx.db.patch(id, rest);
  },
});

export const clearDue = mutation({
  args: { id: v.id("customers"), amount: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const customer = await ctx.db.get(args.id);
    if (!customer || customer.userId !== userId) throw new Error("Customer not found");
    const newDue = Math.max(0, customer.dueBalance - args.amount);
    await ctx.db.patch(args.id, { dueBalance: newDue });
  },
});

export const topCustomers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const customers = await ctx.db.query("customers").withIndex("by_user", q => q.eq("userId", userId)).collect();
    return customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  },
});
