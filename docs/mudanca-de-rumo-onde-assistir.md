# Mudança de rumo — Plataforma “Onde Assistir?”

## 1. Resumo executivo

O projeto muda de paradigma na camada de dados.

### Antes

A arquitetura considerava:

```text
API-Football
    ↓
Fixtures D0–D7
    ↓
Descoberta de transmissão
    ↓
GE / UOL / fontes adicionais
    ↓
Normalização
    ↓
Banco
```

A API-Football seria a fonte principal dos jogos e precisaríamos construir uma segunda camada para descobrir onde cada partida seria transmitida.

### Agora

A descoberta do `championshipEditionAgenda` do GE mostrou que o próprio backend do GE entrega, em uma única estrutura:

- partidas;
- data;
- horário;
- times;
- competição;
- fase;
- status futuro/passado;
- fontes de transmissão (`liveWatchSources`);
- links de plataformas quando disponíveis;
- informações da página de transmissão.

A mudança de paradigma é:

```text
GE GraphQL
    ↓
Agenda de uma competição + período
    ↓
Jogos + transmissões
    ↓
Normalização
    ↓
Nosso banco
    ↓
Produto “Onde Assistir?”
```

A API-Football deixa de ser obrigatória. Pode permanecer como fonte complementar, validação ou fallback, caso os testes de cobertura demonstrem necessidade.

---

# 2. Objetivo do produto permanece o mesmo

O produto não deve se transformar em um portal de futebol.

A proposta continua sendo:

> **A pessoa quer assistir a um jogo. Ela pesquisa o jogo e descobre rapidamente onde assistir.**

Fluxo principal:

```text
Entrar
  ↓
Encontrar o jogo
  ↓
Ver onde assistir
  ↓
Ir para a transmissão
```

O layout já construído pode ser mantido.

A mudança é principalmente no **motor de dados e na arquitetura de ingestão**, não na experiência visual.

---

# 3. Nova fonte principal de dados

## Endpoint

O endpoint descoberto é:

```text
https://geql.globo.com/graphql
```

A operação utilizada é:

```text
championshipEditionAgenda
```

Exemplo:

```text
https://geql.globo.com/graphql?operationName=championshipEditionAgenda&variables=...
```

A estrutura das variáveis é:

```json
{
  "championshipSlug": "taca-libertadores",
  "editionSlug": "libertadores-2026",
  "startDate": "2026-09-09",
  "endDate": "2026-09-29"
}
```

A chamada utiliza GraphQL persisted query:

```json
{
  "persistedQuery": {
    "version": 1,
    "sha256Hash": "56dca51afdf3f49839e211298d60e25e68ad06dcc2d41f973d8aaa21f5e977a6"
  }
}
```

**Importante:** não assumir que o hash, slugs ou schema permanecerão estáveis. Eles devem ser tratados como configuração da integração GE e monitorados.

---

# 4. Estrutura JSON retornada

A resposta possui a estrutura principal:

```json
{
  "data": {
    "championshipEditionAgenda": {
      "past": [],
      "now": [],
      "future": []
    }
  }
}
```

Cada item da agenda possui:

```json
{
  "__typename": "MatchEventKind",
  "match": {
    "id": 356532,
    "startDate": "2026-09-09",
    "startHour": "19:00:00",
    "round": null,
    "moment": "FUTURE",
    "scoreboard": {
      "away": null,
      "home": null,
      "penalty": null
    },
    "secondContestant": {
      "id": 2419,
      "popularName": "LDU",
      "name": "Liga Deportiva Universitária de Quito",
      "badgeSvg": "...",
      "badgePng": "..."
    },
    "firstContestant": {
      "id": 275,
      "popularName": "Palmeiras",
      "name": "Sociedade Esportiva Palmeiras",
      "badgeSvg": "...",
      "badgePng": "..."
    },
    "result": null,
    "phase": {
      "name": "Quartas de final",
      "championshipEdition": {
        "championship": {
          "name": "Taça Conmebol Libertadores"
        }
      }
    },
    "liveWatchSources": [],
    "transmission": null,
    "location": {
      "popularName": "Nubank Parque"
    }
  },
  "editorialData": {
    "video": null,
    "url": "",
    "hasLiveCoverage": false
  }
}
```

