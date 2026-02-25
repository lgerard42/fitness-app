import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";

export const referenceMetadata = pgTable("reference_metadata", {
  tableName: text("table_name").primaryKey(),
  versionSeq: bigint("version_seq", { mode: "number" }).notNull().default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
