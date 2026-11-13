
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
            "access_code_tentativas": {
                  Row: {
                    "created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"access_codes": {
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
                },"admins": {
                  Row: {
                    "criado_em": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"user_id": string
                  }
                  Update: {
                    "criado_em"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_perguntas": {
                  Row: {
                    "capitulo": string | null,"created_at": string,"custo_usd": number | null,"id": string,"pedido": string | null,"pergunta": string,"resultado": Json | null,"rota": string,"tokens_cache": number | null,"tokens_entrada": number | null,"tokens_saida": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capitulo"?: string | null,"created_at"?: string,"custo_usd"?: number | null,"id"?: string,"pedido"?: string | null,"pergunta": string,"resultado"?: Json | null,"rota"?: string,"tokens_cache"?: number | null,"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"user_id": string
                  }
                  Update: {
                    "capitulo"?: string | null,"created_at"?: string,"custo_usd"?: number | null,"id"?: string,"pedido"?: string | null,"pergunta"?: string,"resultado"?: Json | null,"rota"?: string,"tokens_cache"?: number | null,"tokens_entrada"?: number | null,"tokens_saida"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"campeoes": {
                  Row: {
                    "criado_em": string,"id": string,"nicho": string,"titulo": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: string,"nicho": string,"titulo"?: string,"url": string
                  }
                  Update: {
                    "criado_em"?: string,"id"?: string,"nicho"?: string,"titulo"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campeoes_nicho_fkey"
      columns: ["nicho"]
isOneToOne: false
      referencedRelation: "nichos"
      referencedColumns: ["slug"]
    }
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
                },"compras_applyfy": {
                  Row: {
                    "criada_em": string,"email": string,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criada_em"?: string,"email": string,"transaction_id": string
                  }
                  Update: {
                    "criada_em"?: string,"email"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"conversas": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"id": string,"mensagens": NonNullable<Json>,"titulo": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"id": string,"mensagens"?: NonNullable<Json>,"titulo": string,"user_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"id"?: string,"mensagens"?: NonNullable<Json>,"titulo"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"creditos_comprados": {
                  Row: {
                    "comprado_em": string,"gastos": number,"id": string,"quantidade": number,"rota": string,"user_id": string,"vale_ate": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comprado_em"?: string,"gastos"?: number,"id"?: string,"quantidade": number,"rota": string,"user_id": string,"vale_ate": string
                  }
                  Update: {
                    "comprado_em"?: string,"gastos"?: number,"id"?: string,"quantidade"?: number,"rota"?: string,"user_id"?: string,"vale_ate"?: string
                  }
                  Relationships: [
                    
                  ]
                },"creditos_semana": {
                  Row: {
                    "gastos": number,"rota": string,"semana": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "gastos"?: number,"rota": string,"semana": string,"user_id": string
                  }
                  Update: {
                    "gastos"?: number,"rota"?: string,"semana"?: string,"user_id"?: string
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
                },"fichas_roteiro": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"criado_por": string | null,"cta": string,"cta_entonacao": string | null,"cta_porque": string | null,"embedding": string | null,"exemplo_fixo": boolean,"formato": string,"gancho": string,"gancho_entonacao": string,"gancho_gatilho": string,"gancho_porque": string,"id": string,"problema": string,"problema_entonacao": string | null,"problema_porque": string | null,"produto": string,"solucao": string,"solucao_entonacao": string | null,"solucao_porque": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"cta": string,"cta_entonacao"?: string | null,"cta_porque"?: string | null,"embedding"?: string | null,"exemplo_fixo"?: boolean,"formato": string,"gancho": string,"gancho_entonacao": string,"gancho_gatilho": string,"gancho_porque": string,"id"?: string,"problema": string,"problema_entonacao"?: string | null,"problema_porque"?: string | null,"produto": string,"solucao": string,"solucao_entonacao"?: string | null,"solucao_porque"?: string | null,"tipo": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"cta"?: string,"cta_entonacao"?: string | null,"cta_porque"?: string | null,"embedding"?: string | null,"exemplo_fixo"?: boolean,"formato"?: string,"gancho"?: string,"gancho_entonacao"?: string,"gancho_gatilho"?: string,"gancho_porque"?: string,"id"?: string,"problema"?: string,"problema_entonacao"?: string | null,"problema_porque"?: string | null,"produto"?: string,"solucao"?: string,"solucao_entonacao"?: string | null,"solucao_porque"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fichas_roteiro_gancho_gatilho_fkey"
      columns: ["gancho_gatilho"]
isOneToOne: false
      referencedRelation: "gatilhos"
      referencedColumns: ["slug"]
    }
                  ]
                },"gancho_notas": {
                  Row: {
                    "atualizado_em": string,"gancho_id": string,"nota": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"gancho_id": string,"nota": number,"user_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"gancho_id"?: string,"nota"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gancho_notas_gancho_id_fkey"
      columns: ["gancho_id"]
isOneToOne: false
      referencedRelation: "ganchos"
      referencedColumns: ["id"]
    }
                  ]
                },"ganchos": {
                  Row: {
                    "categoria": string,"comunidade": boolean,"criado_em": string,"id": string,"texto": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria": string,"comunidade"?: boolean,"criado_em"?: string,"id"?: string,"texto": string,"user_id"?: string | null
                  }
                  Update: {
                    "categoria"?: string,"comunidade"?: boolean,"criado_em"?: string,"id"?: string,"texto"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"gatilhos": {
                  Row: {
                    "criado_em": string,"rotulo": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"rotulo": string,"slug": string
                  }
                  Update: {
                    "criado_em"?: string,"rotulo"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"nichos": {
                  Row: {
                    "criado_em": string,"rotulo": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"rotulo": string,"slug": string
                  }
                  Update: {
                    "criado_em"?: string,"rotulo"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"nome": string | null,"tiktok": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"nome"?: string | null,"tiktok"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"nome"?: string | null,"tiktok"?: string | null
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
                },"senhas_temporarias": {
                  Row: {
                    "criada_em": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criada_em"?: string,"user_id": string
                  }
                  Update: {
                    "criada_em"?: string,"user_id"?: string
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
                },"treinamento": {
                  Row: {
                    "contexto": string | null,"conversa_id": string | null,"criado_em": string,"embedding": string | null,"id": string,"ordem": number | null,"origem": string,"pergunta": string,"respondido_em": string | null,"respondido_por": string | null,"resposta": string | null,"resposta_ia": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contexto"?: string | null,"conversa_id"?: string | null,"criado_em"?: string,"embedding"?: string | null,"id"?: string,"ordem"?: number | null,"origem": string,"pergunta": string,"respondido_em"?: string | null,"respondido_por"?: string | null,"resposta"?: string | null,"resposta_ia"?: string | null,"status"?: string
                  }
                  Update: {
                    "contexto"?: string | null,"conversa_id"?: string | null,"criado_em"?: string,"embedding"?: string | null,"id"?: string,"ordem"?: number | null,"origem"?: string,"pergunta"?: string,"respondido_em"?: string | null,"respondido_por"?: string | null,"resposta"?: string | null,"resposta_ia"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "treinamento_conversa_id_fkey"
      columns: ["conversa_id"]
isOneToOne: false
      referencedRelation: "treinamento_conversas"
      referencedColumns: ["id"]
    }
                  ]
                },"treinamento_conversas": {
                  Row: {
                    "conversa_cliente": string,"criado_em": string,"id": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conversa_cliente": string,"criado_em"?: string,"id"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "conversa_cliente"?: string,"criado_em"?: string,"id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "resgatar_codigo":
{ Args: { "codigo_input": string,"p_user": string }; Returns: boolean
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
