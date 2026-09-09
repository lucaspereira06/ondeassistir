# Especificação Técnica: Plataforma de Onde Assistir Jogos de Futebol

Este documento detalha os requisitos, arquitetura e plano de implementação para o desenvolvimento do sistema automatizado de catálogo e descoberta de transmissões esportivas (TV Aberta, Fechada, Streaming e YouTube).

---

## 1. Visão Geral do Produto

O objetivo é disponibilizar uma aplicação web responsiva onde o torcedor possa consultar, em segundos, em quais canais ou plataformas de streaming os jogos de futebol da semana serão transmitidos.

### Princípios do Sistema

* **Janela Deslizante de 7 Dias:** A plataforma mantém sempre uma grade futura previsível de 7 dias ($D+0$ a $D+7$).
* **Arquitetura Híbrida de Coleta:** Separação estrita entre a **estrutura do confronto** (horário, times, logos) e o **enriquecimento da transmissão** (canais e links).
* **Consumo Eficiente de Quotas:** Utilização de no máximo 2 a 5 chamadas diárias do Free Tier da API-Football (limite de 100/dia).
* **Degradação Suave:** Partidas com grade ainda não divulgada exibem o estado `aguardando_definicao` sem quebrar a interface.

---

## 2. Arquitetura da Solução

```
[ Agendador Diário (GitHub Actions / Cron Worker) ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Etapa 1: Seed D+7 ]       [ Etapa 2: Enriquecimento D0..D+2 ]
  API-Football (v3)           ├─ YouTube Data API v3 (CazéTV, Goat)
  ↳ 1 req/dia (/fixtures)     └─ Guia Consolidado (JSON Interno / Feed)
        │                           │
        └─────────────┬─────────────┘
                      ▼
       [ Camada de Normalização & Fuzzy Match ]
                      │
                      ▼
        [ Banco de Dados (Supabase / Postgres) ]
                      │
                      ▼
         [ Frontend Web (Astro / Next.js) ]

```

---

## 3. Estratégia de Dados e Ingestão

### 3.1. Seed de Partidas (API-Football)

* **Endpoint:** `GET /fixtures?date={YYYY-MM-DD}&timezone=America/Sao_Paulo`
* **Frequência:** 1x ao dia às 04:00 (UTC-3), consultando a data de $D+7$.
* **Filtro de Relevância (Whitelist de Ligas):**
* Brasileirão Série A (ID: 71)
* Brasileirão Série B (ID: 72)
* Copa do Brasil (ID: 73)
* CONMEBOL Libertadores (ID: 13)
* CONMEBOL Sul-Americana (ID: 11)
* UEFA Champions League (ID: 2)
* Premier League (ID: 39)
* La Liga (ID: 140)



### 3.2. Enriquecimento de Transmissões

* **Frequência:** 3x ao dia (06:00, 12:00 e 17:00 UTC-3) para os dias $D+0$, $D+1$ e $D+2$.
* **Fontes:**
* **YouTube Data API v3:** Busca por lives/eventos agendados nos canais monitorados via `search.list(channelId, eventType=upcoming/live)`.
* **Guias Digitais:** Extração pontual de feeds/APIs internas de canais lineares (Globo, SporTV, Premiere, ESPN/Disney+, Max, Prime Video).


* **Fuzzy Matching:** Associação dos nomes das transmissões encontradas com a chave única da partida no banco.

---

## 4. Modelagem do Banco de Dados

```sql
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

```

### Estrutura do Campo `transmissoes` (JSONB)

```json
[
  {
    "nome": "CazéTV",
    "tipo": "youtube",
    "gratuito": true,
    "url": "https://youtube.com/watch?v=..."
  },
  {
    "nome": "Premiere",
    "tipo": "pay_per_view",
    "gratuito": false,
    "url": null
  }
]

```

---

## 5. Algoritmos e Lógica de Negócio

### 5.1. Geração de Chave Determinística

