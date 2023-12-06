export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      directus_activity: {
        Row: {
          action: string
          collection: string
          comment: string | null
          id: number
          ip: string | null
          item: string
          origin: string | null
          timestamp: string
          user: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          collection: string
          comment?: string | null
          id?: number
          ip?: string | null
          item: string
          origin?: string | null
          timestamp?: string
          user?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          collection?: string
          comment?: string | null
          id?: number
          ip?: string | null
          item?: string
          origin?: string | null
          timestamp?: string
          user?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      directus_collections: {
        Row: {
          accountability: string | null
          archive_app_filter: boolean
          archive_field: string | null
          archive_value: string | null
          collapse: string
          collection: string
          color: string | null
          display_template: string | null
          group: string | null
          hidden: boolean
          icon: string | null
          item_duplication_fields: Json | null
          note: string | null
          singleton: boolean
          sort: number | null
          sort_field: string | null
          translations: Json | null
          unarchive_value: string | null
        }
        Insert: {
          accountability?: string | null
          archive_app_filter?: boolean
          archive_field?: string | null
          archive_value?: string | null
          collapse?: string
          collection: string
          color?: string | null
          display_template?: string | null
          group?: string | null
          hidden?: boolean
          icon?: string | null
          item_duplication_fields?: Json | null
          note?: string | null
          singleton?: boolean
          sort?: number | null
          sort_field?: string | null
          translations?: Json | null
          unarchive_value?: string | null
        }
        Update: {
          accountability?: string | null
          archive_app_filter?: boolean
          archive_field?: string | null
          archive_value?: string | null
          collapse?: string
          collection?: string
          color?: string | null
          display_template?: string | null
          group?: string | null
          hidden?: boolean
          icon?: string | null
          item_duplication_fields?: Json | null
          note?: string | null
          singleton?: boolean
          sort?: number | null
          sort_field?: string | null
          translations?: Json | null
          unarchive_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_collections_group_foreign"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "directus_collections"
            referencedColumns: ["collection"]
          }
        ]
      }
      directus_dashboards: {
        Row: {
          color: string | null
          date_created: string | null
          icon: string
          id: string
          name: string
          note: string | null
          user_created: string | null
        }
        Insert: {
          color?: string | null
          date_created?: string | null
          icon?: string
          id: string
          name: string
          note?: string | null
          user_created?: string | null
        }
        Update: {
          color?: string | null
          date_created?: string | null
          icon?: string
          id?: string
          name?: string
          note?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_dashboards_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_fields: {
        Row: {
          collection: string
          conditions: Json | null
          display: string | null
          display_options: Json | null
          field: string
          group: string | null
          hidden: boolean
          id: number
          interface: string | null
          note: string | null
          options: Json | null
          readonly: boolean
          required: boolean | null
          sort: number | null
          special: string | null
          translations: Json | null
          validation: Json | null
          validation_message: string | null
          width: string | null
        }
        Insert: {
          collection: string
          conditions?: Json | null
          display?: string | null
          display_options?: Json | null
          field: string
          group?: string | null
          hidden?: boolean
          id?: number
          interface?: string | null
          note?: string | null
          options?: Json | null
          readonly?: boolean
          required?: boolean | null
          sort?: number | null
          special?: string | null
          translations?: Json | null
          validation?: Json | null
          validation_message?: string | null
          width?: string | null
        }
        Update: {
          collection?: string
          conditions?: Json | null
          display?: string | null
          display_options?: Json | null
          field?: string
          group?: string | null
          hidden?: boolean
          id?: number
          interface?: string | null
          note?: string | null
          options?: Json | null
          readonly?: boolean
          required?: boolean | null
          sort?: number | null
          special?: string | null
          translations?: Json | null
          validation?: Json | null
          validation_message?: string | null
          width?: string | null
        }
        Relationships: []
      }
      directus_files: {
        Row: {
          charset: string | null
          description: string | null
          duration: number | null
          embed: string | null
          filename_disk: string | null
          filename_download: string
          filesize: number | null
          folder: string | null
          height: number | null
          id: string
          location: string | null
          metadata: Json | null
          modified_by: string | null
          modified_on: string
          storage: string
          tags: string | null
          title: string | null
          type: string | null
          uploaded_by: string | null
          uploaded_on: string
          width: number | null
        }
        Insert: {
          charset?: string | null
          description?: string | null
          duration?: number | null
          embed?: string | null
          filename_disk?: string | null
          filename_download: string
          filesize?: number | null
          folder?: string | null
          height?: number | null
          id: string
          location?: string | null
          metadata?: Json | null
          modified_by?: string | null
          modified_on?: string
          storage: string
          tags?: string | null
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_on?: string
          width?: number | null
        }
        Update: {
          charset?: string | null
          description?: string | null
          duration?: number | null
          embed?: string | null
          filename_disk?: string | null
          filename_download?: string
          filesize?: number | null
          folder?: string | null
          height?: number | null
          id?: string
          location?: string | null
          metadata?: Json | null
          modified_by?: string | null
          modified_on?: string
          storage?: string
          tags?: string | null
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          uploaded_on?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_files_folder_foreign"
            columns: ["folder"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_files_modified_by_foreign"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_files_uploaded_by_foreign"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_flows: {
        Row: {
          accountability: string | null
          color: string | null
          date_created: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          operation: string | null
          options: Json | null
          status: string
          trigger: string | null
          user_created: string | null
        }
        Insert: {
          accountability?: string | null
          color?: string | null
          date_created?: string | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
          operation?: string | null
          options?: Json | null
          status?: string
          trigger?: string | null
          user_created?: string | null
        }
        Update: {
          accountability?: string | null
          color?: string | null
          date_created?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          operation?: string | null
          options?: Json | null
          status?: string
          trigger?: string | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_flows_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_folders: {
        Row: {
          id: string
          name: string
          parent: string | null
        }
        Insert: {
          id: string
          name: string
          parent?: string | null
        }
        Update: {
          id?: string
          name?: string
          parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_folders_parent_foreign"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_migrations: {
        Row: {
          name: string
          timestamp: string | null
          version: string
        }
        Insert: {
          name: string
          timestamp?: string | null
          version: string
        }
        Update: {
          name?: string
          timestamp?: string | null
          version?: string
        }
        Relationships: []
      }
      directus_notifications: {
        Row: {
          collection: string | null
          id: number
          item: string | null
          message: string | null
          recipient: string
          sender: string | null
          status: string | null
          subject: string
          timestamp: string | null
        }
        Insert: {
          collection?: string | null
          id?: number
          item?: string | null
          message?: string | null
          recipient: string
          sender?: string | null
          status?: string | null
          subject: string
          timestamp?: string | null
        }
        Update: {
          collection?: string | null
          id?: number
          item?: string | null
          message?: string | null
          recipient?: string
          sender?: string | null
          status?: string | null
          subject?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_notifications_recipient_foreign"
            columns: ["recipient"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_notifications_sender_foreign"
            columns: ["sender"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_operations: {
        Row: {
          date_created: string | null
          flow: string
          id: string
          key: string
          name: string | null
          options: Json | null
          position_x: number
          position_y: number
          reject: string | null
          resolve: string | null
          type: string
          user_created: string | null
        }
        Insert: {
          date_created?: string | null
          flow: string
          id: string
          key: string
          name?: string | null
          options?: Json | null
          position_x: number
          position_y: number
          reject?: string | null
          resolve?: string | null
          type: string
          user_created?: string | null
        }
        Update: {
          date_created?: string | null
          flow?: string
          id?: string
          key?: string
          name?: string | null
          options?: Json | null
          position_x?: number
          position_y?: number
          reject?: string | null
          resolve?: string | null
          type?: string
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_operations_flow_foreign"
            columns: ["flow"]
            isOneToOne: false
            referencedRelation: "directus_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_reject_foreign"
            columns: ["reject"]
            isOneToOne: true
            referencedRelation: "directus_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_resolve_foreign"
            columns: ["resolve"]
            isOneToOne: true
            referencedRelation: "directus_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_operations_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_panels: {
        Row: {
          color: string | null
          dashboard: string
          date_created: string | null
          height: number
          icon: string | null
          id: string
          name: string | null
          note: string | null
          options: Json | null
          position_x: number
          position_y: number
          show_header: boolean
          type: string
          user_created: string | null
          width: number
        }
        Insert: {
          color?: string | null
          dashboard: string
          date_created?: string | null
          height: number
          icon?: string | null
          id: string
          name?: string | null
          note?: string | null
          options?: Json | null
          position_x: number
          position_y: number
          show_header?: boolean
          type: string
          user_created?: string | null
          width: number
        }
        Update: {
          color?: string | null
          dashboard?: string
          date_created?: string | null
          height?: number
          icon?: string | null
          id?: string
          name?: string | null
          note?: string | null
          options?: Json | null
          position_x?: number
          position_y?: number
          show_header?: boolean
          type?: string
          user_created?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "directus_panels_dashboard_foreign"
            columns: ["dashboard"]
            isOneToOne: false
            referencedRelation: "directus_dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_panels_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_permissions: {
        Row: {
          action: string
          collection: string
          fields: string | null
          id: number
          permissions: Json | null
          presets: Json | null
          role: string | null
          validation: Json | null
        }
        Insert: {
          action: string
          collection: string
          fields?: string | null
          id?: number
          permissions?: Json | null
          presets?: Json | null
          role?: string | null
          validation?: Json | null
        }
        Update: {
          action?: string
          collection?: string
          fields?: string | null
          id?: number
          permissions?: Json | null
          presets?: Json | null
          role?: string | null
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_permissions_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_presets: {
        Row: {
          bookmark: string | null
          collection: string | null
          color: string | null
          filter: Json | null
          icon: string | null
          id: number
          layout: string | null
          layout_options: Json | null
          layout_query: Json | null
          refresh_interval: number | null
          role: string | null
          search: string | null
          user: string | null
        }
        Insert: {
          bookmark?: string | null
          collection?: string | null
          color?: string | null
          filter?: Json | null
          icon?: string | null
          id?: number
          layout?: string | null
          layout_options?: Json | null
          layout_query?: Json | null
          refresh_interval?: number | null
          role?: string | null
          search?: string | null
          user?: string | null
        }
        Update: {
          bookmark?: string | null
          collection?: string | null
          color?: string | null
          filter?: Json | null
          icon?: string | null
          id?: number
          layout?: string | null
          layout_options?: Json | null
          layout_query?: Json | null
          refresh_interval?: number | null
          role?: string | null
          search?: string | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_presets_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_presets_user_foreign"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_relations: {
        Row: {
          id: number
          junction_field: string | null
          many_collection: string
          many_field: string
          one_allowed_collections: string | null
          one_collection: string | null
          one_collection_field: string | null
          one_deselect_action: string
          one_field: string | null
          sort_field: string | null
        }
        Insert: {
          id?: number
          junction_field?: string | null
          many_collection: string
          many_field: string
          one_allowed_collections?: string | null
          one_collection?: string | null
          one_collection_field?: string | null
          one_deselect_action?: string
          one_field?: string | null
          sort_field?: string | null
        }
        Update: {
          id?: number
          junction_field?: string | null
          many_collection?: string
          many_field?: string
          one_allowed_collections?: string | null
          one_collection?: string | null
          one_collection_field?: string | null
          one_deselect_action?: string
          one_field?: string | null
          sort_field?: string | null
        }
        Relationships: []
      }
      directus_revisions: {
        Row: {
          activity: number
          collection: string
          data: Json | null
          delta: Json | null
          id: number
          item: string
          parent: number | null
        }
        Insert: {
          activity: number
          collection: string
          data?: Json | null
          delta?: Json | null
          id?: number
          item: string
          parent?: number | null
        }
        Update: {
          activity?: number
          collection?: string
          data?: Json | null
          delta?: Json | null
          id?: number
          item?: string
          parent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_revisions_activity_foreign"
            columns: ["activity"]
            isOneToOne: false
            referencedRelation: "directus_activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_revisions_parent_foreign"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "directus_revisions"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_roles: {
        Row: {
          admin_access: boolean
          app_access: boolean
          description: string | null
          enforce_tfa: boolean
          icon: string
          id: string
          ip_access: string | null
          name: string
        }
        Insert: {
          admin_access?: boolean
          app_access?: boolean
          description?: string | null
          enforce_tfa?: boolean
          icon?: string
          id: string
          ip_access?: string | null
          name: string
        }
        Update: {
          admin_access?: boolean
          app_access?: boolean
          description?: string | null
          enforce_tfa?: boolean
          icon?: string
          id?: string
          ip_access?: string | null
          name?: string
        }
        Relationships: []
      }
      directus_sessions: {
        Row: {
          expires: string
          ip: string | null
          origin: string | null
          share: string | null
          token: string
          user: string | null
          user_agent: string | null
        }
        Insert: {
          expires: string
          ip?: string | null
          origin?: string | null
          share?: string | null
          token: string
          user?: string | null
          user_agent?: string | null
        }
        Update: {
          expires?: string
          ip?: string | null
          origin?: string | null
          share?: string | null
          token?: string
          user?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_sessions_share_foreign"
            columns: ["share"]
            isOneToOne: false
            referencedRelation: "directus_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_sessions_user_foreign"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_settings: {
        Row: {
          auth_login_attempts: number | null
          auth_password_policy: string | null
          basemaps: Json | null
          custom_aspect_ratios: Json | null
          custom_css: string | null
          default_language: string
          id: number
          mapbox_key: string | null
          module_bar: Json | null
          project_color: string | null
          project_descriptor: string | null
          project_logo: string | null
          project_name: string
          project_url: string | null
          public_background: string | null
          public_foreground: string | null
          public_note: string | null
          storage_asset_presets: Json | null
          storage_asset_transform: string | null
          storage_default_folder: string | null
          translation_strings: Json | null
        }
        Insert: {
          auth_login_attempts?: number | null
          auth_password_policy?: string | null
          basemaps?: Json | null
          custom_aspect_ratios?: Json | null
          custom_css?: string | null
          default_language?: string
          id?: number
          mapbox_key?: string | null
          module_bar?: Json | null
          project_color?: string | null
          project_descriptor?: string | null
          project_logo?: string | null
          project_name?: string
          project_url?: string | null
          public_background?: string | null
          public_foreground?: string | null
          public_note?: string | null
          storage_asset_presets?: Json | null
          storage_asset_transform?: string | null
          storage_default_folder?: string | null
          translation_strings?: Json | null
        }
        Update: {
          auth_login_attempts?: number | null
          auth_password_policy?: string | null
          basemaps?: Json | null
          custom_aspect_ratios?: Json | null
          custom_css?: string | null
          default_language?: string
          id?: number
          mapbox_key?: string | null
          module_bar?: Json | null
          project_color?: string | null
          project_descriptor?: string | null
          project_logo?: string | null
          project_name?: string
          project_url?: string | null
          public_background?: string | null
          public_foreground?: string | null
          public_note?: string | null
          storage_asset_presets?: Json | null
          storage_asset_transform?: string | null
          storage_default_folder?: string | null
          translation_strings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_settings_project_logo_foreign"
            columns: ["project_logo"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_background_foreign"
            columns: ["public_background"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_public_foreground_foreign"
            columns: ["public_foreground"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_settings_storage_default_folder_foreign"
            columns: ["storage_default_folder"]
            isOneToOne: false
            referencedRelation: "directus_folders"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_shares: {
        Row: {
          collection: string | null
          date_created: string | null
          date_end: string | null
          date_start: string | null
          id: string
          item: string | null
          max_uses: number | null
          name: string | null
          password: string | null
          role: string | null
          times_used: number | null
          user_created: string | null
        }
        Insert: {
          collection?: string | null
          date_created?: string | null
          date_end?: string | null
          date_start?: string | null
          id: string
          item?: string | null
          max_uses?: number | null
          name?: string | null
          password?: string | null
          role?: string | null
          times_used?: number | null
          user_created?: string | null
        }
        Update: {
          collection?: string | null
          date_created?: string | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          item?: string | null
          max_uses?: number | null
          name?: string | null
          password?: string | null
          role?: string | null
          times_used?: number | null
          user_created?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_shares_collection_foreign"
            columns: ["collection"]
            isOneToOne: false
            referencedRelation: "directus_collections"
            referencedColumns: ["collection"]
          },
          {
            foreignKeyName: "directus_shares_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directus_shares_user_created_foreign"
            columns: ["user_created"]
            isOneToOne: false
            referencedRelation: "directus_users"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_users: {
        Row: {
          auth_data: Json | null
          avatar: string | null
          description: string | null
          email: string | null
          email_notifications: boolean | null
          external_identifier: string | null
          first_name: string | null
          id: string
          language: string | null
          last_access: string | null
          last_name: string | null
          last_page: string | null
          location: string | null
          password: string | null
          provider: string
          role: string | null
          status: string
          tags: Json | null
          tfa_secret: string | null
          theme: string | null
          title: string | null
          token: string | null
        }
        Insert: {
          auth_data?: Json | null
          avatar?: string | null
          description?: string | null
          email?: string | null
          email_notifications?: boolean | null
          external_identifier?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_access?: string | null
          last_name?: string | null
          last_page?: string | null
          location?: string | null
          password?: string | null
          provider?: string
          role?: string | null
          status?: string
          tags?: Json | null
          tfa_secret?: string | null
          theme?: string | null
          title?: string | null
          token?: string | null
        }
        Update: {
          auth_data?: Json | null
          avatar?: string | null
          description?: string | null
          email?: string | null
          email_notifications?: boolean | null
          external_identifier?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_access?: string | null
          last_name?: string | null
          last_page?: string | null
          location?: string | null
          password?: string | null
          provider?: string
          role?: string | null
          status?: string
          tags?: Json | null
          tfa_secret?: string | null
          theme?: string | null
          title?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directus_users_role_foreign"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "directus_roles"
            referencedColumns: ["id"]
          }
        ]
      }
      directus_webhooks: {
        Row: {
          actions: string
          collections: string
          data: boolean
          headers: Json | null
          id: number
          method: string
          name: string
          status: string
          url: string
        }
        Insert: {
          actions: string
          collections: string
          data?: boolean
          headers?: Json | null
          id?: number
          method?: string
          name: string
          status?: string
          url: string
        }
        Update: {
          actions?: string
          collections?: string
          data?: boolean
          headers?: Json | null
          id?: number
          method?: string
          name?: string
          status?: string
          url?: string
        }
        Relationships: []
      }
      FacebookAdAlerts: {
        Row: {
          active: boolean
          channel: string | null
          createdAt: string | null
          dayOfWeek: Json | null
          id: string
          level: string
          level2: string
          level3: string
          rule: Json | null
          rule2: Json | null
          rule3: Json | null
          title: string
          updatedAt: string | null
        }
        Insert: {
          active?: boolean
          channel?: string | null
          createdAt?: string | null
          dayOfWeek?: Json | null
          id: string
          level?: string
          level2?: string
          level3?: string
          rule?: Json | null
          rule2?: Json | null
          rule3?: Json | null
          title: string
          updatedAt?: string | null
        }
        Update: {
          active?: boolean
          channel?: string | null
          createdAt?: string | null
          dayOfWeek?: Json | null
          id?: string
          level?: string
          level2?: string
          level3?: string
          rule?: Json | null
          rule2?: Json | null
          rule3?: Json | null
          title?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      FacebookAdAlerts_FacebookAdSets: {
        Row: {
          FacebookAdAlerts_id: string | null
          FacebookAdSets_id: string | null
          id: number
        }
        Insert: {
          FacebookAdAlerts_id?: string | null
          FacebookAdSets_id?: string | null
          id?: number
        }
        Update: {
          FacebookAdAlerts_id?: string | null
          FacebookAdSets_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "facebookadalerts_facebookadsets_facebookadalerts_id_foreign"
            columns: ["FacebookAdAlerts_id"]
            isOneToOne: false
            referencedRelation: "FacebookAdAlerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebookadalerts_facebookadsets_facebookadsets_id_foreign"
            columns: ["FacebookAdSets_id"]
            isOneToOne: false
            referencedRelation: "FacebookAdSets"
            referencedColumns: ["id"]
          }
        ]
      }
      FacebookAdsBudget: {
        Row: {
          active: boolean | null
          createdAt: string | null
          id: string
          intervalDays: number
          strategy: Json | null
          title: string
          updatedAt: string | null
        }
        Insert: {
          active?: boolean | null
          createdAt?: string | null
          id: string
          intervalDays?: number
          strategy?: Json | null
          title?: string
          updatedAt?: string | null
        }
        Update: {
          active?: boolean | null
          createdAt?: string | null
          id?: string
          intervalDays?: number
          strategy?: Json | null
          title?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      FacebookAdsBudget_FacebookAdSets: {
        Row: {
          FacebookAdsBudget_id: string | null
          FacebookAdSets_id: string | null
          id: number
        }
        Insert: {
          FacebookAdsBudget_id?: string | null
          FacebookAdSets_id?: string | null
          id?: number
        }
        Update: {
          FacebookAdsBudget_id?: string | null
          FacebookAdSets_id?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "facebookadsbudget_facebookadsets_facebooka__4e5f3f6b_foreign"
            columns: ["FacebookAdsBudget_id"]
            isOneToOne: false
            referencedRelation: "FacebookAdsBudget"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebookadsbudget_facebookadsets_facebookadsets_id_foreign"
            columns: ["FacebookAdSets_id"]
            isOneToOne: false
            referencedRelation: "FacebookAdSets"
            referencedColumns: ["id"]
          }
        ]
      }
      FacebookAdSets: {
        Row: {
          accountId: string
          accountName: string
          id: string
          setId: string
          setName: string
        }
        Insert: {
          accountId: string
          accountName?: string
          id: string
          setId: string
          setName?: string
        }
        Update: {
          accountId?: string
          accountName?: string
          id?: string
          setId?: string
          setName?: string
        }
        Relationships: []
      }
      GoogleMerchantCenter: {
        Row: {
          createdAt: string | null
          id: number
          merchantCenterId: string
          shopifyProductGroup: number
          title: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: number
          merchantCenterId: string
          shopifyProductGroup: number
          title: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: number
          merchantCenterId?: string
          shopifyProductGroup?: number
          title?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "googlemerchantcenter_shopifyproductgroup_foreign"
            columns: ["shopifyProductGroup"]
            isOneToOne: false
            referencedRelation: "ShopifyProductGroups"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyCustomSKUs: {
        Row: {
          availableStock: string
          code: string
          createdAt: string | null
          currentInventoryOrderSKUId: number | null
          deliverySchedule: string | null
          displayName: string | null
          id: number
          incomingStockDateA: string | null
          incomingStockDateB: string | null
          incomingStockDateC: string | null
          incomingStockDeliveryScheduleA: string | null
          incomingStockDeliveryScheduleB: string | null
          incomingStockDeliveryScheduleC: string | null
          incomingStockQtyA: number | null
          incomingStockQtyB: number | null
          incomingStockQtyC: number | null
          inventory: number
          lastSyncedAt: string | null
          name: string
          skipDeliveryCalc: boolean | null
          sortNumber: number
          stockBuffer: number | null
          subName: string | null
          unshippedOrderCount: number
          updatedAt: string | null
        }
        Insert: {
          availableStock?: string
          code?: string
          createdAt?: string | null
          currentInventoryOrderSKUId?: number | null
          deliverySchedule?: string | null
          displayName?: string | null
          id?: number
          incomingStockDateA?: string | null
          incomingStockDateB?: string | null
          incomingStockDateC?: string | null
          incomingStockDeliveryScheduleA?: string | null
          incomingStockDeliveryScheduleB?: string | null
          incomingStockDeliveryScheduleC?: string | null
          incomingStockQtyA?: number | null
          incomingStockQtyB?: number | null
          incomingStockQtyC?: number | null
          inventory?: number
          lastSyncedAt?: string | null
          name: string
          skipDeliveryCalc?: boolean | null
          sortNumber?: number
          stockBuffer?: number | null
          subName?: string | null
          unshippedOrderCount?: number
          updatedAt?: string | null
        }
        Update: {
          availableStock?: string
          code?: string
          createdAt?: string | null
          currentInventoryOrderSKUId?: number | null
          deliverySchedule?: string | null
          displayName?: string | null
          id?: number
          incomingStockDateA?: string | null
          incomingStockDateB?: string | null
          incomingStockDateC?: string | null
          incomingStockDeliveryScheduleA?: string | null
          incomingStockDeliveryScheduleB?: string | null
          incomingStockDeliveryScheduleC?: string | null
          incomingStockQtyA?: number | null
          incomingStockQtyB?: number | null
          incomingStockQtyC?: number | null
          inventory?: number
          lastSyncedAt?: string | null
          name?: string
          skipDeliveryCalc?: boolean | null
          sortNumber?: number
          stockBuffer?: number | null
          subName?: string | null
          unshippedOrderCount?: number
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopifycustomskus_currentinventoryorderskuid_foreign"
            columns: ["currentInventoryOrderSKUId"]
            isOneToOne: false
            referencedRelation: "ShopifyInventoryOrderSKUs"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyInventoryOrders: {
        Row: {
          createdAt: string | null
          deliveryDate: string
          deliverySchedule: string | null
          id: number
          name: string
          note: string | null
          orderedDate: string
          receivingDate: string
          shippingDate: string
          status: string | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          deliveryDate: string
          deliverySchedule?: string | null
          id?: number
          name: string
          note?: string | null
          orderedDate: string
          receivingDate: string
          shippingDate: string
          status?: string | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          deliveryDate?: string
          deliverySchedule?: string | null
          id?: number
          name?: string
          note?: string | null
          orderedDate?: string
          receivingDate?: string
          shippingDate?: string
          status?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      ShopifyInventoryOrderSKUs: {
        Row: {
          createdAt: string | null
          heldQuantity: number
          id: number
          inventoryOrderId: number
          quantity: number
          skuId: number | null
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          heldQuantity?: number
          id?: number
          inventoryOrderId: number
          quantity?: number
          skuId?: number | null
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          heldQuantity?: number
          id?: number
          inventoryOrderId?: number
          quantity?: number
          skuId?: number | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopifyinventoryorderskus_inventoryorderid_foreign"
            columns: ["inventoryOrderId"]
            isOneToOne: false
            referencedRelation: "ShopifyInventoryOrders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopifyinventoryorderskus_skuid_foreign"
            columns: ["skuId"]
            isOneToOne: false
            referencedRelation: "ShopifyCustomSKUs"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyPages: {
        Row: {
          body: string | null
          buyButton: boolean
          createdAt: string | null
          customBody: string | null
          customHead: string | null
          description: string | null
          domain: string
          favicon: string | null
          id: number
          logo: string | null
          ogpImageUrl: string | null
          ogpShortTitle: string | null
          pathname: string
          product: number
          title: string | null
          updatedAt: string | null
        }
        Insert: {
          body?: string | null
          buyButton?: boolean
          createdAt?: string | null
          customBody?: string | null
          customHead?: string | null
          description?: string | null
          domain: string
          favicon?: string | null
          id?: number
          logo?: string | null
          ogpImageUrl?: string | null
          ogpShortTitle?: string | null
          pathname: string
          product: number
          title?: string | null
          updatedAt?: string | null
        }
        Update: {
          body?: string | null
          buyButton?: boolean
          createdAt?: string | null
          customBody?: string | null
          customHead?: string | null
          description?: string | null
          domain?: string
          favicon?: string | null
          id?: number
          logo?: string | null
          ogpImageUrl?: string | null
          ogpShortTitle?: string | null
          pathname?: string
          product?: number
          title?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopifypages_favicon_foreign"
            columns: ["favicon"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopifypages_logo_foreign"
            columns: ["logo"]
            isOneToOne: false
            referencedRelation: "directus_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopifypages_product_foreign"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "ShopifyProducts"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyProductGroups: {
        Row: {
          closeOn: string
          createdAt: string | null
          deliverySchedule: string | null
          id: number
          realSupporters: number
          realTotalPrice: number
          supporters: number | null
          title: string | null
          totalPrice: number | null
          updatedAt: string | null
        }
        Insert: {
          closeOn: string
          createdAt?: string | null
          deliverySchedule?: string | null
          id?: number
          realSupporters?: number
          realTotalPrice?: number
          supporters?: number | null
          title?: string | null
          totalPrice?: number | null
          updatedAt?: string | null
        }
        Update: {
          closeOn?: string
          createdAt?: string | null
          deliverySchedule?: string | null
          id?: number
          realSupporters?: number
          realTotalPrice?: number
          supporters?: number | null
          title?: string | null
          totalPrice?: number | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      ShopifyProducts: {
        Row: {
          createdAt: string | null
          id: number
          productGroupId: number | null
          productId: string
          productName: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          id?: number
          productGroupId?: number | null
          productId: string
          productName: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          id?: number
          productGroupId?: number | null
          productId?: string
          productName?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopifyproducts_productgroupid_foreign"
            columns: ["productGroupId"]
            isOneToOne: false
            referencedRelation: "ShopifyProductGroups"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyVariants: {
        Row: {
          createdAt: string | null
          customSelects: number | null
          deliverySchedule: string | null
          id: number
          product: number | null
          skuLabel: string | null
          skusJSON: string | null
          updatedAt: string | null
          variantId: string
          variantName: string
        }
        Insert: {
          createdAt?: string | null
          customSelects?: number | null
          deliverySchedule?: string | null
          id?: number
          product?: number | null
          skuLabel?: string | null
          skusJSON?: string | null
          updatedAt?: string | null
          variantId: string
          variantName: string
        }
        Update: {
          createdAt?: string | null
          customSelects?: number | null
          deliverySchedule?: string | null
          id?: number
          product?: number | null
          skuLabel?: string | null
          skusJSON?: string | null
          updatedAt?: string | null
          variantId?: string
          variantName?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopifyvariants_product_foreign"
            columns: ["product"]
            isOneToOne: false
            referencedRelation: "ShopifyProducts"
            referencedColumns: ["id"]
          }
        ]
      }
      ShopifyVariants_ShopifyCustomSKUs: {
        Row: {
          id: number
          ShopifyCustomSKUs_id: number | null
          ShopifyVariants_id: number | null
          sort: number | null
        }
        Insert: {
          id?: number
          ShopifyCustomSKUs_id?: number | null
          ShopifyVariants_id?: number | null
          sort?: number | null
        }
        Update: {
          id?: number
          ShopifyCustomSKUs_id?: number | null
          ShopifyVariants_id?: number | null
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shopifyvariants_shopifycustomskus_shopifycus__a6179f_foreign"
            columns: ["ShopifyCustomSKUs_id"]
            isOneToOne: false
            referencedRelation: "ShopifyCustomSKUs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopifyvariants_shopifycustomskus_shopifyvariants_id_foreign"
            columns: ["ShopifyVariants_id"]
            isOneToOne: false
            referencedRelation: "ShopifyVariants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
