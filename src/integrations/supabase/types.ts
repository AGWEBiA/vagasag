export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_credentials: {
        Row: {
          api_key: string
          created_at: string
          id: string
          label: string | null
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          label?: string | null
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          label?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          enabled_providers: Json
          id: string
          is_active: boolean
          model: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled_providers?: Json
          id?: string
          is_active?: boolean
          model?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled_providers?: Json
          id?: string
          is_active?: boolean
          model?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      assessment_pesos: {
        Row: {
          comportamental: number
          estrategico: number
          id: number
          impacto: number
          lideranca: number
          tecnico: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comportamental?: number
          estrategico?: number
          id?: number
          impacto?: number
          lideranca?: number
          tecnico?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comportamental?: number
          estrategico?: number
          id?: number
          impacto?: number
          lideranca?: number
          tecnico?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      assessments: {
        Row: {
          analise_pilares: Json
          candidate_id: string
          confidence_score: number
          created_at: string
          evidencias_comportamentais: Json
          gaps_identificados: Json
          id: string
          model_used: string
          nota_ponderada: number
          perguntas_entrevista: Json
          pontos_fortes: Json
          resumo_executivo: string
          senioridade_detectada: string
        }
        Insert: {
          analise_pilares: Json
          candidate_id: string
          confidence_score: number
          created_at?: string
          evidencias_comportamentais?: Json
          gaps_identificados: Json
          id?: string
          model_used?: string
          nota_ponderada: number
          perguntas_entrevista: Json
          pontos_fortes: Json
          resumo_executivo: string
          senioridade_detectada: string
        }
        Update: {
          analise_pilares?: Json
          candidate_id?: string
          confidence_score?: number
          created_at?: string
          evidencias_comportamentais?: Json
          gaps_identificados?: Json
          id?: string
          model_used?: string
          nota_ponderada?: number
          perguntas_entrevista?: Json
          pontos_fortes?: Json
          resumo_executivo?: string
          senioridade_detectada?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color_hsl: string
          autoaval_descricao: string | null
          autoaval_slug: string | null
          autoaval_titulo: string | null
          favicon_url: string | null
          font_body: string
          font_heading: string
          font_heading_weight: string
          id: number
          logo_horizontal_url: string | null
          logo_mark_url: string | null
          logo_mobile_url: string | null
          primary_color_hsl: string
          primary_foreground_hsl: string
          product_name: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color_hsl?: string
          autoaval_descricao?: string | null
          autoaval_slug?: string | null
          autoaval_titulo?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          font_heading_weight?: string
          id?: number
          logo_horizontal_url?: string | null
          logo_mark_url?: string | null
          logo_mobile_url?: string | null
          primary_color_hsl?: string
          primary_foreground_hsl?: string
          product_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color_hsl?: string
          autoaval_descricao?: string | null
          autoaval_slug?: string | null
          autoaval_titulo?: string | null
          favicon_url?: string | null
          font_body?: string
          font_heading?: string
          font_heading_weight?: string
          id?: number
          logo_horizontal_url?: string | null
          logo_mark_url?: string | null
          logo_mobile_url?: string | null
          primary_color_hsl?: string
          primary_foreground_hsl?: string
          product_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          cargo: string
          created_at: string
          created_by: string | null
          dados_profissionais: string
          id: string
          informacoes_adicionais: string | null
          nome: string
          origem: string
        }
        Insert: {
          cargo: string
          created_at?: string
          created_by?: string | null
          dados_profissionais: string
          id?: string
          informacoes_adicionais?: string | null
          nome: string
          origem?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          created_by?: string | null
          dados_profissionais?: string
          id?: string
          informacoes_adicionais?: string | null
          nome?: string
          origem?: string
        }
        Relationships: []
      }
      candidatura_atribuicoes: {
        Row: {
          atribuido_por: string | null
          candidatura_id: string
          created_at: string
          id: string
          recrutador_id: string
          recrutador_nome: string | null
          updated_at: string
        }
        Insert: {
          atribuido_por?: string | null
          candidatura_id: string
          created_at?: string
          id?: string
          recrutador_id: string
          recrutador_nome?: string | null
          updated_at?: string
        }
        Update: {
          atribuido_por?: string | null
          candidatura_id?: string
          created_at?: string
          id?: string
          recrutador_id?: string
          recrutador_nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatura_atribuicoes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatura_eventos: {
        Row: {
          ator_id: string | null
          ator_nome: string | null
          candidatura_id: string
          created_at: string
          dados: Json
          descricao: string | null
          id: string
          tipo: string
        }
        Insert: {
          ator_id?: string | null
          ator_nome?: string | null
          candidatura_id: string
          created_at?: string
          dados?: Json
          descricao?: string | null
          id?: string
          tipo: string
        }
        Update: {
          ator_id?: string | null
          ator_nome?: string | null
          candidatura_id?: string
          created_at?: string
          dados?: Json
          descricao?: string | null
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      candidatura_notas: {
        Row: {
          autor_id: string
          autor_nome: string | null
          candidatura_id: string
          created_at: string
          id: string
          mencionados: string[]
          texto: string
          updated_at: string
        }
        Insert: {
          autor_id: string
          autor_nome?: string | null
          candidatura_id: string
          created_at?: string
          id?: string
          mencionados?: string[]
          texto: string
          updated_at?: string
        }
        Update: {
          autor_id?: string
          autor_nome?: string | null
          candidatura_id?: string
          created_at?: string
          id?: string
          mencionados?: string[]
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidatura_notas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatura_respostas: {
        Row: {
          candidatura_id: string
          created_at: string
          id: string
          resposta_numero: number | null
          resposta_texto: string | null
          vaga_pergunta_id: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          id?: string
          resposta_numero?: number | null
          resposta_texto?: string | null
          vaga_pergunta_id: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          id?: string
          resposta_numero?: number | null
          resposta_texto?: string | null
          vaga_pergunta_id?: string
        }
        Relationships: []
      }
      candidaturas: {
        Row: {
          candidate_id: string | null
          created_at: string
          dados_profissionais: string
          email: string
          estagio_atualizado_em: string
          estagio_id: string | null
          id: string
          informacoes_adicionais: string | null
          linkedin: string | null
          nome: string
          notes: string | null
          portfolio: string | null
          skills: string[]
          status: string
          tags: string[]
          talent_status: string
          telefone: string | null
          vaga_id: string
        }
        Insert: {
          candidate_id?: string | null
          created_at?: string
          dados_profissionais: string
          email: string
          estagio_atualizado_em?: string
          estagio_id?: string | null
          id?: string
          informacoes_adicionais?: string | null
          linkedin?: string | null
          nome: string
          notes?: string | null
          portfolio?: string | null
          skills?: string[]
          status?: string
          tags?: string[]
          talent_status?: string
          telefone?: string | null
          vaga_id: string
        }
        Update: {
          candidate_id?: string | null
          created_at?: string
          dados_profissionais?: string
          email?: string
          estagio_atualizado_em?: string
          estagio_id?: string | null
          id?: string
          informacoes_adicionais?: string | null
          linkedin?: string | null
          nome?: string
          notes?: string | null
          portfolio?: string | null
          skills?: string[]
          status?: string
          tags?: string[]
          talent_status?: string
          telefone?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_estagio_id_fkey"
            columns: ["estagio_id"]
            isOneToOne: false
            referencedRelation: "pipeline_estagios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates_globais: {
        Row: {
          assunto: string
          ativo: boolean
          corpo: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assunto: string
          ativo?: boolean
          corpo: string
          id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assunto?: string
          ativo?: boolean
          corpo?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entrevistas: {
        Row: {
          candidatura_id: string
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          descricao: string | null
          entrevistador_email: string | null
          entrevistador_id: string | null
          entrevistador_nome: string | null
          enviar_email_convite: boolean
          enviar_lembrete: boolean
          fuso_horario: string
          horas_antes_lembrete: number
          ics_uid: string
          id: string
          lembrete_enviado_em: string | null
          link_video: string | null
          local: string | null
          modalidade: string
          notas_pos_entrevista: string | null
          status: string
          titulo: string
          updated_at: string
          vaga_id: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          descricao?: string | null
          entrevistador_email?: string | null
          entrevistador_id?: string | null
          entrevistador_nome?: string | null
          enviar_email_convite?: boolean
          enviar_lembrete?: boolean
          fuso_horario?: string
          horas_antes_lembrete?: number
          ics_uid?: string
          id?: string
          lembrete_enviado_em?: string | null
          link_video?: string | null
          local?: string | null
          modalidade?: string
          notas_pos_entrevista?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          vaga_id: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          entrevistador_email?: string | null
          entrevistador_id?: string | null
          entrevistador_nome?: string | null
          enviar_email_convite?: boolean
          enviar_lembrete?: boolean
          fuso_horario?: string
          horas_antes_lembrete?: number
          ics_uid?: string
          id?: string
          lembrete_enviado_em?: string | null
          link_video?: string | null
          local?: string | null
          modalidade?: string
          notas_pos_entrevista?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_estagios: {
        Row: {
          ativo: boolean
          auto_score_ativo: boolean
          cor: string
          created_at: string
          email_assunto: string | null
          email_ativo: boolean
          email_corpo: string | null
          id: string
          nome: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auto_score_ativo?: boolean
          cor?: string
          created_at?: string
          email_assunto?: string | null
          email_ativo?: boolean
          email_corpo?: string | null
          id?: string
          nome: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auto_score_ativo?: boolean
          cor?: string
          created_at?: string
          email_assunto?: string | null
          email_ativo?: boolean
          email_corpo?: string | null
          id?: string
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          ativa: boolean
          cargos_sugeridos: string[]
          created_at: string
          created_by: string | null
          id: string
          opcoes: Json
          texto: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cargos_sugeridos?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          opcoes?: Json
          texto: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cargos_sugeridos?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          opcoes?: Json
          texto?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tag_definicoes: {
        Row: {
          cor: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaga_perguntas: {
        Row: {
          created_at: string
          id: string
          obrigatoria: boolean
          opcoes: Json
          ordem: number
          question_bank_id: string | null
          texto: string
          tipo: string
          updated_at: string
          usar_na_ia: boolean
          vaga_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json
          ordem?: number
          question_bank_id?: string | null
          texto: string
          tipo?: string
          updated_at?: string
          usar_na_ia?: boolean
          vaga_id: string
        }
        Update: {
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json
          ordem?: number
          question_bank_id?: string | null
          texto?: string
          tipo?: string
          updated_at?: string
          usar_na_ia?: boolean
          vaga_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          beneficios: string | null
          cargo: string
          created_at: string
          created_by: string
          descricao: string
          faixa_salarial: string | null
          id: string
          localizacao: string | null
          modalidade: string
          requisitos: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          beneficios?: string | null
          cargo: string
          created_at?: string
          created_by: string
          descricao: string
          faixa_salarial?: string | null
          id?: string
          localizacao?: string | null
          modalidade?: string
          requisitos?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          beneficios?: string | null
          cargo?: string
          created_at?: string
          created_by?: string
          descricao?: string
          faixa_salarial?: string | null
          id?: string
          localizacao?: string | null
          modalidade?: string
          requisitos?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "recrutador" | "user" | "lider" | "colaborador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "recrutador", "user", "lider", "colaborador"],
    },
  },
} as const
