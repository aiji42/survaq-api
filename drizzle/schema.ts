import {
  pgTable,
  foreignKey,
  pgEnum,
  varchar,
  text,
  boolean,
  json,
  integer,
  uuid,
  unique,
  timestamp,
  serial,
  bigint,
  date,
  type AnyPgColumn,
  real,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const keyStatus = pgEnum("key_status", ["default", "valid", "invalid", "expired"]);
export const keyType = pgEnum("key_type", [
  "aead-ietf",
  "aead-det",
  "hmacsha512",
  "hmacsha256",
  "auth",
  "shorthash",
  "generichash",
  "kdf",
  "secretbox",
  "secretstream",
  "stream_xchacha20",
]);
export const factorType = pgEnum("factor_type", ["totp", "webauthn"]);
export const factorStatus = pgEnum("factor_status", ["unverified", "verified"]);
export const aalLevel = pgEnum("aal_level", ["aal1", "aal2", "aal3"]);
export const codeChallengeMethod = pgEnum("code_challenge_method", ["s256", "plain"]);

export const directusCollections = pgTable(
  "directus_collections",
  {
    collection: varchar("collection", { length: 64 }).primaryKey().notNull(),
    icon: varchar("icon", { length: 30 }),
    note: text("note"),
    displayTemplate: varchar("display_template", { length: 255 }),
    hidden: boolean("hidden").default(false).notNull(),
    singleton: boolean("singleton").default(false).notNull(),
    translations: json("translations"),
    archiveField: varchar("archive_field", { length: 64 }),
    archiveAppFilter: boolean("archive_app_filter").default(true).notNull(),
    archiveValue: varchar("archive_value", { length: 255 }),
    unarchiveValue: varchar("unarchive_value", { length: 255 }),
    sortField: varchar("sort_field", { length: 64 }),
    accountability: varchar("accountability", { length: 255 }).default(
      sql`'all'::character varying`,
    ),
    color: varchar("color", { length: 255 }),
    itemDuplicationFields: json("item_duplication_fields"),
    sort: integer("sort"),
    group: varchar("group", { length: 64 }),
    collapse: varchar("collapse", { length: 255 })
      .default(sql`'open'::character varying`)
      .notNull(),
  },
  (table) => {
    return {
      directusCollectionsGroupForeign: foreignKey({
        columns: [table.group],
        foreignColumns: [table.collection],
        name: "directus_collections_group_foreign",
      }),
    };
  },
);

export const directusRoles = pgTable("directus_roles", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 30 })
    .default(sql`'supervised_user_circle'::character varying`)
    .notNull(),
  description: text("description"),
  ipAccess: text("ip_access"),
  enforceTfa: boolean("enforce_tfa").default(false).notNull(),
  adminAccess: boolean("admin_access").default(false).notNull(),
  appAccess: boolean("app_access").default(true).notNull(),
});

export const directusUsers = pgTable(
  "directus_users",
  {
    id: uuid("id").primaryKey().notNull(),
    firstName: varchar("first_name", { length: 50 }),
    lastName: varchar("last_name", { length: 50 }),
    email: varchar("email", { length: 128 }),
    password: varchar("password", { length: 255 }),
    location: varchar("location", { length: 255 }),
    title: varchar("title", { length: 50 }),
    description: text("description"),
    tags: json("tags"),
    avatar: uuid("avatar"),
    language: varchar("language", { length: 255 }).default(sql`NULL::character varying`),
    theme: varchar("theme", { length: 20 }).default(sql`'auto'::character varying`),
    tfaSecret: varchar("tfa_secret", { length: 255 }),
    status: varchar("status", { length: 16 })
      .default(sql`'active'::character varying`)
      .notNull(),
    role: uuid("role").references(() => directusRoles.id, { onDelete: "set null" }),
    token: varchar("token", { length: 255 }),
    lastAccess: timestamp("last_access", { withTimezone: true, mode: "string" }),
    lastPage: varchar("last_page", { length: 255 }),
    provider: varchar("provider", { length: 128 })
      .default(sql`'default'::character varying`)
      .notNull(),
    externalIdentifier: varchar("external_identifier", { length: 255 }),
    authData: json("auth_data"),
    emailNotifications: boolean("email_notifications").default(true),
  },
  (table) => {
    return {
      directusUsersEmailUnique: unique("directus_users_email_unique").on(table.email),
      directusUsersTokenUnique: unique("directus_users_token_unique").on(table.token),
      directusUsersExternalIdentifierUnique: unique("directus_users_external_identifier_unique").on(
        table.externalIdentifier,
      ),
    };
  },
);

