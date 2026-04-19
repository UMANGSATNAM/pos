import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    let settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
      
    // Return default settings if none exist
    if (!settings) {
      return {
        _id: "default",
        userId,
        shopName: "My Shop",
        gstApplicable: false,
        gstRate: 0,
        gstNumber: "",
        isPaying: false,
      };
    }
    return settings;
  },
});

export const update = mutation({
  args: {
    shopName: v.string(),
    gstApplicable: v.boolean(),
    gstRate: v.number(),
    gstNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, args);
    } else {
      await ctx.db.insert("settings", { ...args, userId });
    }
  },
});
