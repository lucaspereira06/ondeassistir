Especificação — Páginas Dinâmicas
1. Objetivo

Transformar cada partida, time e competição em páginas indexáveis individualmente, mantendo a Home como principal interface de consulta.

A plataforma passa a ter três níveis:

HOME
│
├── Jogos
│   └── Página individual da partida
│
├── Times
│   └── Página individual do time
│
└── Competições
    └── Página individual da competição

A finalidade principal das páginas não é adicionar funcionalidades, mas:

aumentar aquisição via Google;
responder diretamente pesquisas como "Flamengo onde assistir";
criar URLs compartilháveis;
criar oportunidades adicionais de publicidade;
preparar posteriormente links afiliados;
criar uma rede de links internos entre jogos, times e competições.
2. Estrutura de URLs

Eu usaria URLs simples e previsíveis.

Jogos
/jogo/{slug}

Exemplo:

/jogo/flamengo-independiente-del-valle
Jogos de hoje
/jogos-hoje
Jogos por data
/jogos/2026-09-09
Time
/time/{slug}

Exemplo:

/time/flamengo
Competição
/campeonato/{slug}

Exemplo:

/campeonato/libertadores
Opcional posteriormente
/time/{slug}/jogos
/campeonato/{slug}/jogos

Mas não considero necessário inicialmente. A própria página do time/competição pode apresentar os próximos jogos.

3. Página /jogo/{slug}

Essa é a página mais importante da nova arquitetura.

Ela deve ser construída para responder imediatamente:

Onde assistir esse jogo?

Estrutura
┌────────────────────────────────────────────┐
│ Header                                     │
├────────────────────────────────────────────┤
│ Breadcrumb                                 │
│ Início > Libertadores > Flamengo x LDU    │
├────────────────────────────────────────────┤
│                                            │
│ Flamengo        x        LDU                │
│                                            │
│ Hoje • 19:00                               │
│ Quartas de final                           │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│              ONDE ASSISTIR                 │
│                                            │
│       🟣 Paramount+                        │
│       [Assistir]                           │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│         Próximos jogos do Flamengo        │
│                                            │
├────────────────────────────────────────────┤
│                                            │
│       Outros jogos da Libertadores        │
│                                            │
└────────────────────────────────────────────┘
4. Cabeçalho da partida

Exibir:

escudo do mandante;
nome do mandante;
escudo do visitante;
nome do visitante;
data;
horário;
competição;
fase/rodada, quando disponível;
local/estádio, quando disponível;
status da partida.
Exemplo

Palmeiras x LDU

Hoje, 19:00
Libertadores — Quartas de final

Se a partida já terminou:

Palmeiras 2 x 1 LDU

Mas o foco continua sendo transmissão.

5. Bloco "Onde assistir"

Esse deve ser o elemento visual mais importante da página.

Exemplo:

Onde assistir

Paramount+

Streaming

[ Assistir ]

Caso existam vários:

Onde assistir
Plataforma	Tipo	Ação
Globo	TV	Assistir
Paramount+	Streaming	Assistir
GE TV	Streaming gratuito	Assistir
Regra importante

Não assumir:

broadcast vazio = não transmite

O sistema deve diferenciar:

TRANSMISSÃO CONFIRMADA

de:

TRANSMISSÃO AINDA NÃO INFORMADA

Se liveWatchSources estiver vazio:

A transmissão ainda não foi divulgada.

Isso é muito melhor do que:

"Não tem onde assistir."

6. Links das plataformas

A entidade broadcast_source deve permitir:

official_url
affiliate_url

Inicialmente:

official_url

Posteriormente:

affiliate_url

O frontend não precisa mudar.

Se houver afiliado:

[ Assistir na Paramount+ ]

Se não houver:

[ Ver Paramount+ ]
7. Página /jogos-hoje

Essa página é uma versão SEO da Home.

Título:

Jogos de hoje: onde assistir ao vivo

Estrutura:

H1: Jogos de hoje — 9 de setembro

19:00
Palmeiras x LDU
Libertadores
Paramount+

21:30
Estudiantes x Corinthians
Libertadores
Globo • Globoplay • Paramount+ • GE TV

...

Cada jogo deve possuir link:

/jogo/palmeiras-ldu
Objetivo

Capturar buscas como:

jogos hoje;
jogos de hoje;
futebol hoje;
jogos de futebol hoje;
onde assistir jogos hoje.
8. Página /jogos/{data}

Exemplo:

/jogos/2026-09-09

Essa página permite criar URLs permanentes para qualquer data.

H1:

