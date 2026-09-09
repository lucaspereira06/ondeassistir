package main

import (
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gosimple/unidecode"
	"github.com/joho/godotenv"
	"github.com/onde-assistir/internal/api"
	"github.com/onde-assistir/internal/db"
	"github.com/onde-assistir/internal/scraper"
)

func normalizeString(s string) string {
	return strings.ToLower(unidecode.Unidecode(s))
}

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	youtubeKey := os.Getenv("YOUTUBE_API_KEY")

	if dbURL == "" || youtubeKey == "" {
		log.Fatal("As variáveis DATABASE_URL e YOUTUBE_API_KEY precisam estar definidas.")
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("Erro ao conectar ao banco de dados: %v", err)
	}
	defer database.Close()

	loc, _ := time.LoadLocation("America/Sao_Paulo")
	now := time.Now().In(loc)
	startDate := now.Format("2006-01-02")
	endDate := now.AddDate(0, 0, 2).Format("2006-01-02")

	log.Printf("\n==============================================")
	log.Printf("Buscando jogos do banco de %s até %s...", startDate, endDate)
	log.Printf("==============================================")
	matches, err := database.GetMatchesForEnrichment(startDate, endDate)
	if err != nil {
		log.Fatalf("Erro ao buscar partidas: %v", err)
	}

	if len(matches) == 0 {
		log.Println("Nenhuma partida encontrada no banco para enriquecer.")
		return
	}
	log.Printf("Encontradas %d partidas no banco para enriquecimento.\n", len(matches))

	// 1. Busca lives no Olhar Digital (Scraper)
	var scrapedMatches []scraper.ScrapedMatch
	for i := 0; i <= 2; i++ {
		date := now.AddDate(0, 0, i)
		log.Printf("\n[SCRAPER - Olhar Digital] Buscando agenda de %s", date.Format("02-01-2006"))
		scraped, err := scraper.ScrapeOlharDigital(date)
		if err != nil {
			log.Printf("Aviso ao raspar Olhar Digital: %v", err)
		} else {
			log.Printf("[SCRAPER] %d jogos extraídos do site hoje:", len(scraped))
			for _, sm := range scraped {
				log.Printf("  -> %s x %s | Canais: %v", sm.HomeTeam, sm.AwayTeam, sm.Channels)
			}
			scrapedMatches = append(scrapedMatches, scraped...)
		}
	}

	// 2. Busca todas as lives dos canais monitorados (YouTube)
	log.Printf("\n[YOUTUBE API] Iniciando busca nos canais...")
	var allStreams []api.YouTubeItem
	for channelName, channelId := range api.MonitoredChannels {
		log.Printf("Buscando no canal: %s", channelName)
		streams, err := api.GetUpcomingStreams(channelId, youtubeKey)
		if err != nil {
			log.Printf("Erro ao buscar streams de %s: %v", channelName, err)
			continue
		}
		for _, st := range streams {
			log.Printf("  -> Live agendada encontrada: %s", st.Snippet.Title)
		}
		allStreams = append(allStreams, streams...)
	}

	log.Printf("\n==============================================")
	log.Printf("INICIANDO CRUZAMENTO DE DADOS (FUZZY MATCH)")
	log.Printf("==============================================")

	// 3. Faz o fuzzy match e atualiza banco
	for _, match := range matches {
		var currentTransmissoes []db.Transmissao
		if match.Transmissoes != "" {
			_ = json.Unmarshal([]byte(match.Transmissoes), &currentTransmissoes)
		}

		homeNorm := normalizeString(match.TimeCasaNome)
		awayNorm := normalizeString(match.TimeForaNome)

		matchFound := false

		log.Printf("\n> Verificando: %s x %s", match.TimeCasaNome, match.TimeForaNome)

		// 3.1 Match com YouTube API
		for _, stream := range allStreams {
			titleNorm := normalizeString(stream.Snippet.Title)
			
			if strings.Contains(titleNorm, homeNorm) && strings.Contains(titleNorm, awayNorm) {
				alreadyExists := false
				for _, t := range currentTransmissoes {
					if t.URL == "https://youtube.com/watch?v="+stream.Id.VideoId {
						alreadyExists = true
						break
					}
				}

				if !alreadyExists {
					log.Printf("   [MATCH YOUTUBE] '%s' casou perfeitamente!", stream.Snippet.Title)
					currentTransmissoes = append(currentTransmissoes, db.Transmissao{
						Nome:     stream.Snippet.ChannelTitle,
						Tipo:     "youtube",
						Gratuito: true,
						URL:      "https://youtube.com/watch?v=" + stream.Id.VideoId,
					})
					matchFound = true
				}
			}
		}

		// 3.2 Match com Olhar Digital Scraper
		for _, sm := range scrapedMatches {
			shomeNorm := normalizeString(sm.HomeTeam)
			sawayNorm := normalizeString(sm.AwayTeam)

			// Verifica se os times batem
			if (strings.Contains(shomeNorm, homeNorm) || strings.Contains(homeNorm, shomeNorm)) &&
			   (strings.Contains(sawayNorm, awayNorm) || strings.Contains(awayNorm, sawayNorm)) {
				
				log.Printf("   [MATCH SCRAPER] Time extraído: %s x %s", sm.HomeTeam, sm.AwayTeam)

				for _, canal := range sm.Channels {
					// Verifica duplicidade pelo nome do canal (Fuzzy)
					alreadyExists := false
					for _, t := range currentTransmissoes {
						if strings.EqualFold(t.Nome, canal) || strings.Contains(normalizeString(t.Nome), normalizeString(canal)) {
							alreadyExists = true
							break
						}
					}

					if !alreadyExists {
						// Tenta inferir o tipo do canal
						tipo := "pay"
						gratuito := false
						canalLower := strings.ToLower(canal)
						if strings.Contains(canalLower, "youtube") || strings.Contains(canalLower, "cazétv") || strings.Contains(canalLower, "goat") {
							tipo = "youtube"
							gratuito = true
						} else if strings.Contains(canalLower, "globo") || strings.Contains(canalLower, "sbt") || strings.Contains(canalLower, "record") || strings.Contains(canalLower, "band") {
							tipo = "tv_aberta"
							gratuito = true
						}

						log.Printf("      + Adicionando canal: %s (%s)", canal, tipo)
						currentTransmissoes = append(currentTransmissoes, db.Transmissao{
							Nome:     canal,
							Tipo:     tipo,
							Gratuito: gratuito,
							URL:      "", // Não temos link exato, apenas o nome da plataforma
						})
						matchFound = true
					}
				}
			}
		}

		if matchFound {
			err = database.UpdateTransmissoes(match.ChaveJogo, currentTransmissoes)
			if err != nil {
				log.Printf("   [ERRO] Falha ao salvar no banco: %v", err)
			} else {
				log.Printf("   [SUCESSO] Transmissões salvas no banco para a chave %s!", match.ChaveJogo)
			}
		} else {
			log.Printf("   [NENHUM MATCH] Nenhum canal encontrado para este jogo nas fontes pesquisadas.")
		}
	}
	
	log.Printf("\n==============================================")
	log.Println("Enriquecimento concluído!")
}
