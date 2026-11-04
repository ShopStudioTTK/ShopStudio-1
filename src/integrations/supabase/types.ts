
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "access_codes": {
                  Row: {
                    "ativo": boolean,"code": string,"criado_em": string,"limite_usos": number | null,"usos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"code": string,"criado_em"?: string,"limite_usos"?: number | null,"usos"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"code"?: string,"criado_em"?: string,"limite_usos"?: number | null,"usos"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ai_config": {
                  Row: {
                    "evitar": string | null,"exemplos": NonNullable<Json>,"id": string,"nome": string,"persona": string | null,"tom": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evitar"?: string | null,"exemplos"?: NonNullable<Json>,"id"?: string,"nome"?: string,"persona"?: string | null,"tom"?: string,"updated_at"?: string
                  }
                  Update: {
                    "evitar"?: string | null,"exemplos"?: NonNullable<Json>,"id"?: string,"nome"?: string,"persona"?: string | null,"tom"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_knowledge": {
                  Row: {
                    "conteudo": string,"id": string,"ordem": number,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conteudo": string,"id"?: string,"ordem"?: number,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "conteudo"?: string,"id"?: string,"ordem"?: number,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_perguntas": {
                  Row: {
                    "capitulo": string | null,"created_at": string,"custo_usd": number | null,"id": string,"pergunta": string,"tokens_entrada": number | null,"tokens_saida": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capitulo"?: string | null,"created_at"?: string,"custo_usd"?: number | null,"id"?: string,"pergunta": string,"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"user_id": string
                  }
                  Update: {
                    "capitulo"?: string | null,"created_at"?: string,"custo_usd"?: number | null,"id"?: string,"pergunta"?: string,"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chapter_progress": {
                  Row: {
                    "chapter_slug": string,"completed_at": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_slug": string,"completed_at"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "chapter_slug"?: string,"completed_at"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chapter_videos": {
                  Row: {
                    "chapter_slug": string | null,"colecao": string,"descricao": string | null,"id": string,"ordem": number,"titulo": string,"updated_at": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chapter_slug"?: string | null,"colecao"?: string,"descricao"?: string | null,"id"?: string,"ordem"?: number,"titulo": string,"updated_at"?: string,"url": string
                  }
                  Update: {
                    "chapter_slug"?: string | null,"colecao"?: string,"descricao"?: string | null,"id"?: string,"ordem"?: number,"titulo"?: string,"updated_at"?: string,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checklist_progress": {
                  Row: {
                    "done": boolean,"id": string,"item_key": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "done"?: boolean,"id"?: string,"item_key": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "done"?: boolean,"id"?: string,"item_key"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entitlements": {
                  Row: {
                    "codigo": string | null,"criado_em": string,"origem": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo"?: string | null,"criado_em"?: string,"origem"?: string,"user_id": string
                  }
                  Update: {
                    "codigo"?: string | null,"criado_em"?: string,"origem"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"nome": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"nome"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"nome"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"saved_scripts": {
                  Row: {
                    "conteudo": NonNullable<Json>,"created_at": string,"formato": string | null,"id": string,"produto": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conteudo": NonNullable<Json>,"created_at"?: string,"formato"?: string | null,"id"?: string,"produto": string,"user_id": string
                  }
                  Update: {
                    "conteudo"?: NonNullable<Json>,"created_at"?: string,"formato"?: string | null,"id"?: string,"produto"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"success_cases": {
                  Row: {
                    "aluna": string,"created_at": string,"destaque": boolean,"id": string,"midia_tipo": string,"midia_url": string | null,"resultado": string | null,"texto": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aluna": string,"created_at"?: string,"destaque"?: boolean,"id"?: string,"midia_tipo"?: string,"midia_url"?: string | null,"resultado"?: string | null,"texto"?: string | null,"user_id": string
                  }
                  Update: {
                    "aluna"?: string,"created_at"?: string,"destaque"?: boolean,"id"?: string,"midia_tipo"?: string,"midia_url"?: string | null,"resultado"?: string | null,"texto"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "redeem_access_code":
{ Args: { "codigo_input": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