---

# 5. Campo mais importante: `liveWatchSources`

Este passa a ser o núcleo da funcionalidade “Onde Assistir?”.

Exemplo:

```json
"liveWatchSources": [
  {
    "name": "Paramount+",
    "description": "",
    "url": "",
    "cta": "",
    "officialLogoUrl": "...",
    "highlightLogoUrl": "...",
    "transmissionId": 13,
    "__typename": "EventsLiveWatchSource"
  }
]
```

Outro exemplo real encontrado:

```json
"liveWatchSources": [
  {
    "name": "Globo",
    "description": "Confira a programação local",
    "url": "https://redeglobo.globo.com/programacao/",
    "cta": "Programação",
    "transmissionId": 6
  },
  {
    "name": "globoplay",
    "description": "Globoplay Plano Premium",
    "url": "...",
    "cta": "Assine",
    "transmissionId": 8
  },
  {
    "name": "Paramount+",
    "description": "",
    "url": "",
    "cta": "",
    "transmissionId": 13
  },
  {
    "name": "Ge TV",
    "description": "Ao vivo, de graça e com imagens!",
    "url": "https://globoplay.globo.com/categorias/esportes/",
    "cta": "Assista",
    "transmissionId": 32
  }
]
```

Portanto, cada item deve ser tratado como uma **fonte de exibição**, não simplesmente como texto.

---

# 6. O que NÃO usar como fonte principal de transmissão

O objeto:

```json
"transmission": { ... }
```

não deve ser interpretado como equivalente a `liveWatchSources`.

Foram observados casos em que:

```json
"liveWatchSources": [
  {
    "name": "Disney+"
  }
],
"transmission": null
```

Também foram observados jogos futuros com:

```json
"transmission": {
  "broadcastStatus": {
    "id": "PRE_DIA",
    "label": "FIQUE POR DENTRO"
  }
}
```

Portanto:

### `liveWatchSources`

É a fonte primária para:

> Onde assistir?

### `transmission`

É metadado complementar da transmissão/página do GE.

Não depender de `transmission` para descobrir as plataformas.

---

# 7. Exemplo real — Palmeiras x LDU

Dados observados:

```json
{
  "id": 356532,
  "startDate": "2026-09-09",
  "startHour": "19:00:00",
  "moment": "FUTURE",
  "firstContestant": {
    "id": 275,
    "popularName": "Palmeiras"
  },
  "secondContestant": {
    "id": 2419,
    "popularName": "LDU"
  },
  "phase": {
    "name": "Quartas de final"
  },
  "liveWatchSources": [
    {
      "name": "Paramount+",
      "transmissionId": 13
    }
  ]
}
```

Isso já é suficiente para alimentar:

```text
Palmeiras x LDU
19:00
Paramount+
```

---

# 8. Exemplo real — Estudiantes x Corinthians

O retorno fornece:

```text
19:30
Estudiantes x Corinthians
```

e:

```text
Globo
globoplay
Paramount+
Ge TV
```

Além disso, a GE TV possui descrição explícita:

```text
Ao vivo, de graça e com imagens!
```

Esse tipo de informação pode posteriormente ser utilizado pelo produto para indicar disponibilidade gratuita.

---

# 9. Novo conceito de banco

O banco não deve ser um espelho do JSON do GE.

Devemos criar nosso próprio modelo de domínio.

A fonte externa é apenas uma origem de dados.

Modelo conceitual:

```text
Competition
    │
    └── Fixture
           │
           ├── HomeTeam
           ├── AwayTeam
           └── Broadcast
                    │
                    └── BroadcastSource
```

---

# 10. Tabela `competitions`

Representa a competição/edição usada pelo produto.

Campos sugeridos:

```text
competitions
-----------------------------
id
name
slug
edition_name
edition_slug
provider
enabled
created_at
updated_at
```

Exemplo:

```text
id: 1
name: Taça Conmebol Libertadores
slug: taca-libertadores
edition_name: Libertadores 2026
edition_slug: libertadores-2026
provider: GE
enabled: true
```

---

# 11. Tabela `teams`

Representa os times dentro do nosso domínio.

