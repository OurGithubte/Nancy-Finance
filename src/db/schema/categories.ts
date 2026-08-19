import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // null if system default
    name: text("name").notNull(),
    type: text("type").notNull().$type<"income" | "expense">(),
    icon: text("icon").notNull().default("tag"),
    color: text("color").notNull().default("#10B981"),
    parentId: text("parent_id"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("categories_user_idx").on(table.userId),
    index("categories_type_idx").on(table.type),
  ]
);
