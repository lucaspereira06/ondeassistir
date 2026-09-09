-- db/schema_v2.sql
-- Novo schema normalizado para a Arquitetura GE GraphQL

CREATE TABLE competitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    edition_name VARCHAR(255),
    edition_slug VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'GE',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, edition_slug)
);

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    popular_name VARCHAR(100),
    slug VARCHAR(255) UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE external_teams (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    external_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, external_id)
);

CREATE TABLE fixtures (
    id SERIAL PRIMARY KEY,
    competition_id INTEGER REFERENCES competitions(id),
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    start_at TIMESTAMPTZ NOT NULL,
    slug VARCHAR(255) UNIQUE,
    round VARCHAR(50),
    phase VARCHAR(100),
    status VARCHAR(50),
    venue VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE external_matches (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, external_id)
);

CREATE TABLE broadcast_sources (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- TV, STREAMING, FREE_STREAMING, UNKNOWN
    official_url TEXT,
    logo_url TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(canonical_name)
);

CREATE TABLE broadcasts (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES broadcast_sources(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    url TEXT,
    cta VARCHAR(50),
    type VARCHAR(50),
    is_free BOOLEAN,
    transmission_id VARCHAR(100),
    source_match_id VARCHAR(100),
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fixture_id, source_id)
);

-- Ativa RLS para o Frontend conseguir ler de forma segura via Supabase Anon Key
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON competitions FOR SELECT USING (true);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON teams FOR SELECT USING (true);

ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON fixtures FOR SELECT USING (true);

ALTER TABLE broadcast_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON broadcast_sources FOR SELECT USING (true);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura publica" ON broadcasts FOR SELECT USING (true);
