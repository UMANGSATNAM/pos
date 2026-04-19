import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").order("desc").collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return await ctx.db.query("customers").order("desc").take(20);
    }
    const byName = await ctx.db
      .query("customers")
      .withSearchIndex("search_customers", (q) => q.search("name", args.query))
      .take(10);
    const byMobile = await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("mobile", args.query.trim()))
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
    return await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("mobile", args.mobile))
      .unique();
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getWithHistory = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.id);
    if (!customer) return null;
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_customer", (q) => q.eq("customerId", args.id))
      .order("desc")
      .collect();
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const items = await ctx.db
          .query("saleItems")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
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
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_mobile", (q) => q.eq("mobile", args.mobile))
      .unique();
    if (existing) throw new Error("Customer with this mobile already exists");
    return await ctx.db.insert("customers", {
      ...args,
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
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const clearDue = mutation({
  args: { id: v.id("customers"), amount: v.number() },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.id);
    if (!customer) throw new Error("Customer not found");
    const newDue = Math.max(0, customer.dueBalance - args.amount);
    await ctx.db.patch(args.id, { dueBalance: newDue });
  },
});

export const topCustomers = query({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    return customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  },
});
