import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("categories").withIndex("by_user", q => q.eq("userId", userId)).collect();
  },
});

export const create = mutation({
  args: { name: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    return await ctx.db.insert("categories", { name: args.name, color: args.color, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const cat = await ctx.db.get(args.id);
    if (cat?.userId === userId) await ctx.db.delete(args.id);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db.query("categories").withIndex("by_user", q => q.eq("userId", userId)).first();
    if (existing) return;
    const cats = [
      { name: "Beverages", color: "#3B82F6" },
      { name: "Snacks", color: "#F59E0B" },
      { name: "Dairy", color: "#10B981" },
      { name: "Bakery", color: "#F97316" },
      { name: "Household", color: "#8B5CF6" },
      { name: "Personal Care", color: "#EC4899" },
      { name: "Frozen", color: "#06B6D4" },
      { name: "Produce", color: "#84CC16" },
    ];
    for (const cat of cats) {
      await ctx.db.insert("categories", { ...cat, userId });
    }
  },
});
