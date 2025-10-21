import { sql } from 'drizzle-orm';
import { text, varchar, timestamp, pgTable, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { nanoid } from '@/lib/utils/nano-id';

export const meetings = pgTable('meetings', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  scheduled_time: timestamp('scheduled_time').notNull(),
  duration_minutes: integer('duration_minutes').default(30),
  livekit_room_name: varchar('livekit_room_name', { length: 300 }).unique(),
  created_by: varchar('created_by', { length: 191 }).notNull(),
  status: varchar('status', { length: 50 }).default('scheduled'), // scheduled, in_progress, completed, cancelled
  transcript_status: varchar('transcript_status', { length: 50 }).default('pending'), // pending, processing, completed, failed
  recording_status: varchar('recording_status', { length: 50 }).default('idle'), // idle, recording, stopping, completed, failed
  recording_egress_id: varchar('recording_egress_id', { length: 191 }),
  recording_url: varchar('recording_url', { length: 500 }),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
});

export const meetingParticipants = pgTable('meeting_participants', {
  meeting_id: varchar('meeting_id', { length: 191 })
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  user_email: varchar('user_email', { length: 191 }).notNull(),
  role: varchar('role', { length: 50 }).default('attendee'), // host, attendee
  joined_at: timestamp('joined_at'),
  left_at: timestamp('left_at'),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
});

export const meetingTranscripts = pgTable('meeting_transcripts', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  meeting_id: varchar('meeting_id', { length: 191 })
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  full_transcript: text('full_transcript').notNull(),
  paragraphs: jsonb('paragraphs'), // Array of paragraphs with speaker labels
  utterances: jsonb('utterances'), // Individual speaker turns
  recording_url: varchar('recording_url', { length: 500 }),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
});

export const meetingRecordings = pgTable('meeting_recordings', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  meeting_id: varchar('meeting_id', { length: 191 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  egress_id: varchar('egress_id', { length: 191 }).notNull(),
  url: varchar('url', { length: 500 }),
  status: varchar('status', { length: 50 }).default('recording'), // recording, completed, failed
  started_at: timestamp('started_at'),
  ended_at: timestamp('ended_at'),
  created_at: timestamp('created_at').notNull().default(sql`now()`),
});

export const projects = pgTable('projects', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  owner_user_id: varchar('owner_user_id', { length: 191 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'), // active, archived, completed
  color: varchar('color', { length: 7 }).default('#3b82f6'),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
});

export const projectMembers = pgTable('project_members', {
  project_id: varchar('project_id', { length: 191 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  user_email: varchar('user_email', { length: 191 }).notNull(),
  role: varchar('role', { length: 50 }).default('member'), // owner, member, viewer
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
});

export const tasks = pgTable('tasks', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('todo'), // todo, in_progress, done, blocked
  priority: varchar('priority', { length: 50 }).default('medium'), // low, medium, high, urgent
  due_date: timestamp('due_date'),
  project_id: varchar('project_id', { length: 191 }).references(() => projects.id, { onDelete: 'set null' }),
  meeting_id: varchar('meeting_id', { length: 191 }).references(() => meetings.id, { onDelete: 'set null' }),
  assigned_to: varchar('assigned_to', { length: 191 }),
  created_by: varchar('created_by', { length: 191 }).notNull(),
  tags: text('tags').array().default([]),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
});

export const notes = pgTable('notes', {
  id: varchar('id', { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  project_id: varchar('project_id', { length: 191 }).references(() => projects.id, { onDelete: 'set null' }),
  meeting_id: varchar('meeting_id', { length: 191 }).references(() => meetings.id, { onDelete: 'set null' }),
  created_by: varchar('created_by', { length: 191 }).notNull(),
  tags: text('tags').array().default([]),
  is_private: boolean('is_private').default(false),
  created_at: timestamp('created_at')
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at')
    .notNull()
    .default(sql`now()`),
});

// Schemas for validation
export const meetingSchema = createSelectSchema(meetings);
export const meetingParticipantSchema = createSelectSchema(meetingParticipants);
export const meetingTranscriptSchema = createSelectSchema(meetingTranscripts);
export const projectSchema = createSelectSchema(projects);
export const projectMemberSchema = createSelectSchema(projectMembers);
export const taskSchema = createSelectSchema(tasks);
export const noteSchema = createSelectSchema(notes);

// Insert schemas (omit auto-generated fields)
export const insertMeetingSchema = meetingSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertMeetingParticipantSchema = meetingParticipantSchema.omit({
  created_at: true,
});

export const insertMeetingTranscriptSchema = meetingTranscriptSchema.omit({
  id: true,
  created_at: true,
});

export const insertProjectSchema = projectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertProjectMemberSchema = projectMemberSchema.omit({
  created_at: true,
});

export const insertTaskSchema = taskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertNoteSchema = noteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types
export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingParticipant = z.infer<typeof meetingParticipantSchema>;
export type MeetingTranscript = z.infer<typeof meetingTranscriptSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Note = z.infer<typeof noteSchema>;

export type NewMeeting = z.infer<typeof insertMeetingSchema>;
export type NewMeetingParticipant = z.infer<typeof insertMeetingParticipantSchema>;
export type NewMeetingTranscript = z.infer<typeof insertMeetingTranscriptSchema>;
export type NewProject = z.infer<typeof insertProjectSchema>;
export type NewProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type NewTask = z.infer<typeof insertTaskSchema>;
export type NewNote = z.infer<typeof insertNoteSchema>;