export const directusFields = pgTable("directus_fields", {
  id: serial("id").primaryKey().notNull(),
  collection: varchar("collection", { length: 64 }).notNull(),
  field: varchar("field", { length: 64 }).notNull(),
  special: varchar("special", { length: 64 }),
  interface: varchar("interface", { length: 64 }),
  options: json("options"),
  display: varchar("display", { length: 64 }),
  displayOptions: json("display_options"),
  readonly: boolean("readonly").default(false).notNull(),
  hidden: boolean("hidden").default(false).notNull(),
  sort: integer("sort"),
  width: varchar("width", { length: 30 }).default(sql`'full'::character varying`),
  translations: json("translations"),
  note: text("note"),
  conditions: json("conditions"),
  required: boolean("required").default(false),
  group: varchar("group", { length: 64 }),
  validation: json("validation"),
  validationMessage: text("validation_message"),
});

export const directusFiles = pgTable("directus_files", {
  id: uuid("id").primaryKey().notNull(),
  storage: varchar("storage", { length: 255 }).notNull(),
  filename_disk: varchar("filename_disk", { length: 255 }),
  filenameDownload: varchar("filename_download", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }),
  type: varchar("type", { length: 255 }),
  folder: uuid("folder").references(() => directusFolders.id, { onDelete: "set null" }),
  uploadedBy: uuid("uploaded_by").references(() => directusUsers.id),
  uploadedOn: timestamp("uploaded_on", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  modifiedBy: uuid("modified_by").references(() => directusUsers.id),
  modifiedOn: timestamp("modified_on", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  charset: varchar("charset", { length: 50 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  filesize: bigint("filesize", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  embed: varchar("embed", { length: 200 }),
  description: text("description"),
  location: text("location"),
  tags: text("tags"),
  metadata: json("metadata"),
});

export const directusActivity = pgTable("directus_activity", {
  id: serial("id").primaryKey().notNull(),
  action: varchar("action", { length: 45 }).notNull(),
  user: uuid("user"),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  ip: varchar("ip", { length: 50 }),
  userAgent: varchar("user_agent", { length: 255 }),
  collection: varchar("collection", { length: 64 }).notNull(),
  item: varchar("item", { length: 255 }).notNull(),
  comment: text("comment"),
  origin: varchar("origin", { length: 255 }),
});

export const directusFolders = pgTable(
  "directus_folders",
  {
    id: uuid("id").primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    parent: uuid("parent"),
  },
  (table) => {
    return {
      directusFoldersParentForeign: foreignKey({
        columns: [table.parent],
        foreignColumns: [table.id],
        name: "directus_folders_parent_foreign",
      }),
    };
  },
);

export const directusPermissions = pgTable("directus_permissions", {
  id: serial("id").primaryKey().notNull(),
  role: uuid("role").references(() => directusRoles.id, { onDelete: "cascade" }),
  collection: varchar("collection", { length: 64 }).notNull(),
  action: varchar("action", { length: 10 }).notNull(),
  permissions: json("permissions"),
  validation: json("validation"),
  presets: json("presets"),
  fields: text("fields"),
});

export const googleMerchantCenter = pgTable(
  "GoogleMerchantCenter",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    merchantCenterId: varchar("merchantCenterId", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    shopifyProductGroup: integer("shopifyProductGroup")
      .notNull()
      .references(() => shopifyProductGroups.id),
  },
  (table) => {
    return {
      googlemerchantcenterMerchantcenteridUnique: unique(
        "googlemerchantcenter_merchantcenterid_unique",
      ).on(table.merchantCenterId),
    };
  },
);

export const directusRevisions = pgTable(
  "directus_revisions",
  {
    id: serial("id").primaryKey().notNull(),
    activity: integer("activity")
      .notNull()
      .references(() => directusActivity.id, { onDelete: "cascade" }),
    collection: varchar("collection", { length: 64 }).notNull(),
    item: varchar("item", { length: 255 }).notNull(),
    data: json("data"),
    delta: json("delta"),
    parent: integer("parent"),
  },
  (table) => {
    return {
      directusRevisionsParentForeign: foreignKey({
        columns: [table.parent],
        foreignColumns: [table.id],
        name: "directus_revisions_parent_foreign",
      }),
    };
  },
);

export const directusSessions = pgTable("directus_sessions", {
  token: varchar("token", { length: 64 }).primaryKey().notNull(),
  user: uuid("user").references(() => directusUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "string" }).notNull(),
  ip: varchar("ip", { length: 255 }),
  userAgent: varchar("user_agent", { length: 255 }),
  share: uuid("share").references(() => directusShares.id, { onDelete: "cascade" }),
  origin: varchar("origin", { length: 255 }),
});

export const directusRelations = pgTable("directus_relations", {
  id: serial("id").primaryKey().notNull(),
  manyCollection: varchar("many_collection", { length: 64 }).notNull(),
  manyField: varchar("many_field", { length: 64 }).notNull(),
  oneCollection: varchar("one_collection", { length: 64 }),
  oneField: varchar("one_field", { length: 64 }),
  oneCollectionField: varchar("one_collection_field", { length: 64 }),
  oneAllowedCollections: text("one_allowed_collections"),
  junctionField: varchar("junction_field", { length: 64 }),
  sortField: varchar("sort_field", { length: 64 }),
  oneDeselectAction: varchar("one_deselect_action", { length: 255 })
    .default(sql`'nullify'::character varying`)
    .notNull(),
});

export const directusWebhooks = pgTable("directus_webhooks", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 })
    .default(sql`'POST'::character varying`)
    .notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 })
    .default(sql`'active'::character varying`)
    .notNull(),
  data: boolean("data").default(true).notNull(),
  actions: varchar("actions", { length: 100 }).notNull(),
  collections: varchar("collections", { length: 255 }).notNull(),
  headers: json("headers"),
});

