import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  categories: defineTable({
    name: v.string(),
    color: v.string(),
  }),

  products: defineTable({
    name: v.string(),
    sku: v.string(),
    price: v.number(),
    costPrice: v.number(),
    stock: v.number(),
    categoryId: v.optional(v.id("categories")),
    unit: v.string(),
    barcode: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_sku", ["sku"])
    .index("by_category", ["categoryId"])
    .index("by_active", ["isActive"])
    .index("by_barcode", ["barcode"])
    .searchIndex("search_products", { searchField: "name" }),

  customers: defineTable({
    name: v.string(),
    mobile: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    dueBalance: v.number(),
    totalSpent: v.number(),
    visitCount: v.number(),
    lastVisit: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_mobile", ["mobile"])
    .searchIndex("search_customers", { searchField: "name" }),

  sales: defineTable({
    invoiceNumber: v.string(),
    subtotal: v.number(),
    discount: v.number(),
    tax: v.number(),
    total: v.number(),
    amountPaid: v.number(),
    change: v.number(),
    paymentMethod: v.string(),
    cashierId: v.optional(v.id("users")),
    customerId: v.optional(v.id("customers")),
    customerName: v.optional(v.string()),
    customerMobile: v.optional(v.string()),
    dueAdded: v.optional(v.number()),
    status: v.string(),
    notes: v.optional(v.string()),
  })
    .index("by_invoice", ["invoiceNumber"])
    .index("by_cashier", ["cashierId"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"]),

  saleItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    productName: v.string(),
    sku: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    discount: v.number(),
    total: v.number(),
  })
    .index("by_sale", ["saleId"])
    .index("by_product", ["productId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
