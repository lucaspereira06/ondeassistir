-- Extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE campeonatos (
    id INT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    logo_url TEXT
);

CREATE TABLE partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id_api INT UNIQUE, -- ID original da API-Football
    chave_jogo VARCHAR(150) UNIQUE NOT NULL, -- Formato: YYYY-MM-DD_mandante_visitante
    campeonato_id INT REFERENCES campeonatos(id),
    campeonato_nome VARCHAR(100) NOT NULL,
    data_jogo DATE NOT NULL,
    horario TIME,
    rodada VARCHAR(50),
    time_casa_nome VARCHAR(100) NOT NULL,
    time_casa_logo TEXT,
    time_fora_nome VARCHAR(100) NOT NULL,
    time_fora_logo TEXT,
    transmissoes JSONB DEFAULT '[]'::jsonb,
    status_transmissao VARCHAR(30) DEFAULT 'aguardando_definicao', 
    -- Valores possíveis: 'aguardando_definicao', 'confirmado', 'sem_transmissao'
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de alta performance para a aplicação
CREATE INDEX idx_partidas_data ON partidas(data_jogo);
CREATE INDEX idx_partidas_status ON partidas(status_transmissao);
CREATE INDEX idx_partidas_chave ON partidas(chave_jogo);

-- Controle de execuções do Seed
CREATE TABLE seed_logs (
    data_alvo DATE PRIMARY KEY,
    executado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quantidade_partidas INT
);
