import { pgTable, serial, timestamp, varchar, text, integer, index, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 科目表
export const subjects = pgTable(
  "subjects",
  {
    id: serial().primaryKey(),
    name: varchar("name", { length: 64 }).notNull().unique(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subjects_created_at_idx").on(table.created_at),
  ]
);

// 章节表
export const chapters = pgTable(
  "chapters",
  {
    id: serial().primaryKey(),
    subject_id: integer("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    order_index: integer("order_index").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chapters_subject_id_idx").on(table.subject_id),
    index("chapters_order_idx").on(table.order_index),
  ]
);

// 知识点表
export const knowledge_points = pgTable(
  "knowledge_points",
  {
    id: serial().primaryKey(),
    chapter_id: integer("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    order_index: integer("order_index").default(0),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    start_date: timestamp("start_date", { withTimezone: true }),
    mastered_date: timestamp("mastered_date", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("kp_chapter_id_idx").on(table.chapter_id),
    index("kp_status_idx").on(table.status),
    index("kp_mastered_date_idx").on(table.mastered_date),
  ]
);

// 错题表
export const wrong_questions = pgTable(
  "wrong_questions",
  {
    id: serial().primaryKey(),
    knowledge_point_id: integer("knowledge_point_id").notNull().references(() => knowledge_points.id, { onDelete: "cascade" }),
    question_text: text("question_text").notNull(),
    answer: text("answer").notNull(),
    question_image_url: varchar("question_image_url", { length: 512 }),
    wrong_reason: varchar("wrong_reason", { length: 32 }).notNull(),
    is_mastered: integer("is_mastered").default(0),
    mastered_date: timestamp("mastered_date", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("wq_kp_id_idx").on(table.knowledge_point_id),
    index("wq_mastered_idx").on(table.is_mastered),
  ]
);

// 同类题表
export const similar_questions = pgTable(
  "similar_questions",
  {
    id: serial().primaryKey(),
    knowledge_point_id: integer("knowledge_point_id").notNull().references(() => knowledge_points.id, { onDelete: "cascade" }),
    wrong_question_id: integer("wrong_question_id").references(() => wrong_questions.id, { onDelete: "set null" }),
    question_text: text("question_text").notNull(),
    answer: text("answer").notNull(),
    explanation: text("explanation"),
    difficulty: varchar("difficulty", { length: 16 }).default("medium").notNull(),
    is_mastered: integer("is_mastered").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sq_kp_id_idx").on(table.knowledge_point_id),
    index("sq_mastered_idx").on(table.is_mastered),
  ]
);

// 练习记录表
export const practice_records = pgTable(
  "practice_records",
  {
    id: serial().primaryKey(),
    knowledge_point_id: integer("knowledge_point_id").notNull().references(() => knowledge_points.id, { onDelete: "cascade" }),
    similar_question_id: integer("similar_question_id").references(() => similar_questions.id, { onDelete: "set null" }),
    wrong_question_id: integer("wrong_question_id").references(() => wrong_questions.id, { onDelete: "set null" }),
    user_answer: text("user_answer").notNull(),
    is_correct: integer("is_correct").notNull(),
    difficulty: varchar("difficulty", { length: 16 }),
    used_hint: integer("used_hint").default(0),
    practiced_at: timestamp("practiced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pr_kp_id_idx").on(table.knowledge_point_id),
    index("pr_correct_idx").on(table.is_correct),
    index("pr_practiced_idx").on(table.practiced_at),
  ]
);
