import { JSONSerializableObject } from "./utils";

export interface EmailJSON {
  email: string;
  name?: string;
}

export interface MailContent {
  type: string;
  value: string;
}

export interface PersonalizationJSON {
  to: EmailJSON | EmailJSON[];
  from?: EmailJSON;
  cc?: EmailJSON[];
  bcc?: EmailJSON[];
  headers?: { [key: string]: string };
  substitutions?: { [key: string]: string };
  dynamic_template_data?: JSONSerializableObject;
  custom_args?: { [key: string]: string };
  subject?: string;
  send_at?: number;
}

export interface AttachmentJSON {
  content: string;
  filename: string;
  type?: string;
  disposition?: string;
  content_id?: string;
}

export interface MailSettingsJSON {
  bcc?: {
    enable?: boolean;
    email?: string;
  };
  bypass_list_management?: {
    enable?: boolean;
  };
  footer?: {
    enable?: boolean;
    text?: string;
    html?: string;
  };
  sandbox_mode?: {
    enable?: boolean;
  };
  spam_check?: {
    enable?: boolean;
    threshold?: number;
    post_to_url?: string;
  };
}

export interface TrackingSettingsJSON {
  click_tracking?: {
    enable?: boolean;
    enable_text?: boolean;
  };
  open_tracking?: {
    enable?: boolean;
    substitution_tag?: string;
  };
  subscription_tracking?: {
    enable?: boolean;
    text?: string;
    html?: string;
    substitution_tag?: string;
  };
  ganalytics?: {
    enable?: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_term?: string;
    utm_content?: string;
    utm_campaign?: string;
  };
}

export interface ASMOptionsJSON {
  group_id: number;
  groups_to_display?: number[];
}

export interface MailJSONBase {
  from: EmailJSON;
  personalizations: PersonalizationJSON[];
  attachments?: AttachmentJSON[];
  categories?: string[];
  headers?: { [key: string]: string };
  mail_settings?: MailSettingsJSON;
  tracking_settings?: TrackingSettingsJSON;
  custom_args?: { [key: string]: string };
  sections?: { [key: string]: string };
  asm?: ASMOptionsJSON;

  reply_to?: EmailJSON;
  send_at?: number;
  batch_id?: string;
  ip_pool_name?: string;
  reply_to_list?: EmailJSON[];
}

export interface ContentMailJSON extends MailJSONBase {
  content: MailContent[];
  subject: string;
  template_id?: never;
}

export interface TemplateMailJSON extends MailJSONBase {
  content?: never;
  subject?: never;
  template_id: string;
}