```text
teams
-----------------------------
id
name
short_name
popular_name
logo_url
created_at
updated_at
```

---

# 12. Tabela `external_teams`

Não devemos depender do ID do GE.

```text
external_teams
-----------------------------
id
team_id
provider
external_id
external_name
created_at
updated_at
```

Exemplo:

```text
team_id: 123
provider: GE
external_id: 264
external_name: Corinthians
```

Isso permite posteriormente:

```text
Corinthians
 ├── GE: 264
 ├── API-Football: XXXXX
 └── outro provider: XXXXX
```

---

# 13. Tabela `fixtures`

Essa é a entidade principal do nosso produto.

```text
fixtures
-----------------------------
id
competition_id
home_team_id
away_team_id
external_match_id
start_at
round
phase
status
venue
created_at
updated_at
```

Sugestão:

```text
external_match_id
```

não deve ser considerado como ID universal.

Ele representa o ID do jogo no provider atual.

Para suportar múltiplas fontes, pode ser melhor normalizar isso em uma tabela própria.

---

# 14. Tabela `external_matches`

Recomendação:

```text
external_matches
-----------------------------
id
fixture_id
provider
external_id
source_url
created_at
updated_at
```

Exemplo:

```text
fixture_id: 10001
provider: GE
external_id: 356528
source_url: https://ge.globo.com/...
```

No futuro:

```text
fixture_id: 10001
provider: API_FOOTBALL
external_id: 123456
```

Isso permite múltiplas fontes para o mesmo jogo.

---

# 15. Tabela `broadcasts`

Representa uma ocorrência de transmissão associada ao jogo.

```text
broadcasts
-----------------------------
id
fixture_id
source_id
name
description
url
cta
type
is_free
transmission_id
source_match_id
collected_at
updated_at
```

Campos importantes:

### `name`

Nome apresentado pelo GE:

```text
Globo
Premiere
Paramount+
Disney+
Ge TV
Prime Vídeo
sportv
globoplay
```

### `type`

Não confiar somente no nome. Normalizar:

```text
TV
STREAMING
FREE_STREAMING
UNKNOWN
```

### `is_free`

Pode inicialmente ser:

```text
NULL
```

e só receber `true` quando houver evidência clara.

Não inferir gratuitamente apenas porque `url` está vazia.

### `transmission_id`

ID fornecido pelo GE:

```text
5 = Premiere
6 = Globo
13 = Paramount+
32 = Ge TV
```

Esse campo deve ser tratado como identificador externo, não como nossa regra de negócio.

---

# 16. Tabela `broadcast_sources`

Catálogo normalizado das plataformas.

```text
broadcast_sources
-----------------------------
id
canonical_name
type
official_url
logo_url
enabled
created_at
updated_at
```

Exemplo:

```text
canonical_name: Paramount+
type: STREAMING
```

Isso permite transformar:

```text
"Paramount+"
"paramount plus"
```

em uma única entidade, caso outras fontes sejam adicionadas.

---

# 17. Tabela opcional `data_sources`

Recomendada para permitir evolução da arquitetura.

```text
data_sources
-----------------------------
id
name
provider_type
base_url
priority
enabled
created_at
updated_at
```

Exemplo:

```text
GE
API_FOOTBALL
UOL
```

Isso permite futuramente:

```text
GE → prioridade 1
Fonte secundária → prioridade 2
API-Football → fixtures/validação
```

---

# 18. Relacionamento final

```text
competition
     │
     ▼
  fixture
   │    │
   │    ├────────── home_team
   │    │
   │    └────────── away_team
   │
   ├── external_match
   │       └── GE / outros providers
   │
   └── broadcast
          │
          └── broadcast_source
```

---

# 19. Pipeline de ingestão

## Etapa 1 — catálogo de competições

Manter uma configuração:

```json
[
  {
    "championshipSlug": "taca-libertadores",
    "editionSlug": "libertadores-2026",
    "enabled": true
  }
]
```

Exemplo:

```json
[
  {
    "championshipSlug": "taca-libertadores",
    "editionSlug": "libertadores-2026"
  },
  {
    "championshipSlug": "...",
    "editionSlug": "..."
  }
]
```

Não codificar os campeonatos diretamente no serviço.