export const transactionMails = pgTable("TransactionMails", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
  receiversResource: uuid("receiversResource").references(() => directusFiles.id, {
    onDelete: "set null",
  }),
  subject: varchar("subject", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
  body: text("body").notNull(),
  from: varchar("from", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
  fromName: varchar("fromName", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
  replyTo: varchar("replyTo", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
  log: text("log"),
  status: varchar("status", { length: 255 })
    .default(sql`'preparing'::character varying`)
    .notNull(),
  testReceiversResource: uuid("testReceiversResource").references(() => directusFiles.id, {
    onDelete: "set null",
  }),
});

export const directusMigrations = pgTable("directus_migrations", {
  version: varchar("version", { length: 255 }).primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" }).defaultNow(),
});

export const directusDashboards = pgTable("directus_dashboards", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 30 })
    .default(sql`'dashboard'::character varying`)
    .notNull(),
  note: text("note"),
  dateCreated: timestamp("date_created", { withTimezone: true, mode: "string" }).defaultNow(),
  userCreated: uuid("user_created").references(() => directusUsers.id, { onDelete: "set null" }),
  color: varchar("color", { length: 255 }),
});

export const directusPanels = pgTable("directus_panels", {
  id: uuid("id").primaryKey().notNull(),
  dashboard: uuid("dashboard")
    .notNull()
    .references(() => directusDashboards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  icon: varchar("icon", { length: 30 }).default(sql`NULL::character varying`),
  color: varchar("color", { length: 10 }),
  showHeader: boolean("show_header").default(false).notNull(),
  note: text("note"),
  type: varchar("type", { length: 255 }).notNull(),
  positionX: integer("position_x").notNull(),
  positionY: integer("position_y").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  options: json("options"),
  dateCreated: timestamp("date_created", { withTimezone: true, mode: "string" }).defaultNow(),
  userCreated: uuid("user_created").references(() => directusUsers.id, { onDelete: "set null" }),
});

export const directusSettings = pgTable("directus_settings", {
  id: serial("id").primaryKey().notNull(),
  projectName: varchar("project_name", { length: 100 })
    .default(sql`'Directus'::character varying`)
    .notNull(),
  projectUrl: varchar("project_url", { length: 255 }),
  projectColor: varchar("project_color", { length: 50 }).default(sql`NULL::character varying`),
  projectLogo: uuid("project_logo").references(() => directusFiles.id),
  publicForeground: uuid("public_foreground").references(() => directusFiles.id),
  publicBackground: uuid("public_background").references(() => directusFiles.id),
  publicNote: text("public_note"),
  authLoginAttempts: integer("auth_login_attempts").default(25),
  authPasswordPolicy: varchar("auth_password_policy", { length: 100 }),
  storageAssetTransform: varchar("storage_asset_transform", { length: 7 }).default(
    sql`'all'::character varying`,
  ),
  storageAssetPresets: json("storage_asset_presets"),
  customCss: text("custom_css"),
  storageDefaultFolder: uuid("storage_default_folder").references(() => directusFolders.id, {
    onDelete: "set null",
  }),
  basemaps: json("basemaps"),
  mapboxKey: varchar("mapbox_key", { length: 255 }),
  moduleBar: json("module_bar"),
  projectDescriptor: varchar("project_descriptor", { length: 100 }),
  translationStrings: json("translation_strings"),
  defaultLanguage: varchar("default_language", { length: 255 })
    .default(sql`'en-US'::character varying`)
    .notNull(),
  customAspectRatios: json("custom_aspect_ratios"),
});

export const directusNotifications = pgTable("directus_notifications", {
  id: serial("id").primaryKey().notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true, mode: "string" }).defaultNow(),
  status: varchar("status", { length: 255 }).default(sql`'inbox'::character varying`),
  recipient: uuid("recipient")
    .notNull()
    .references(() => directusUsers.id, { onDelete: "cascade" }),
  sender: uuid("sender").references(() => directusUsers.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message"),
  collection: varchar("collection", { length: 64 }),
  item: varchar("item", { length: 255 }),
});

