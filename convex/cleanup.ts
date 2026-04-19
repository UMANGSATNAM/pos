import { mutation } from "./_generated/server";

// One-time cleanup: delete all old documents that don't have userId
export const clearOldData = mutation({
  handler: async (ctx) => {
    const tables = ["categories", "products", "customers", "sales", "saleItems"] as const;
    let totalDeleted = 0;

    for (const table of tables) {
      const docs = await ctx.db.query(table as any).collect();
      for (const doc of docs) {
        if (!(doc as any).userId) {
          await ctx.db.delete(doc._id);
          totalDeleted++;
        }
      }
    }

    return { deleted: totalDeleted, message: "Old data cleaned up successfully" };
  },
});
