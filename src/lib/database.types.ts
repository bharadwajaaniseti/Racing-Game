export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      animals: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          speed: number
          acceleration: number
          stamina: number
          temper: number
          experience: number
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string
          speed?: number
          acceleration?: number
          stamina?: number
          temper?: number
          experience?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          speed?: number
          acceleration?: number
          stamina?: number
          temper?: number
          experience?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          user_id: string
          item_type: string
          item_name: string
          quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item_type: string
          item_name: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item_type?: string
          item_name?: string
          quantity?: number
          created_at?: string
          updated_at?: string
        }
      }
      races: {
        Row: {
          id: string
          created_by: string
          race_type: string
          track_length: number
          status: string
          winner_id: string | null
          race_data: any
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          created_by: string
          race_type?: string
          track_length?: number
          status?: string
          winner_id?: string | null
          race_data?: any
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          created_by?: string
          race_type?: string
          track_length?: number
          status?: string
          winner_id?: string | null
          race_data?: any
          created_at?: string
          completed_at?: string | null
        }
      }
      race_entries: {
        Row: {
          id: string
          race_id: string
          animal_id: string
          user_id: string
          position: number | null
          finish_time: number | null
          distance_covered: number
          created_at: string
        }
        Insert: {
          id?: string
          race_id: string
          animal_id: string
          user_id: string
          position?: number | null
          finish_time?: number | null
          distance_covered?: number
          created_at?: string
        }
        Update: {
          id?: string
          race_id?: string
          animal_id?: string
          user_id?: string
          position?: number | null
          finish_time?: number | null
          distance_covered?: number
          created_at?: string
        }
      }
      leaderboard: {
        Row: {
          id: string
          user_id: string
          total_races: number
          total_wins: number
          total_podiums: number
          best_time: number | null
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_races?: number
          total_wins?: number
          total_podiums?: number
          best_time?: number | null
          points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_races?: number
          total_wins?: number
          total_podiums?: number
          best_time?: number | null
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}