export const directusShares = pgTable("directus_shares", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 255 }),
  collection: varchar("collection", { length: 64 }).references(
    () => directusCollections.collection,
    { onDelete: "cascade" },
  ),
  item: varchar("item", { length: 255 }),
  role: uuid("role").references(() => directusRoles.id, { onDelete: "cascade" }),
  password: varchar("password", { length: 255 }),
  userCreated: uuid("user_created").references(() => directusUsers.id, { onDelete: "set null" }),
  dateCreated: timestamp("date_created", { withTimezone: true, mode: "string" }).defaultNow(),
  dateStart: timestamp("date_start", { withTimezone: true, mode: "string" }),
  dateEnd: timestamp("date_end", { withTimezone: true, mode: "string" }),
  timesUsed: integer("times_used").default(0),
  maxUses: integer("max_uses"),
});

export const directusPresets = pgTable("directus_presets", {
  id: serial("id").primaryKey().notNull(),
  bookmark: varchar("bookmark", { length: 255 }),
  user: uuid("user").references(() => directusUsers.id, { onDelete: "cascade" }),
  role: uuid("role").references(() => directusRoles.id, { onDelete: "cascade" }),
  collection: varchar("collection", { length: 64 }),
  search: varchar("search", { length: 100 }),
  layout: varchar("layout", { length: 100 }).default(sql`'tabular'::character varying`),
  layoutQuery: json("layout_query"),
  layoutOptions: json("layout_options"),
  refreshInterval: integer("refresh_interval"),
  filter: json("filter"),
  icon: varchar("icon", { length: 30 }).default(sql`'bookmark'::character varying`),
  color: varchar("color", { length: 255 }),
});

export const directusFlows = pgTable(
  "directus_flows",
  {
    id: uuid("id").primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    icon: varchar("icon", { length: 30 }),
    color: varchar("color", { length: 255 }),
    description: text("description"),
    status: varchar("status", { length: 255 })
      .default(sql`'active'::character varying`)
      .notNull(),
    trigger: varchar("trigger", { length: 255 }),
    accountability: varchar("accountability", { length: 255 }).default(
      sql`'all'::character varying`,
    ),
    options: json("options"),
    operation: uuid("operation"),
    dateCreated: timestamp("date_created", { withTimezone: true, mode: "string" }).defaultNow(),
    userCreated: uuid("user_created").references(() => directusUsers.id, { onDelete: "set null" }),
  },
  (table) => {
    return {
      directusFlowsOperationUnique: unique("directus_flows_operation_unique").on(table.operation),
    };
  },
);