Normaliza nomes removendo diacríticos, pontuação e caracteres especiais para evitar incompatibilidades entre fontes:

$$\text{Chave} = \text{Data} + \text{"\_"} + \text{Slug}(\text{Time Casa}) + \text{"\_"} + \text{Slug}(\text{Time Fora})$$

*Exemplo:* `2026-09-12_flamengo_palmeiras`

### 5.2. Pipeline Diário de Execução

```
INÍCIO DO JOB DIÁRIO:
  1. Definir data_alvo = HOJE + 7 DIAS
  2. Executar GET na API-Football para data_alvo
  3. Filtrar partidas pertencentes à whitelist de campeonatos
  4. Para cada partida:
       - Montar chave_jogo
       - Realizar UPSERT em partidas mantendo transmissões existentes
  5. Para cada data em [HOJE, HOJE + 1, HOJE + 2]:
       - Coletar transmissões do YouTube e guias diários
       - Localizar registro correspondente via chave_jogo ou similaridade
       - SE encontrado:
           Atualizar transmissoes = canais_encontrados
           Atualizar status_transmissao = 'confirmado'
  6. Arquivar ou marcar jogos anteriores a HOJE - 1 DIA
FIM DO JOB

```

---

## 6. Requisitos de Frontend e UX

### Visualização e Filtros

* **Navegação Temporal:** Barra horizontal com abas seletoras:
* `Hoje` | `Amanhã` | `Próximos 7 Dias`


* **Filtros Dinâmicos:**
* Por campeonato (tags com escudo do torneio).
* Por tipo de transmissão: *Apenas Gratuitos (YouTube/TV Aberta)*, *Streaming*, *Canais Pagos*.
* Campo de busca rápida por nome do clube.



### Estados do Card de Jogo

* **Transmissão Confirmada:** Lista de logos ou badges dos canais. Se for YouTube ou Twitch, o card inclui o link direto para a transmissão.
* **Aguardando Definição:** Badge neutro indicando que as operadoras de TV e plataformas ainda não divulgaram a escala oficial para aquela data.

---

## 7. Orquestração e Custos Estimados

| Recurso | Função | Tier / Ferramenta | Custo Estimado |
| --- | --- | --- | --- |
| **API-Football** | Grade estrutural ($D+7$) | Free Tier (100 req/dia) | R$ 0,00 |
| **YouTube Data API v3** | Coleta de transmissões gratuitas | Cota diária gratuita (10.000 pts) | R$ 0,00 |
| **Banco de Dados** | Armazenamento e índices | Supabase Free / PostgreSQL | R$ 0,00 |
| **Scheduler** | Execução dos scripts de coleta | GitHub Actions (Cron) | R$ 0,00 |
| **Hospedagem Web** | Interface do usuário | Cloudflare Pages / Vercel | R$ 0,00 |

---

## 8. Guia para Desenvolvimento no Antigravity

Para conduzir a implementação pelo **Antigravity**, siga esta ordem de sprints:

1. **Sprint 1 (Banco de Dados):** Aplicar o script DDL no PostgreSQL/Supabase com as tabelas `campeonatos`, `partidas` e seus respectivos índices.
2. **Sprint 2 (Pipeline de Seed):** Implementar o script Python ou TypeScript responsável por consumir a API-Football para a data $D+7$, aplicando a whitelist de ligas e gravando os registros via `UPSERT`.
3. **Sprint 3 (Pipeline de Enriquecimento):** Criar os conectores da YouTube API v3 e scrapers/parsers de guias de TV para alimentar o campo `transmissoes` dos dias $D+0$ a $D+2$.
4. **Sprint 4 (Interface Web):** Construir as telas de listagem, navegação por abas de data e badges de transmissão com busca por time.
5. **Sprint 5 (Automação CI/CD):** Configurar os arquivos de workflow do GitHub Actions com as chaves de API guardadas em *Secrets*.