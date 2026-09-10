package main

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/onde-assistir/internal/db"
	"github.com/onde-assistir/internal/provider/scores365"
)

func normalizeTeamName(name string, aliases map[string]string) string {
	s := strings.ToLower(name)
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "â", "a", "ã", "a",
		"é", "e", "ê", "e",
		"í", "i",
		"ó", "o", "ô", "o", "õ", "o",
		"ú", "u",
		"ç", "c",
		" fc", "", " esporte clube", "", " ec", "", " ac", "", " clube", "",
	)
	s = replacer.Replace(s)
	s = strings.TrimSpace(s)
	
	if val, ok := aliases[s]; ok {
		return val
	}
	return s
}

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("Falha ao conectar no banco: %v", err)
	}
	repo := db.NewRepository(database.DB)
	client := scores365.NewClient()

	now := time.Now()
	startDate := now.AddDate(0, 0, -1) // D-1
	endDate := now.AddDate(0, 0, 6)    // D+6
	
	log.Printf("Iniciando sync 365Scores de D-1 até D+6")

	// Buscar todos os fixtures do nosso banco de D-1 até D+6
	fixtures, err := repo.GetFixturesInDateRange(startDate.Add(-24*time.Hour), endDate.Add(24*time.Hour))
	if err != nil {
		log.Fatalf("Erro ao buscar fixtures locais: %v", err)
	}

	matchedCount := 0
	insertedBroadcasts := 0

	aliases, err := repo.GetTeamAliases()
	if err != nil {
		log.Fatalf("Erro ao buscar aliases: %v", err)
	}

	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("02/01/2006")
		time.Sleep(time.Duration(2) * time.Second) // rate limit

		games, err := client.FetchGames(dateStr, dateStr)
		if err != nil {
			log.Printf("Erro no dia %s: %v", dateStr, err)
			continue
		}
		
		log.Printf("Data %s: 365Scores retornou %d jogos na TV.", dateStr, len(games))

		for _, g := range games {
			if !g.HasTVNetworks {
				continue
			}

			gHome := normalizeTeamName(g.HomeCompetitor.Name, aliases)
			gAway := normalizeTeamName(g.AwayCompetitor.Name, aliases)

		var matchedFixture *db.FixtureMatch
		for _, f := range fixtures {
			// Tolerância de 2 horas
			diff := g.StartTime.Sub(f.StartAt).Hours()
			if diff < -2 || diff > 2 {
				continue
			}

			fHome := normalizeTeamName(f.HomeTeam, aliases)
			fAway := normalizeTeamName(f.AwayTeam, aliases)

			// Verifica cruzamento
			if (strings.Contains(fHome, gHome) || strings.Contains(gHome, fHome)) || 
			   (strings.Contains(fAway, gAway) || strings.Contains(gAway, fAway)) {
				matchedFixture = &f
				break
			}
		}

		if matchedFixture != nil {
			matchedCount++
			
			time.Sleep(time.Duration(1) * time.Second) // rate limit
			networks, err := client.FetchGameDetails(g.ID)
			if err != nil {
				log.Printf("Erro ao buscar detalhes do jogo %d: %v", g.ID, err)
				continue
			}

			for _, net := range networks {
				netName := strings.TrimSpace(net.Name)
				if netName == "" {
					continue
				}

				srcType := "TV"
				lowerNet := strings.ToLower(netName)
				if strings.Contains(lowerNet, "play") || strings.Contains(lowerNet, "+") || strings.Contains(lowerNet, "max") || strings.Contains(lowerNet, "prime") || strings.Contains(lowerNet, "youtube") || strings.Contains(lowerNet, "cazé") || strings.Contains(lowerNet, "goat") {
					srcType = "STREAMING"
				}

				sourceId, _ := repo.UpsertBroadcastSource(netName, srcType, "")
				err := repo.UpsertBroadcast(matchedFixture.ID, sourceId, netName, "", "", "", "365scores")
				if err == nil {
					insertedBroadcasts++
				}
			}
		}
	}
	}

	log.Printf("Sincronização concluída! Jogos Matched: %d | Novas Transmissões Inseridas: %d", matchedCount, insertedBroadcasts)
}