Jogos de futebol em 9 de setembro de 2026

E os jogos daquele dia.

Isso também resolve um problema importante:

A página /jogos-hoje muda diariamente.

Já:

/jogos/2026-09-09

é uma URL permanente.

9. Página /time/{slug}

Exemplo:

/time/flamengo
Estrutura
H1: Jogos do Flamengo

Próximos jogos

10/09 — Flamengo x Independiente del Valle
21:30
Disney+

15/09 — Platense x Flamengo
19:00
Disney+

17/09 — Independiente del Valle x Flamengo
21:30
Disney+

Cada partida aponta para sua página individual.

Não transformar em página de notícias

Eu não colocaria:

notícias;
elenco;
contratações;
resultados históricos extensos;
estatísticas;
tabela;
artigos.

Isso desviaria o produto da proposta.

A página é:

"Quais jogos esse time tem e onde assistir?"

10. Página /campeonato/{slug}

Exemplo:

/campeonato/libertadores
Estrutura
H1: Libertadores — jogos e onde assistir

Próximos jogos

09/09
Palmeiras x LDU
19:00
Paramount+

09/09
Estudiantes x Corinthians
21:30
Globo • Globoplay • Paramount+ • GE TV

10/09
Independiente del Valle x Flamengo
21:30
Disney+

Também pode mostrar:

Onde assistir à Libertadores

Mas sem criar um texto editorial enorme.

11. Links internos

Essa parte é extremamente importante para SEO.

Cada página deve apontar para as outras.

Jogo
/jogo/flamengo-palmeiras

        ↓

/time/flamengo
/time/palmeiras
/campeonato/brasileirao
/jogos/2026-09-10
Time
/time/flamengo

        ↓

/jogo/flamengo-palmeiras
/jogo/flamengo-corinthians
/campeonato/libertadores
Campeonato
/campeonato/libertadores

        ↓

/jogo/...
/time/flamengo
/time/palmeiras
/jogos/2026-09-10

Isso cria uma estrutura de navegação natural:

              CAMPEONATO
             /           \
            /             \
         TIME ------------ JOGO
           \               /
            \             /
              DATA
12. SEO de cada página

As páginas devem ser renderizadas com SEO individual.

Jogo

Exemplo:

Title

Flamengo x LDU: onde assistir, horário e transmissão | Onde Assistir

Description

Saiba onde assistir Flamengo x LDU, o horário da partida e quais canais e plataformas transmitem o jogo ao vivo.

H1

Flamengo x LDU
Time
Title:
Jogos do Flamengo: onde assistir e próximos jogos | Onde Assistir
H1:
Jogos do Flamengo
Campeonato
Title:
Libertadores: jogos e onde assistir | Onde Assistir
Jogos de hoje
Title:
Jogos de hoje: onde assistir ao vivo | Onde Assistir
13. Schema.org

Eu colocaria dados estruturados nas páginas.

Para jogos, estudar o uso de:

SportsEvent

com:

nome;
data;
horário;
localização;
participantes;
competição;
status.

E, quando aplicável, informações de transmissão.

Isso ajuda os mecanismos de busca a compreenderem semanticamente a página.

Importante: schema não significa que o Google necessariamente exibirá um rich result. É principalmente uma forma de estruturar corretamente os dados.

14. Sitemap

A aplicação deve gerar automaticamente:

/sitemap.xml

ou sitemap index:

/sitemap.xml

apontando para:

/sitemaps/games.xml
/sitemaps/teams.xml
/sitemaps/championships.xml
/sitemaps/dates.xml

Eu prefiro separar porque o número de páginas pode crescer bastante.

15. Indexação

Aqui eu tomaria bastante cuidado.

Não indexar qualquer combinação de filtro.

Por exemplo:

/?team=flamengo&date=tomorrow&competition=libertadores

não deve gerar centenas de URLs indexáveis.

Os filtros da Home continuam sendo filtros da aplicação.

As únicas URLs indexáveis seriam as rotas canônicas que você definiu:

/jogos-hoje
/jogos/{data}
/jogo/{slug}
/time/{slug}
/campeonato/{slug}

Isso evita uma explosão de URLs duplicadas.

16. Jogos passados

Eu não apagaria as páginas de jogos antigos.

Exemplo:

/jogo/flamengo-palmeiras-2026-08-30

continua existindo.

Depois do jogo:

Flamengo 2 x 1 Palmeiras

Onde assistir:
A partida já foi realizada.

Isso é importante porque aquela URL pode continuar recebendo tráfego de buscas e compartilhamentos.

