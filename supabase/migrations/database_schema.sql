-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.animals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'deer'::text,
  speed integer DEFAULT 50 CHECK (speed >= 1 AND speed <= 100),
  acceleration integer DEFAULT 50 CHECK (acceleration >= 1 AND acceleration <= 100),
  stamina integer DEFAULT 50 CHECK (stamina >= 1 AND stamina <= 100),
  temper integer DEFAULT 50 CHECK (temper >= 1 AND temper <= 100),
  experience integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  market_animal_id uuid,
  model_url text,
  model_scale numeric DEFAULT 1,
  model_rotation numeric DEFAULT 0,
  idle_anim text,
  run_anim text,
  cosmetics jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT animals_pkey PRIMARY KEY (id),
  CONSTRAINT animals_market_animal_id_fkey FOREIGN KEY (market_animal_id) REFERENCES public.market_animals(id),
  CONSTRAINT animals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.leaderboard (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_races integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  total_podiums integer DEFAULT 0,
  best_time numeric,
  points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leaderboard_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.market_animals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  speed integer DEFAULT 50 CHECK (speed >= 1 AND speed <= 100),
  acceleration integer DEFAULT 50 CHECK (acceleration >= 1 AND acceleration <= 100),
  stamina integer DEFAULT 50 CHECK (stamina >= 1 AND stamina <= 100),
  temper integer DEFAULT 50 CHECK (temper >= 1 AND temper <= 100),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  model_url text,
  thumbnail_url text,
  model_scale numeric DEFAULT 1,
  model_rotation numeric DEFAULT 0,
  idle_anim text,
  run_anim text,
  rarity text,
  sku text UNIQUE,
  is_active boolean DEFAULT true,
  stock integer,
  CONSTRAINT market_animals_pkey PRIMARY KEY (id),
  CONSTRAINT market_animals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.market_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type = ANY (ARRAY['food'::text, 'training'::text, 'boost'::text, 'cosmetic'::text])),
  name text NOT NULL UNIQUE,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  effect_value integer DEFAULT 0 CHECK (effect_value >= 0),
  created_at timestamp with time zone DEFAULT now(),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  cooldown_seconds integer CHECK (cooldown_seconds IS NULL OR cooldown_seconds > 0),
  level_required integer DEFAULT 1 CHECK (level_required > 0),
  rarity text DEFAULT 'common'::text CHECK (rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text])),
  max_stock integer,
  CONSTRAINT market_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.race_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL,
  animal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  position integer,
  finish_time numeric,
  distance_covered numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT race_entries_pkey PRIMARY KEY (id),
  CONSTRAINT race_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT race_entries_race_id_fkey FOREIGN KEY (race_id) REFERENCES public.races(id),
  CONSTRAINT race_entries_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.animals(id)
);
CREATE TABLE public.races (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  race_type text DEFAULT 'quick_race'::text,
  track_length integer DEFAULT 1000,
  status text DEFAULT 'waiting'::text CHECK (status = ANY (ARRAY['waiting'::text, 'racing'::text, 'completed'::text])),
  winner_id uuid,
  race_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT races_pkey PRIMARY KEY (id),
  CONSTRAINT races_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT races_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.animals(id)
);
CREATE TABLE public.user_currency (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  gold integer DEFAULT 100 CHECK (gold >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_currency_pkey PRIMARY KEY (id),
  CONSTRAINT user_currency_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_inventory (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT user_inventory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);