---

# 20. Etapa 2 — coleta

Para cada competição:

```text
startDate = hoje
endDate = hoje + N dias
```

Inicialmente:

```text
N = 7
```

Executar:

```text
championshipEditionAgenda
```

---

# 21. Etapa 3 — transformação

Para cada `MatchEventKind`:

```text
match.id
startDate
startHour
firstContestant
secondContestant
phase
championship
location
liveWatchSources
```

transformar para o nosso domínio.

---

# 22. Etapa 4 — resolução dos times

Usar:

```text
provider = GE
external_id = match.firstContestant.id
```

e:

```text
provider = GE
external_id = match.secondContestant.id
```

Não fazer matching por nome se o ID externo já estiver disponível.

O nome pode ser usado para exibição e diagnóstico.

---

# 23. Etapa 5 — identificação do jogo

A combinação preferencial é:

```text
provider + external_match_id
```

Se o jogo já existir:

```text
UPDATE
```

Caso contrário:

```text
INSERT
```

Não criar jogos duplicados a cada sincronização.

---

# 24. Etapa 6 — sincronização de transmissões

Para cada:

```text
liveWatchSources[]
```

fazer upsert.

Chave lógica sugerida:

```text
fixture_id + source_id
```

ou:

```text
fixture_id + normalized_source_name
```

Nunca depender exclusivamente de `transmissionId`, pois ele pertence ao provider.

---

# 25. Atualização

A primeira versão pode executar:

```text
1x por dia
```

Mas a arquitetura deve permitir frequência maior.

Sugestão:

```text
Jogos D+7 → atualização diária

Jogos D+3 → atualização mais frequente

Jogos D+1 → atualização mais frequente

Jogos D0 → atualização frequente
```

O objetivo é capturar alterações de transmissão.

---

# 26. Tratamento de transmissão ausente

Se:

```json
"liveWatchSources": []
```

ou:

```json
"liveWatchSources": null
```

não assumir:

> “Não existe transmissão.”

O correto é:

```text
broadcast_status = UNKNOWN
```

ou simplesmente não criar registros de broadcast.

Isso é importante porque a informação pode ainda não ter sido publicada.

---

# 27. Tratamento de fontes irrelevantes

O GE pode retornar itens que não representam efetivamente uma opção de assistir ao jogo.

Exemplo observado:

```text
Cartola
```

Mesmo aparecendo em `liveWatchSources`, não deve automaticamente ser tratado como transmissão.

Criar regras de normalização:

```text
Cartola → IGNORE
```

e permitir manutenção desse catálogo.

A regra deve ser configurável, não espalhada pelo código.

---

# 28. Normalização das plataformas

Criar um catálogo:

```text
GE TV
Globo
sportv
Premiere
Globoplay
Disney+
Paramount+
Prime Vídeo
Record
CazéTV
SBT
ESPN
TNT Sports
Max
```

A lista inicial deve ser derivada dos dados efetivamente encontrados.

Novas plataformas devem poder ser adicionadas sem alteração estrutural.

---

# 29. O que acontece com a API-Football

Ela deixa de ser o coração do produto.

### Antes

```text
API-Football = fonte primária dos jogos
```

### Agora

```text
GE = fonte primária do catálogo de jogos + transmissão
```

API-Football pode ser utilizada para:

### A. Validação

Comparar:

```text
GE
vs
API-Football
```

e detectar jogos ausentes.

### B. Fallback

Caso o GE não cubra determinada competição.

### C. Enriquecimento futuro

Se precisarmos de:

- estatísticas;
- eventos;
- escalações;
- odds;
- informações adicionais.

Mas essas funcionalidades não fazem parte do MVP.

---

# 30. Nova prioridade técnica

Antes de desenvolver novas funcionalidades, fazer um teste de cobertura.

Para uma janela de 7 dias:

```text
Total de jogos GE
Total de jogos com transmissão
Total de jogos sem transmissão
Total por competição
```

Exemplo:

```text
Brasileirão
    100 jogos
     97 com transmissão
      3 sem transmissão

Libertadores
     16 jogos
     16 com transmissão
      0 sem transmissão
```

O objetivo é determinar se o GE pode ser a fonte única do MVP.

