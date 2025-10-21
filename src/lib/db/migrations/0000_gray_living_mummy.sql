CREATE TABLE "documents" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"content" "bytea" NOT NULL,
	"file_name" varchar(300) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"user_email" varchar(191) NOT NULL,
	"shared_with" varchar(300)[]
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"document_id" varchar(191),
	"content" text NOT NULL,
	"file_name" varchar(300) NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"source_type" varchar(50) DEFAULT 'document',
	"source_metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "integration_tokens" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"integration" varchar(50) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"team_id" varchar(191),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"meeting_id" varchar(191) NOT NULL,
	"user_email" varchar(191) NOT NULL,
	"role" varchar(50) DEFAULT 'attendee',
	"joined_at" timestamp,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_transcripts" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"meeting_id" varchar(191) NOT NULL,
	"full_transcript" text NOT NULL,
	"paragraphs" jsonb,
	"utterances" jsonb,
	"recording_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"scheduled_time" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30,
	"livekit_room_name" varchar(300),
	"created_by" varchar(191) NOT NULL,
	"status" varchar(50) DEFAULT 'scheduled',
	"transcript_status" varchar(50) DEFAULT 'pending',
	"recording_status" varchar(50) DEFAULT 'idle',
	"recording_egress_id" varchar(191),
	"recording_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_livekit_room_name_unique" UNIQUE("livekit_room_name")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"project_id" varchar(191),
	"meeting_id" varchar(191),
	"created_by" varchar(191) NOT NULL,
	"tags" text[] DEFAULT '{}',
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" varchar(191) NOT NULL,
	"user_email" varchar(191) NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"description" text,
	"owner_user_id" varchar(191) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"color" varchar(7) DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'todo',
	"priority" varchar(50) DEFAULT 'medium',
	"due_date" timestamp,
	"project_id" varchar(191),
	"meeting_id" varchar(191),
	"assigned_to" varchar(191),
	"created_by" varchar(191) NOT NULL,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);