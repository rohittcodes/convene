CREATE TABLE "chat_messages" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"thread_id" varchar(191) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"model" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"meeting_id" varchar(191),
	"title" varchar(300),
	"created_by" varchar(191) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_api_keys" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"key_encrypted" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_recordings" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"meeting_id" varchar(191) NOT NULL,
	"egress_id" varchar(191) NOT NULL,
	"url" varchar(500),
	"status" varchar(50) DEFAULT 'recording',
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;