---

# 31. Validação cruzada

Durante o período inicial, manter a API-Football apenas como ferramenta de comparação.

Comparar:

```text
GE fixture
        ↕
API-Football fixture
```

Critérios de matching:

```text
home team
away team
date
hora aproximada
competition
```

Não assumir que:

```text
GE match.id == API-Football fixture.id
```

São identificadores de sistemas diferentes.

---

# 32. Estratégia de matching entre providers

Normalizar:

```text
nome do time
data
horário
competição
```

Exemplo:

```text
GE:
Estudiantes

API-Football:
Estudiantes de La Plata
```

Criar aliases quando necessário.

Idealmente:

```text
team
 ├── external_team GE
 ├── external_team API_FOOTBALL
 └── ...
```

Assim o matching ocorre através da entidade `team`, e não através de comparação textual permanente.

---

# 33. Frontend

**Não há necessidade de reconstruir o layout já desenvolvido.**

A interface atual pode continuar.

A alteração deve ocorrer no contrato entre frontend e backend.

O frontend não deve conhecer o JSON do GE.

Ele deve consumir nosso próprio DTO.

Exemplo:

```json
{
  "id": "10001",
  "date": "2026-09-09",
  "time": "19:00",
  "homeTeam": {
    "name": "Palmeiras",
    "logo": "..."
  },
  "awayTeam": {
    "name": "LDU",
    "logo": "..."
  },
  "competition": {
    "name": "Libertadores"
  },
  "broadcasts": [
    {
      "name": "Paramount+",
      "type": "STREAMING",
      "url": null
    }
  ]
}
```

O frontend permanece desacoplado do provider.

---

# 34. Endpoint interno sugerido

Exemplo:

```http
GET /api/matches/today
```

Resposta:

```json
{
  "date": "2026-09-09",
  "matches": [
    {
      "id": "10001",
      "startAt": "2026-09-09T19:00:00-03:00",
      "homeTeam": {
        "name": "Palmeiras",
        "logoUrl": "..."
      },
      "awayTeam": {
        "name": "LDU",
        "logoUrl": "..."
      },
      "competition": {
        "name": "Libertadores"
      },
      "broadcasts": [
        {
          "name": "Paramount+",
          "type": "STREAMING",
          "url": null
        }
      ]
    }
  ]
}
```

---

# 35. Separação entre ingestão e aplicação

Não fazer:

```text
Frontend → GE GraphQL
```

A arquitetura deve ser:

```text
                    GE GraphQL
                         │
                         ▼
                 Ingestion Worker
                         │
                         ▼
                   Normalização
                         │
                         ▼
                     Database
                         │
                         ▼
                       API
                         │
                         ▼
                     Frontend
```

Isso é fundamental.

O frontend não deve depender diretamente do GE.

---

# 36. Benefícios da mudança de paradigma

## Antes

Precisávamos resolver dois problemas:

```text
1. Onde estão os jogos?
2. Onde assistir aos jogos?
```

## Agora

O GE aparentemente resolve os dois:

```text
1. Jogos
2. Onde assistir
```

Nossa aplicação passa a resolver:

```text
3. Como organizar isso de forma simples para o usuário.
```

Esse é um problema muito menor.

---

# 37. Novo diferencial do produto

Não competir com o GE em conteúdo.

Não competir com portais esportivos.

Não competir com aplicativos de estatística.

A proposta é:

> **Uma interface extremamente rápida e objetiva para responder “onde assistir a este jogo?”.**

O valor está na simplificação.

```text
GE
→ conteúdo esportivo + agenda + notícias + transmissão

Nosso produto
→ “Onde assistir?”
```

---

# 38. SEO continua sendo importante

As páginas podem continuar sendo geradas pelo nosso banco:

```text
/jogos-hoje
/jogo/palmeiras-ldu
/jogo/estudiantes-corinthians
/palmeiras-onde-assistir
/flamengo-onde-assistir
```

O conteúdo passa a ser gerado automaticamente a partir dos dados ingeridos.

---

# 39. Considerações sobre uso do endpoint

Tecnicamente, o endpoint GraphQL está sendo utilizado pelo ecossistema do GE.