export const directusOperations = pgTable(
  "directus_operations",
  {
    id: uuid("id").primaryKey().notNull(),
    name: varchar("name", { length: 255 }),
    key: varchar("key", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    positionX: integer("position_x").notNull(),
    positionY: integer("position_y").notNull(),
    options: json("options"),
    resolve: uuid("resolve"),
    reject: uuid("reject"),
    flow: uuid("flow")
      .notNull()
      .references(() => directusFlows.id, { onDelete: "cascade" }),
    dateCreated: timestamp("date_created", { withTimezone: true, mode: "string" }).defaultNow(),
    userCreated: uuid("user_created").references(() => directusUsers.id, { onDelete: "set null" }),
  },
  (table) => {
    return {
      directusOperationsRejectForeign: foreignKey({
        columns: [table.reject],
        foreignColumns: [table.id],
        name: "directus_operations_reject_foreign",
      }),
      directusOperationsResolveForeign: foreignKey({
        columns: [table.resolve],
        foreignColumns: [table.id],
        name: "directus_operations_resolve_foreign",
      }),
      directusOperationsResolveUnique: unique("directus_operations_resolve_unique").on(
        table.resolve,
      ),
      directusOperationsRejectUnique: unique("directus_operations_reject_unique").on(table.reject),
    };
  },
);

export const shopifyProductGroups = pgTable(
  "ShopifyProductGroups",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    title: varchar("title", { length: 255 }).default(sql`NULL::character varying`),
  },
  (table) => {
    return {
      shopifyproductgroupsTitleUnique: unique("shopifyproductgroups_title_unique").on(table.title),
    };
  },
);

export const facebookAdsBudget = pgTable("FacebookAdsBudget", {
  id: uuid("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
  strategy: json("strategy").default([
    { beginRoas: 0, endRoas: 2, ratio: 0.8 },
    { beginRoas: 2, endRoas: 3, ratio: 1 },
    { beginRoas: 3, endRoas: null, ratio: 1.2 },
  ]),
  active: boolean("active").default(true),
  intervalDays: integer("intervalDays").default(3).notNull(),
  title: varchar("title", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
});

export const shopifyVariants = pgTable(
  "ShopifyVariants",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    product: integer("product").references(() => shopifyProducts.id, { onDelete: "cascade" }),
    variantName: varchar("variantName", { length: 255 }).notNull(),
    customSelects: integer("customSelects").default(0),
    variantId: varchar("variantId", { length: 255 }).notNull(),
    skuLabel: varchar("skuLabel", { length: 255 }),
    skusJson: varchar("skusJSON", { length: 255 }).default(sql`NULL::character varying`),
  },
  (table) => {
    return {
      shopifyvariantsVariantidUnique: unique("shopifyvariants_variantid_unique").on(
        table.variantId,
      ),
    };
  },
);

export const facebookAdSets = pgTable("FacebookAdSets", {
  id: uuid("id").primaryKey().notNull(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
  setId: varchar("setId", { length: 255 }).notNull(),
  setName: varchar("setName", { length: 255 })
    .default(sql`NULL::character varying`)
    .notNull(),
});

export const shopifyInventoryOrders = pgTable("ShopifyInventoryOrders", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
  name: varchar("name", { length: 255 }).notNull(),
  orderedDate: date("orderedDate").notNull(),
  shippingDate: date("shippingDate").notNull(),
  receivingDate: date("receivingDate").notNull(),
  deliveryDate: date("deliveryDate").notNull(),
  deliverySchedule: varchar("deliverySchedule", { length: 255 }).default(
    sql`NULL::character varying`,
  ),
  note: text("note"),
  status: varchar("status", { length: 255 }).default(sql`NULL::character varying`),
});

export const shopifyCustomSkUs = pgTable(
  "ShopifyCustomSKUs",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    code: varchar("code", { length: 255 })
      .default(sql`NULL::character varying`)
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    subName: varchar("subName", { length: 255 }),
    inventory: integer("inventory").default(0).notNull(),
    unshippedOrderCount: integer("unshippedOrderCount").default(0).notNull(),
    lastSyncedAt: timestamp("lastSyncedAt", { mode: "string" }),
    stockBuffer: integer("stockBuffer").default(5),
    skipDeliveryCalc: boolean("skipDeliveryCalc").default(false),
    displayName: varchar("displayName", { length: 255 }),
    sortNumber: integer("sortNumber").default(0).notNull(),
    currentInventoryOrderSkuId: integer("currentInventoryOrderSKUId").references(
      (): AnyPgColumn => shopifyInventoryOrderSkUs.id,
      { onDelete: "set null" },
    ),
    faultyRate: real("faultyRate").notNull(),
  },
  (table) => {
    return {
      shopifycustomskusCodeUnique: unique("shopifycustomskus_code_unique").on(table.code),
    };
  },
);

