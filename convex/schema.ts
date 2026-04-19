import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  settings: defineTable({
    userId: v.id("users"),
    shopName: v.string(),
    gstApplicable: v.boolean(),
    gstRate: v.number(),
    gstNumber: v.optional(v.string()),
    hardwareId: v.optional(v.string()),
    isPaying: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
  }).index("by_user", ["userId"]),

  products: defineTable({
    userId: v.id("users"),
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
    .index("by_user", ["userId"])
    .index("by_sku", ["userId", "sku"])
    .index("by_category", ["categoryId"])
    .index("by_active", ["isActive"])
    .index("by_barcode", ["barcode"])
    .searchIndex("search_products", { searchField: "name", filterFields: ["userId"] }),

  customers: defineTable({
    userId: v.id("users"),
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
    .index("by_user", ["userId"])
    .index("by_mobile", ["userId", "mobile"])
    .searchIndex("search_customers", { searchField: "name", filterFields: ["userId"] }),

  sales: defineTable({
    userId: v.id("users"),
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
    .index("by_user", ["userId"])
    .index("by_invoice", ["userId", "invoiceNumber"])
    .index("by_cashier", ["cashierId"])
    .index("by_status", ["userId", "status"])
    .index("by_customer", ["customerId"]),

  saleItems: defineTable({
    userId: v.id("users"),
    saleId: v.id("sales"),
    productId: v.id("products"),
    productName: v.string(),
    sku: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    discount: v.number(),
    total: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_sale", ["saleId"])
    .index("by_product", ["productId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