Isso não significa, por si só, que exista autorização para uso comercial automatizado dos dados.

Antes de colocar o coletor em produção, verificar:

- termos de uso;
- política aplicável;
- robots.txt quando pertinente;
- limites de requisição;
- possibilidade de uso comercial;
- necessidade de atribuição;
- eventuais mecanismos de bloqueio.

Não implementar bypass de autenticação, proteção ou mecanismos anti-bot.

A arquitetura deve permitir substituir o provider caso o uso deixe de ser viável.

---

# 40. Abstração obrigatória do provider

Criar uma interface conceitual:

```text
FootballDataProvider
```

com operações como:

```text
getCompetitions()
getFixtures(startDate, endDate)
getBroadcasts(...)
```

Implementação inicial:

```text
GEProvider
```

Futuras:

```text
ApiFootballProvider
SportmonksProvider
TheSportsDBProvider
```

Isso evita que o domínio fique acoplado ao GE.

---

# 41. Estrutura sugerida do projeto

Exemplo:

```text
/src
  /domain
    /competition
    /team
    /fixture
    /broadcast

  /providers
    /ge
      GEClient
      GEMapper
      GEProvider

  /ingestion
    FixtureSyncService
    BroadcastSyncService

  /api
    MatchController
    CompetitionController

  /infrastructure
    database
    scheduler
```

---

# 42. Ordem de implementação

## Fase 1 — validação

1. Catalogar competições.
2. Executar `championshipEditionAgenda`.
3. Coletar 7 dias.
4. Medir cobertura.
5. Comparar com API-Football.

## Fase 2 — ingestão

1. Criar `Competition`.
2. Criar `Team`.
3. Criar `ExternalTeam`.
4. Criar `Fixture`.
5. Criar `ExternalMatch`.
6. Criar `BroadcastSource`.
7. Criar `Broadcast`.
8. Implementar upsert.

## Fase 3 — API

Criar endpoints internos para:

```text
jogos de hoje
jogos por data
buscar jogo
buscar jogos por time
buscar jogos por competição
```

## Fase 4 — frontend

Reutilizar o layout existente.

Alterar apenas a origem dos dados.

## Fase 5 — SEO

Gerar páginas indexáveis de:

```text
jogos hoje
jogo específico
time + onde assistir
```

---

# 43. MVP revisado

O MVP deve entregar:

### Home

```text
Onde assistir?

[ Buscar jogo, time ou campeonato ]

Jogos de hoje
```

### Lista

```text
19:00
Palmeiras x LDU

Paramount+
```

### Detalhe

```text
Palmeiras x LDU
19:00
Libertadores

Onde assistir:

Paramount+

[ Assistir ]
```

Nenhuma outra funcionalidade é necessária para validar a hipótese.

---

# 44. O que NÃO implementar agora

Não adicionar ao MVP:

- notícias;
- resultados históricos;
- estatísticas;
- escalações;
- comentários;
- fórum;
- fantasy;
- apostas;
- notificações;
- login obrigatório;
- favoritos;
- conteúdo editorial;
- vídeos próprios;
- scraping de múltiplos portais;
- API paga de transmissão.

Essas funcionalidades podem ser avaliadas depois da validação do produto.

---

# 45. Paradigma final

A mudança mais importante não é tecnológica.

É de **produto e arquitetura**.

### Antes:

> “Precisamos construir um agregador que descubra onde cada jogo é transmitido.”

### Agora:

> “Os dados estruturados de agenda e transmissão já existem. Nosso produto deve organizar, simplificar e apresentar esses dados melhor para a tarefa específica do usuário.”

Portanto:

```text
        DADOS
          │
          ▼
      GE GraphQL
          │
          ▼
      NORMALIZAÇÃO
          │
          ▼
       NOSSO DB
          │
          ▼
       NOSSA API
          │
          ▼
      NOSSO LAYOUT
          │
          ▼
    “ONDE ASSISTIR?”
```

O investimento técnico deixa de estar concentrado em **descobrir fontes de transmissão** e passa a estar concentrado em:

1. qualidade da ingestão;
2. cobertura;
3. atualização;
4. normalização;
5. experiência de busca;
6. SEO;
7. velocidade.

Essa é a nova direção do projeto.
