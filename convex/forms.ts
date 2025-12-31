import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const forms = await ctx.db
      .query("forms")
      .collect();

    return forms.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.id);
    if (!form) {
      return null;
    }

    const fields = await ctx.db
      .query("formFields")
      .withIndex("by_formId", (q) => q.eq("formId", args.id))
      .collect();

    const sortedFields = fields.sort((a, b) => a.order - b.order);

    return {
      ...form,
      fields: sortedFields,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const formId = await ctx.db.insert("forms", {
      name: args.name,
      description: args.description ?? null,
      createdBy: args.createdBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return formId;
  },
});

export const update = mutation({
  args: {
    id: v.id("forms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteForm = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    // Delete all fields first
    const fields = await ctx.db
      .query("formFields")
      .withIndex("by_formId", (q) => q.eq("formId", args.id))
      .collect();

    for (const field of fields) {
      await ctx.db.delete(field._id);
    }

    // Delete the form
    await ctx.db.delete(args.id);
  },
});

// Form Fields mutations
export const addField = mutation({
  args: {
    formId: v.id("forms"),
    fieldType: v.union(
      v.literal("text"),
      v.literal("email"),
      v.literal("number"),
      v.literal("textarea"),
      v.literal("select"),
      v.literal("checkbox"),
      v.literal("radio"),
      v.literal("date"),
      v.literal("file")
    ),
    label: v.string(),
    name: v.string(),
    placeholder: v.optional(v.string()),
    required: v.optional(v.boolean()),
    defaultValue: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    validation: v.optional(
      v.object({
        min: v.union(v.number(), v.null()),
        max: v.union(v.number(), v.null()),
        pattern: v.union(v.string(), v.null()),
        minLength: v.union(v.number(), v.null()),
        maxLength: v.union(v.number(), v.null()),
      })
    ),
    helpText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the highest order number
    const existingFields = await ctx.db
      .query("formFields")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();

    const maxOrder = existingFields.length > 0
      ? Math.max(...existingFields.map((f) => f.order))
      : -1;

    const now = Date.now();
    const fieldId = await ctx.db.insert("formFields", {
      formId: args.formId,
      fieldType: args.fieldType,
      label: args.label,
      name: args.name,
      placeholder: args.placeholder ?? null,
      required: args.required ?? false,
      defaultValue: args.defaultValue ?? null,
      options: args.options ?? null,
      validation: args.validation ?? null,
      order: maxOrder + 1,
      helpText: args.helpText ?? null,
      createdAt: now,
      updatedAt: now,
    });

    // Update form updatedAt
    await ctx.db.patch(args.formId, {
      updatedAt: now,
    });

    return fieldId;
  },
});

export const updateField = mutation({
  args: {
    id: v.id("formFields"),
    fieldType: v.optional(
      v.union(
        v.literal("text"),
        v.literal("email"),
        v.literal("number"),
        v.literal("textarea"),
        v.literal("select"),
        v.literal("checkbox"),
        v.literal("radio"),
        v.literal("date"),
        v.literal("file")
      )
    ),
    label: v.optional(v.string()),
    name: v.optional(v.string()),
    placeholder: v.optional(v.string()),
    required: v.optional(v.boolean()),
    defaultValue: v.optional(v.string()),
    options: v.optional(v.array(v.string())),
    validation: v.optional(
      v.object({
        min: v.union(v.number(), v.null()),
        max: v.union(v.number(), v.null()),
        pattern: v.union(v.string(), v.null()),
        minLength: v.union(v.number(), v.null()),
        maxLength: v.union(v.number(), v.null()),
      })
    ),
    helpText: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const field = await ctx.db.get(id);
    if (!field) {
      throw new Error("Field not found");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.fieldType !== undefined) updateData.fieldType = updates.fieldType;
    if (updates.label !== undefined) updateData.label = updates.label;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.placeholder !== undefined) updateData.placeholder = updates.placeholder;
    if (updates.required !== undefined) updateData.required = updates.required;
    if (updates.defaultValue !== undefined) updateData.defaultValue = updates.defaultValue;
    if (updates.options !== undefined) updateData.options = updates.options;
    if (updates.validation !== undefined) updateData.validation = updates.validation;
    if (updates.helpText !== undefined) updateData.helpText = updates.helpText;
    if (updates.order !== undefined) updateData.order = updates.order;

    await ctx.db.patch(id, updateData);

    // Update form updatedAt
    await ctx.db.patch(field.formId, {
      updatedAt: Date.now(),
    });
  },
});

export const deleteField = mutation({
  args: { id: v.id("formFields") },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.id);
    if (!field) {
      throw new Error("Field not found");
    }

    await ctx.db.delete(args.id);

    // Update form updatedAt
    await ctx.db.patch(field.formId, {
      updatedAt: Date.now(),
    });
  },
});

export const reorderFields = mutation({
  args: {
    formId: v.id("forms"),
    fieldOrders: v.array(
      v.object({
        fieldId: v.id("formFields"),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const { fieldId, order } of args.fieldOrders) {
      await ctx.db.patch(fieldId, {
        order,
        updatedAt: Date.now(),
      });
    }

    // Update form updatedAt
    await ctx.db.patch(args.formId, {
      updatedAt: Date.now(),
    });
  },
});