Mas é importante que o slug tenha algum mecanismo para evitar colisão.

Eu usaria internamente:

flamengo-palmeiras-2026-08-30

em vez de depender somente de:

flamengo-palmeiras
17. Dados necessários no backend

Você já possui praticamente tudo.

A API poderia disponibilizar:

GET /api/matches/today
GET /api/matches/{date}
GET /api/matches/{slug}

GET /api/teams/{slug}
GET /api/championships/{slug}

E a resposta de um jogo:

{
  "id": "12345",
  "slug": "flamengo-independiente-del-valle-2026-09-10",
  "date": "2026-09-10",
  "time": "21:30",
  "status": "SCHEDULED",

  "homeTeam": {
    "name": "Independiente del Valle",
    "slug": "independiente-del-valle",
    "logo": "..."
  },

  "awayTeam": {
    "name": "Flamengo",
    "slug": "flamengo",
    "logo": "..."
  },

  "competition": {
    "name": "Libertadores",
    "slug": "libertadores"
  },

  "phase": "Quartas de final",

  "broadcasts": [
    {
      "name": "Disney+",
      "type": "STREAMING",
      "url": null,
      "isFree": null
    }
  ]
}
18. Geração das páginas

Eu não criaria páginas físicas no filesystem.

Se você estiver usando Next.js, por exemplo:

app/
├── page
├── jogos-hoje/
│   └── page
├── jogos/
│   └── [date]/
│       └── page
├── jogo/
│   └── [slug]/
│       └── page
├── time/
│   └── [slug]/
│       └── page
└── campeonato/
    └── [slug]/
        └── page

O conteúdo é gerado a partir do banco.

19. Performance

As páginas individuais são excelentes candidatas para cache.

Por exemplo:

GET /jogo/flamengo-idv
        ↓
cache
        ↓
DB

Não precisa consultar o GE quando o usuário acessa.

O fluxo continua:

GE
 ↓
Worker
 ↓
Banco
 ↓
API
 ↓
Página

Isso é importante tanto para custo quanto para estabilidade.

20. Anúncios nas páginas dinâmicas

Eu manteria exatamente a estratégia que você já implementou.

Página do jogo
TOP BANNER

Breadcrumb

JOGO

ONDE ASSISTIR
⭐⭐⭐⭐⭐⭐

IN-FEED / conteúdo relacionado

Próximos jogos

SIDEBAR — desktop

STICKY BOTTOM — conforme sua implementação atual

Mas o bloco "Onde assistir" deve sempre dominar visualmente o anúncio.

21. Home continua existindo

Isso é importante.

Não substituiria sua Home.

Ela continua sendo a experiência principal:

/

com:

jogos;
agrupamento;
filtros;
busca.

As páginas dinâmicas funcionam como portas de entrada adicionais.

Então teremos:

                 GOOGLE
                   │
       ┌───────────┼────────────┐
       ↓           ↓            ↓
   /jogo/...   /time/...   /jogos-hoje
       │           │            │
       └───────────┼────────────┘
                   ↓
                  HOME
22. Escopo final da implementação

Eu colocaria tudo isso em uma única fase, mas dividiria tecnicamente assim:

Backend
 slug de jogos
 slug de times
 slug de competições
 endpoint de jogo
 endpoint de data
 endpoint de time
 endpoint de competição
 status de transmissão
 URLs oficiais/afiliadas
Frontend
 /jogos-hoje
 /jogos/{data}
 /jogo/{slug}
 /time/{slug}
 /campeonato/{slug}
 breadcrumbs
 links internos
 estados de jogo futuro/em andamento/finalizado
 página 404
SEO
 title dinâmico
 meta description dinâmica
 canonical
 Open Graph
 Schema.org
 sitemap
 robots.txt
 controle de indexação
 URLs canônicas
 links internos
Monetização
 manter os 4 blocos atuais
 anúncios nas páginas individuais
 estrutura para official_url
 estrutura para affiliate_url
 tracking de cliques nas transmissões
E eu faria uma alteração importante na sua visão do produto

A Home é a aplicação.

As páginas dinâmicas são o motor de aquisição.

Essa distinção é importante:

HOME
→ usuário que já conhece o produto

PÁGINA DO JOGO
→ usuário que está procurando uma resposta no Google

PÁGINA DO TIME
→ usuário procurando os jogos daquele time

PÁGINA DO CAMPEONATO
→ usuário procurando onde assistir à competição

PÁGINA DE DATA
→ usuário procurando os jogos daquele dia

E todos acabam chegando ao mesmo produto.