export const shopifyInventoryOrderSkUs = pgTable("ShopifyInventoryOrderSKUs", {
  id: serial("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
  skuId: integer("skuId").references((): AnyPgColumn => shopifyCustomSkUs.id, {
    onDelete: "set null",
  }),
  quantity: integer("quantity").default(0).notNull(),
  heldQuantity: integer("heldQuantity").default(0).notNull(),
  inventoryOrderId: integer("inventoryOrderId")
    .notNull()
    .references(() => shopifyInventoryOrders.id),
});

export const shopifyVariantsShopifyCustomSkUs = pgTable("ShopifyVariants_ShopifyCustomSKUs", {
  id: serial("id").primaryKey().notNull(),
  shopifyVariantsId: integer("ShopifyVariants_id").references(() => shopifyVariants.id, {
    onDelete: "cascade",
  }),
  shopifyCustomSkUsId: integer("ShopifyCustomSKUs_id").references(() => shopifyCustomSkUs.id),
  sort: integer("sort"),
});

export const facebookAdAlerts = pgTable("FacebookAdAlerts", {
  id: uuid("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
  title: varchar("title", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 255 }),
  rule: json("rule").default([]),
  active: boolean("active").default(true).notNull(),
  dayOfWeek: json("dayOfWeek").default(["1", "2", "3", "4", "5"]),
  level: varchar("level", { length: 255 })
    .default(sql`'good'::character varying`)
    .notNull(),
  rule2: json("rule2").default([]),
  level2: varchar("level2", { length: 255 })
    .default(sql`'good'::character varying`)
    .notNull(),
  rule3: json("rule3").default([]),
  level3: varchar("level3", { length: 255 })
    .default(sql`'good'::character varying`)
    .notNull(),
});

export const facebookAdAlertsFacebookAdSets = pgTable("FacebookAdAlerts_FacebookAdSets", {
  id: serial("id").primaryKey().notNull(),
  facebookAdAlertsId: uuid("FacebookAdAlerts_id").references(() => facebookAdAlerts.id, {
    onDelete: "cascade",
  }),
  facebookAdSetsId: uuid("FacebookAdSets_id").references(() => facebookAdSets.id, {
    onDelete: "cascade",
  }),
});

export const facebookAdsBudgetFacebookAdSets = pgTable("FacebookAdsBudget_FacebookAdSets", {
  id: serial("id").primaryKey().notNull(),
  facebookAdsBudgetId: uuid("FacebookAdsBudget_id").references(() => facebookAdsBudget.id, {
    onDelete: "cascade",
  }),
  facebookAdSetsId: uuid("FacebookAdSets_id").references(() => facebookAdSets.id, {
    onDelete: "cascade",
  }),
});

export const shopifyPages = pgTable(
  "ShopifyPages",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    customHead: text("customHead"),
    customBody: varchar("customBody", { length: 255 }),
    product: integer("product")
      .notNull()
      .references(() => shopifyProducts.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull(),
    ogpImageUrl: varchar("ogpImageUrl", { length: 255 }),
    ogpShortTitle: varchar("ogpShortTitle", { length: 20 }),
    buyButton: boolean("buyButton").default(true).notNull(),
    pathname: varchar("pathname", { length: 255 }).notNull(),
    body: text("body"),
    logo: uuid("logo").references(() => directusFiles.id, { onDelete: "set null" }),
    favicon: uuid("favicon").references(() => directusFiles.id, { onDelete: "set null" }),
  },
  (table) => {
    return {
      shopifypagesPathnameUnique: unique("shopifypages_pathname_unique").on(table.pathname),
    };
  },
);

export const shopifyProducts = pgTable(
  "ShopifyProducts",
  {
    id: serial("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }),
    productName: varchar("productName", { length: 255 }).notNull(),
    productId: varchar("productId", { length: 255 }).notNull(),
    productGroupId: integer("productGroupId").references(() => shopifyProductGroups.id),
  },
  (table) => {
    return {
      shopifyproductsProductidUnique: unique("shopifyproducts_productid_unique").on(
        table.productId,
      ),
    };
  },
);
