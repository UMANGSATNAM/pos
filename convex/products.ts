import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { categoryId: v.optional(v.id("categories")), activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let products;
    if (args.categoryId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }
    if (args.activeOnly) {
      products = products.filter((p) => p.isActive);
    }
    const categories = await ctx.db.query("categories").collect();
    const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));
    return products.map((p) => ({
      ...p,
      category: p.categoryId ? catMap[p.categoryId] : null,
    }));
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      const products = await ctx.db.query("products").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
      const categories = await ctx.db.query("categories").collect();
      const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));
      return products.slice(0, 20).map((p) => ({ ...p, category: p.categoryId ? catMap[p.categoryId] : null }));
    }
    const results = await ctx.db
      .query("products")
      .withSearchIndex("search_products", (q) => q.search("name", args.query))
      .take(20);
    const categories = await ctx.db.query("categories").collect();
    const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));
    return results.filter((p) => p.isActive).map((p) => ({ ...p, category: p.categoryId ? catMap[p.categoryId] : null }));
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .unique();
    if (!product) return null;
    const category = product.categoryId ? await ctx.db.get(product.categoryId) : null;
    return { ...product, category };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    price: v.number(),
    costPrice: v.number(),
    stock: v.number(),
    categoryId: v.optional(v.id("categories")),
    unit: v.string(),
    barcode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("products", { ...args, isActive: true });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    sku: v.string(),
    price: v.number(),
    costPrice: v.number(),
    stock: v.number(),
    categoryId: v.optional(v.id("categories")),
    unit: v.string(),
    barcode: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const adjustStock = mutation({
  args: { id: v.id("products"), delta: v.number() },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");
    await ctx.db.patch(args.id, { stock: Math.max(0, product.stock + args.delta) });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").collect();
    if (existing.length > 0) return;
    const categories = await ctx.db.query("categories").collect();
    const catMap = Object.fromEntries(categories.map((c) => [c.name, c._id]));

    const items = [
      { name: "Coca-Cola 330ml", sku: "BEV001", price: 40, costPrice: 25, stock: 100, unit: "can", categoryId: catMap["Beverages"] },
      { name: "Pepsi 330ml", sku: "BEV002", price: 40, costPrice: 25, stock: 80, unit: "can", categoryId: catMap["Beverages"] },
      { name: "Bisleri Water 1L", sku: "BEV003", price: 20, costPrice: 10, stock: 200, unit: "bottle", categoryId: catMap["Beverages"] },
      { name: "Real Orange Juice 1L", sku: "BEV004", price: 120, costPrice: 80, stock: 50, unit: "carton", categoryId: catMap["Beverages"] },
      { name: "Lays Classic 26g", sku: "SNK001", price: 20, costPrice: 12, stock: 120, unit: "pack", categoryId: catMap["Snacks"] },
      { name: "Kurkure Masala 90g", sku: "SNK002", price: 30, costPrice: 18, stock: 90, unit: "pack", categoryId: catMap["Snacks"] },
      { name: "Parle-G Biscuits 250g", sku: "SNK003", price: 25, costPrice: 15, stock: 60, unit: "pack", categoryId: catMap["Snacks"] },
      { name: "Haldiram Bhujia 200g", sku: "SNK004", price: 80, costPrice: 50, stock: 45, unit: "pack", categoryId: catMap["Snacks"] },
      { name: "Amul Full Cream Milk 1L", sku: "DAI001", price: 68, costPrice: 55, stock: 70, unit: "carton", categoryId: catMap["Dairy"] },
      { name: "Amul Butter 500g", sku: "DAI002", price: 275, costPrice: 220, stock: 40, unit: "pack", categoryId: catMap["Dairy"] },
      { name: "Amul Cheese Slices 200g", sku: "DAI003", price: 130, costPrice: 100, stock: 35, unit: "pack", categoryId: catMap["Dairy"] },
      { name: "Amul Dahi 400g", sku: "DAI004", price: 50, costPrice: 38, stock: 55, unit: "cup", categoryId: catMap["Dairy"] },
      { name: "Britannia Bread 400g", sku: "BAK001", price: 45, costPrice: 30, stock: 30, unit: "loaf", categoryId: catMap["Bakery"] },
      { name: "Pav Bun 6pcs", sku: "BAK002", price: 30, costPrice: 18, stock: 25, unit: "pack", categoryId: catMap["Bakery"] },
      { name: "Vim Dish Wash Bar 250g", sku: "HH001", price: 35, costPrice: 22, stock: 60, unit: "piece", categoryId: catMap["Household"] },
      { name: "Surf Excel 1kg", sku: "HH002", price: 220, costPrice: 160, stock: 40, unit: "pack", categoryId: catMap["Household"] },
      { name: "Harpic Toilet Cleaner 500ml", sku: "HH003", price: 120, costPrice: 85, stock: 80, unit: "bottle", categoryId: catMap["Household"] },
      { name: "Head & Shoulders 200ml", sku: "PC001", price: 199, costPrice: 140, stock: 45, unit: "bottle", categoryId: catMap["Personal Care"] },
      { name: "Colgate Toothpaste 200g", sku: "PC002", price: 99, costPrice: 70, stock: 70, unit: "tube", categoryId: catMap["Personal Care"] },
      { name: "McCain Frozen Fries 400g", sku: "FRZ001", price: 180, costPrice: 130, stock: 20, unit: "pack", categoryId: catMap["Frozen"] },
      { name: "Banana 1kg", sku: "PRD001", price: 50, costPrice: 30, stock: 50, unit: "kg", categoryId: catMap["Produce"] },
      { name: "Apple Shimla 1kg", sku: "PRD002", price: 180, costPrice: 120, stock: 40, unit: "kg", categoryId: catMap["Produce"] },
    ];

    for (const item of items) {
      await ctx.db.insert("products", { ...item, isActive: true });
    }
  },
});
