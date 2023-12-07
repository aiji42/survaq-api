-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
DO $$ BEGIN
 CREATE TYPE "key_status" AS ENUM('expired', 'invalid', 'valid', 'default');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "key_type" AS ENUM('stream_xchacha20', 'secretstream', 'secretbox', 'kdf', 'generichash', 'shorthash', 'auth', 'hmacsha256', 'hmacsha512', 'aead-det', 'aead-ietf');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "code_challenge_method" AS ENUM('plain', 's256');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "factor_type" AS ENUM('webauthn', 'totp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "factor_status" AS ENUM('verified', 'unverified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "aal_level" AS ENUM('aal3', 'aal2', 'aal1');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_collections" (
	"collection" varchar(64) PRIMARY KEY NOT NULL,
	"icon" varchar(30),
	"note" text,
	"display_template" varchar(255),
	"hidden" boolean DEFAULT false NOT NULL,
	"singleton" boolean DEFAULT false NOT NULL,
	"translations" json,
	"archive_field" varchar(64),
	"archive_app_filter" boolean DEFAULT true NOT NULL,
	"archive_value" varchar(255),
	"unarchive_value" varchar(255),
	"sort_field" varchar(64),
	"accountability" varchar(255) DEFAULT 'all'::character varying,
	"color" varchar(255),
	"item_duplication_fields" json,
	"sort" integer,
	"group" varchar(64),
	"collapse" varchar(255) DEFAULT 'open'::character varying NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(30) DEFAULT 'supervised_user_circle'::character varying NOT NULL,
	"description" text,
	"ip_access" text,
	"enforce_tfa" boolean DEFAULT false NOT NULL,
	"admin_access" boolean DEFAULT false NOT NULL,
	"app_access" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(50),
	"last_name" varchar(50),
	"email" varchar(128),
	"password" varchar(255),
	"location" varchar(255),
	"title" varchar(50),
	"description" text,
	"tags" json,
	"avatar" uuid,
	"language" varchar(255) DEFAULT NULL::character varying,
	"theme" varchar(20) DEFAULT 'auto'::character varying,
	"tfa_secret" varchar(255),
	"status" varchar(16) DEFAULT 'active'::character varying NOT NULL,
	"role" uuid,
	"token" varchar(255),
	"last_access" timestamp with time zone,
	"last_page" varchar(255),
	"provider" varchar(128) DEFAULT 'default'::character varying NOT NULL,
	"external_identifier" varchar(255),
	"auth_data" json,
	"email_notifications" boolean DEFAULT true,
	CONSTRAINT "directus_users_email_unique" UNIQUE("email"),
	CONSTRAINT "directus_users_token_unique" UNIQUE("token"),
	CONSTRAINT "directus_users_external_identifier_unique" UNIQUE("external_identifier")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection" varchar(64) NOT NULL,
	"field" varchar(64) NOT NULL,
	"special" varchar(64),
	"interface" varchar(64),
	"options" json,
	"display" varchar(64),
	"display_options" json,
	"readonly" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"sort" integer,
	"width" varchar(30) DEFAULT 'full'::character varying,
	"translations" json,
	"note" text,
	"conditions" json,
	"required" boolean DEFAULT false,
	"group" varchar(64),
	"validation" json,
	"validation_message" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"storage" varchar(255) NOT NULL,
	"filename_disk" varchar(255),
	"filename_download" varchar(255) NOT NULL,
	"title" varchar(255),
	"type" varchar(255),
	"folder" uuid,
	"uploaded_by" uuid,
	"uploaded_on" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"modified_by" uuid,
	"modified_on" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"charset" varchar(50),
	"filesize" bigint,
	"width" integer,
	"height" integer,
	"duration" integer,
	"embed" varchar(200),
	"description" text,
	"location" text,
	"tags" text,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(45) NOT NULL,
	"user" uuid,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ip" varchar(50),
	"user_agent" varchar(255),
	"collection" varchar(64) NOT NULL,
	"item" varchar(255) NOT NULL,
	"comment" text,
	"origin" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" uuid,
	"collection" varchar(64) NOT NULL,
	"action" varchar(10) NOT NULL,
	"permissions" json,
	"validation" json,
	"presets" json,
	"fields" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "GoogleMerchantCenter" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"merchantCenterId" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"shopifyProductGroup" integer NOT NULL,
	CONSTRAINT "googlemerchantcenter_merchantcenterid_unique" UNIQUE("merchantCenterId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity" integer NOT NULL,
	"collection" varchar(64) NOT NULL,
	"item" varchar(255) NOT NULL,
	"data" json,
	"delta" json,
	"parent" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_sessions" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"user" uuid,
	"expires" timestamp with time zone NOT NULL,
	"ip" varchar(255),
	"user_agent" varchar(255),
	"share" uuid,
	"origin" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"many_collection" varchar(64) NOT NULL,
	"many_field" varchar(64) NOT NULL,
	"one_collection" varchar(64),
	"one_field" varchar(64),
	"one_collection_field" varchar(64),
	"one_allowed_collections" text,
	"junction_field" varchar(64),
	"sort_field" varchar(64),
	"one_deselect_action" varchar(255) DEFAULT 'nullify'::character varying NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"method" varchar(10) DEFAULT 'POST'::character varying NOT NULL,
	"url" varchar(255) NOT NULL,
	"status" varchar(10) DEFAULT 'active'::character varying NOT NULL,
	"data" boolean DEFAULT true NOT NULL,
	"actions" varchar(100) NOT NULL,
	"collections" varchar(255) NOT NULL,
	"headers" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_migrations" (
	"version" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_dashboards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(30) DEFAULT 'dashboard'::character varying NOT NULL,
	"note" text,
	"date_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"user_created" uuid,
	"color" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_panels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dashboard" uuid NOT NULL,
	"name" varchar(255),
	"icon" varchar(30) DEFAULT NULL::character varying,
	"color" varchar(10),
	"show_header" boolean DEFAULT false NOT NULL,
	"note" text,
	"type" varchar(255) NOT NULL,
	"position_x" integer NOT NULL,
	"position_y" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"options" json,
	"date_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"user_created" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_name" varchar(100) DEFAULT 'Directus'::character varying NOT NULL,
	"project_url" varchar(255),
	"project_color" varchar(50) DEFAULT NULL::character varying,
	"project_logo" uuid,
	"public_foreground" uuid,
	"public_background" uuid,
	"public_note" text,
	"auth_login_attempts" integer DEFAULT 25,
	"auth_password_policy" varchar(100),
	"storage_asset_transform" varchar(7) DEFAULT 'all'::character varying,
	"storage_asset_presets" json,
	"custom_css" text,
	"storage_default_folder" uuid,
	"basemaps" json,
	"mapbox_key" varchar(255),
	"module_bar" json,
	"project_descriptor" varchar(100),
	"translation_strings" json,
	"default_language" varchar(255) DEFAULT 'en-US'::character varying NOT NULL,
	"custom_aspect_ratios" json
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"status" varchar(255) DEFAULT 'inbox'::character varying,
	"recipient" uuid NOT NULL,
	"sender" uuid,
	"subject" varchar(255) NOT NULL,
	"message" text,
	"collection" varchar(64),
	"item" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"collection" varchar(64),
	"item" varchar(255),
	"role" uuid,
	"password" varchar(255),
	"user_created" uuid,
	"date_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"date_start" timestamp with time zone,
	"date_end" timestamp with time zone,
	"times_used" integer DEFAULT 0,
	"max_uses" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookmark" varchar(255),
	"user" uuid,
	"role" uuid,
	"collection" varchar(64),
	"search" varchar(100),
	"layout" varchar(100) DEFAULT 'tabular'::character varying,
	"layout_query" json,
	"layout_options" json,
	"refresh_interval" integer,
	"filter" json,
	"icon" varchar(30) DEFAULT 'bookmark'::character varying,
	"color" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_flows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(30),
	"color" varchar(255),
	"description" text,
	"status" varchar(255) DEFAULT 'active'::character varying NOT NULL,
	"trigger" varchar(255),
	"accountability" varchar(255) DEFAULT 'all'::character varying,
	"options" json,
	"operation" uuid,
	"date_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"user_created" uuid,
	CONSTRAINT "directus_flows_operation_unique" UNIQUE("operation")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directus_operations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"key" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"position_x" integer NOT NULL,
	"position_y" integer NOT NULL,
	"options" json,
	"resolve" uuid,
	"reject" uuid,
	"flow" uuid NOT NULL,
	"date_created" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"user_created" uuid,
	CONSTRAINT "directus_operations_resolve_unique" UNIQUE("resolve"),
	CONSTRAINT "directus_operations_reject_unique" UNIQUE("reject")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyProductGroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"totalPrice" integer DEFAULT 0,
	"realTotalPrice" integer DEFAULT 0 NOT NULL,
	"supporters" integer DEFAULT 0,
	"closeOn" date NOT NULL,
	"realSupporters" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) DEFAULT NULL::character varying,
	"deliverySchedule" varchar(255) DEFAULT NULL::character varying,
	CONSTRAINT "shopifyproductgroups_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FacebookAdsBudget" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"strategy" json DEFAULT '[{"beginRoas":0,"endRoas":2,"ratio":0.8},{"beginRoas":2,"endRoas":3,"ratio":1},{"beginRoas":3,"endRoas":null,"ratio":1.2}]'::json,
	"active" boolean DEFAULT true,
	"intervalDays" integer DEFAULT 3 NOT NULL,
	"title" varchar(255) DEFAULT NULL::character varying NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyVariants" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"product" integer,
	"variantName" varchar(255) NOT NULL,
	"customSelects" integer DEFAULT 0,
	"variantId" varchar(255) NOT NULL,
	"deliverySchedule" varchar(255) DEFAULT NULL::character varying,
	"skuLabel" varchar(255),
	"skusJSON" varchar(255) DEFAULT NULL::character varying,
	CONSTRAINT "shopifyvariants_variantid_unique" UNIQUE("variantId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FacebookAdSets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"accountName" varchar(255) DEFAULT NULL::character varying NOT NULL,
	"setId" varchar(255) NOT NULL,
	"setName" varchar(255) DEFAULT NULL::character varying NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyInventoryOrders" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"name" varchar(255) NOT NULL,
	"orderedDate" date NOT NULL,
	"shippingDate" date NOT NULL,
	"receivingDate" date NOT NULL,
	"deliveryDate" date NOT NULL,
	"deliverySchedule" varchar(255) DEFAULT NULL::character varying,
	"note" text,
	"status" varchar(255) DEFAULT NULL::character varying
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyCustomSKUs" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"code" varchar(255) DEFAULT NULL::character varying NOT NULL,
	"name" varchar(255) NOT NULL,
	"subName" varchar(255),
	"deliverySchedule" varchar(255) DEFAULT NULL::character varying,
	"inventory" integer DEFAULT 0 NOT NULL,
	"incomingStockQtyA" integer,
	"incomingStockDateA" date,
	"incomingStockQtyB" integer,
	"incomingStockQtyC" integer,
	"incomingStockDateB" date,
	"incomingStockDateC" date,
	"availableStock" varchar(255) DEFAULT 'REAL'::character varying NOT NULL,
	"unshippedOrderCount" integer DEFAULT 0 NOT NULL,
	"lastSyncedAt" timestamp,
	"stockBuffer" integer DEFAULT 5,
	"incomingStockDeliveryScheduleA" varchar(255) DEFAULT NULL::character varying,
	"incomingStockDeliveryScheduleB" varchar(255) DEFAULT NULL::character varying,
	"incomingStockDeliveryScheduleC" varchar(255) DEFAULT NULL::character varying,
	"skipDeliveryCalc" boolean DEFAULT false,
	"displayName" varchar(255),
	"sortNumber" integer DEFAULT 0 NOT NULL,
	"currentInventoryOrderSKUId" integer,
	CONSTRAINT "shopifycustomskus_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyInventoryOrderSKUs" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"skuId" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"heldQuantity" integer DEFAULT 0 NOT NULL,
	"inventoryOrderId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyVariants_ShopifyCustomSKUs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ShopifyVariants_id" integer,
	"ShopifyCustomSKUs_id" integer,
	"sort" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FacebookAdAlerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"title" varchar(255) NOT NULL,
	"channel" varchar(255),
	"rule" json DEFAULT '[]'::json,
	"active" boolean DEFAULT true NOT NULL,
	"dayOfWeek" json DEFAULT '["1","2","3","4","5"]'::json,
	"level" varchar(255) DEFAULT 'good'::character varying NOT NULL,
	"rule2" json DEFAULT '[]'::json,
	"level2" varchar(255) DEFAULT 'good'::character varying NOT NULL,
	"rule3" json DEFAULT '[]'::json,
	"level3" varchar(255) DEFAULT 'good'::character varying NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FacebookAdAlerts_FacebookAdSets" (
	"id" serial PRIMARY KEY NOT NULL,
	"FacebookAdAlerts_id" uuid,
	"FacebookAdSets_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FacebookAdsBudget_FacebookAdSets" (
	"id" serial PRIMARY KEY NOT NULL,
	"FacebookAdsBudget_id" uuid,
	"FacebookAdSets_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyPages" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"title" varchar(255),
	"description" text,
	"customHead" text,
	"customBody" varchar(255),
	"product" integer NOT NULL,
	"domain" varchar(255) NOT NULL,
	"ogpImageUrl" varchar(255),
	"ogpShortTitle" varchar(20),
	"buyButton" boolean DEFAULT true NOT NULL,
	"pathname" varchar(255) NOT NULL,
	"body" text,
	"logo" uuid,
	"favicon" uuid,
	CONSTRAINT "shopifypages_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ShopifyProducts" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone,
	"productName" varchar(255) NOT NULL,
	"productId" varchar(255) NOT NULL,
	"productGroupId" integer,
	CONSTRAINT "shopifyproducts_productid_unique" UNIQUE("productId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_collections" ADD CONSTRAINT "directus_collections_group_foreign" FOREIGN KEY ("group") REFERENCES "directus_collections"("collection") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_users" ADD CONSTRAINT "directus_users_role_foreign" FOREIGN KEY ("role") REFERENCES "directus_roles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_files" ADD CONSTRAINT "directus_files_folder_foreign" FOREIGN KEY ("folder") REFERENCES "directus_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_files" ADD CONSTRAINT "directus_files_modified_by_foreign" FOREIGN KEY ("modified_by") REFERENCES "directus_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_files" ADD CONSTRAINT "directus_files_uploaded_by_foreign" FOREIGN KEY ("uploaded_by") REFERENCES "directus_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_folders" ADD CONSTRAINT "directus_folders_parent_foreign" FOREIGN KEY ("parent") REFERENCES "directus_folders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_permissions" ADD CONSTRAINT "directus_permissions_role_foreign" FOREIGN KEY ("role") REFERENCES "directus_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GoogleMerchantCenter" ADD CONSTRAINT "googlemerchantcenter_shopifyproductgroup_foreign" FOREIGN KEY ("shopifyProductGroup") REFERENCES "ShopifyProductGroups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_revisions" ADD CONSTRAINT "directus_revisions_activity_foreign" FOREIGN KEY ("activity") REFERENCES "directus_activity"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_revisions" ADD CONSTRAINT "directus_revisions_parent_foreign" FOREIGN KEY ("parent") REFERENCES "directus_revisions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_sessions" ADD CONSTRAINT "directus_sessions_share_foreign" FOREIGN KEY ("share") REFERENCES "directus_shares"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_sessions" ADD CONSTRAINT "directus_sessions_user_foreign" FOREIGN KEY ("user") REFERENCES "directus_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_dashboards" ADD CONSTRAINT "directus_dashboards_user_created_foreign" FOREIGN KEY ("user_created") REFERENCES "directus_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_panels" ADD CONSTRAINT "directus_panels_dashboard_foreign" FOREIGN KEY ("dashboard") REFERENCES "directus_dashboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_panels" ADD CONSTRAINT "directus_panels_user_created_foreign" FOREIGN KEY ("user_created") REFERENCES "directus_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_settings" ADD CONSTRAINT "directus_settings_project_logo_foreign" FOREIGN KEY ("project_logo") REFERENCES "directus_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_settings" ADD CONSTRAINT "directus_settings_public_background_foreign" FOREIGN KEY ("public_background") REFERENCES "directus_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_settings" ADD CONSTRAINT "directus_settings_public_foreground_foreign" FOREIGN KEY ("public_foreground") REFERENCES "directus_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_settings" ADD CONSTRAINT "directus_settings_storage_default_folder_foreign" FOREIGN KEY ("storage_default_folder") REFERENCES "directus_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_notifications" ADD CONSTRAINT "directus_notifications_recipient_foreign" FOREIGN KEY ("recipient") REFERENCES "directus_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_notifications" ADD CONSTRAINT "directus_notifications_sender_foreign" FOREIGN KEY ("sender") REFERENCES "directus_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_shares" ADD CONSTRAINT "directus_shares_collection_foreign" FOREIGN KEY ("collection") REFERENCES "directus_collections"("collection") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_shares" ADD CONSTRAINT "directus_shares_role_foreign" FOREIGN KEY ("role") REFERENCES "directus_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_shares" ADD CONSTRAINT "directus_shares_user_created_foreign" FOREIGN KEY ("user_created") REFERENCES "directus_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_presets" ADD CONSTRAINT "directus_presets_role_foreign" FOREIGN KEY ("role") REFERENCES "directus_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_presets" ADD CONSTRAINT "directus_presets_user_foreign" FOREIGN KEY ("user") REFERENCES "directus_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_flows" ADD CONSTRAINT "directus_flows_user_created_foreign" FOREIGN KEY ("user_created") REFERENCES "directus_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_operations" ADD CONSTRAINT "directus_operations_flow_foreign" FOREIGN KEY ("flow") REFERENCES "directus_flows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_operations" ADD CONSTRAINT "directus_operations_reject_foreign" FOREIGN KEY ("reject") REFERENCES "directus_operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_operations" ADD CONSTRAINT "directus_operations_resolve_foreign" FOREIGN KEY ("resolve") REFERENCES "directus_operations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directus_operations" ADD CONSTRAINT "directus_operations_user_created_foreign" FOREIGN KEY ("user_created") REFERENCES "directus_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyVariants" ADD CONSTRAINT "shopifyvariants_product_foreign" FOREIGN KEY ("product") REFERENCES "ShopifyProducts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyCustomSKUs" ADD CONSTRAINT "shopifycustomskus_currentinventoryorderskuid_foreign" FOREIGN KEY ("currentInventoryOrderSKUId") REFERENCES "ShopifyInventoryOrderSKUs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyInventoryOrderSKUs" ADD CONSTRAINT "shopifyinventoryorderskus_inventoryorderid_foreign" FOREIGN KEY ("inventoryOrderId") REFERENCES "ShopifyInventoryOrders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyInventoryOrderSKUs" ADD CONSTRAINT "shopifyinventoryorderskus_skuid_foreign" FOREIGN KEY ("skuId") REFERENCES "ShopifyCustomSKUs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyVariants_ShopifyCustomSKUs" ADD CONSTRAINT "shopifyvariants_shopifycustomskus_shopifycus__a6179f_foreign" FOREIGN KEY ("ShopifyCustomSKUs_id") REFERENCES "ShopifyCustomSKUs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyVariants_ShopifyCustomSKUs" ADD CONSTRAINT "shopifyvariants_shopifycustomskus_shopifyvariants_id_foreign" FOREIGN KEY ("ShopifyVariants_id") REFERENCES "ShopifyVariants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FacebookAdAlerts_FacebookAdSets" ADD CONSTRAINT "facebookadalerts_facebookadsets_facebookadalerts_id_foreign" FOREIGN KEY ("FacebookAdAlerts_id") REFERENCES "FacebookAdAlerts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FacebookAdAlerts_FacebookAdSets" ADD CONSTRAINT "facebookadalerts_facebookadsets_facebookadsets_id_foreign" FOREIGN KEY ("FacebookAdSets_id") REFERENCES "FacebookAdSets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FacebookAdsBudget_FacebookAdSets" ADD CONSTRAINT "facebookadsbudget_facebookadsets_facebooka__4e5f3f6b_foreign" FOREIGN KEY ("FacebookAdsBudget_id") REFERENCES "FacebookAdsBudget"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FacebookAdsBudget_FacebookAdSets" ADD CONSTRAINT "facebookadsbudget_facebookadsets_facebookadsets_id_foreign" FOREIGN KEY ("FacebookAdSets_id") REFERENCES "FacebookAdSets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyPages" ADD CONSTRAINT "shopifypages_favicon_foreign" FOREIGN KEY ("favicon") REFERENCES "directus_files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyPages" ADD CONSTRAINT "shopifypages_logo_foreign" FOREIGN KEY ("logo") REFERENCES "directus_files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyPages" ADD CONSTRAINT "shopifypages_product_foreign" FOREIGN KEY ("product") REFERENCES "ShopifyProducts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ShopifyProducts" ADD CONSTRAINT "shopifyproducts_productgroupid_foreign" FOREIGN KEY ("productGroupId") REFERENCES "ShopifyProductGroups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

*/