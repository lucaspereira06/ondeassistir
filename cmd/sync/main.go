package main

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/onde-assistir/internal/db"
	"github.com/onde-assistir/internal/provider/ge"
)

func generateSlug(s string) string {
	s = strings.ToLower(s)
	replacer := strings.NewReplacer(
		"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a",
		"é", "e", "è", "e", "ê", "e", "ë", "e",
		"í", "i", "ì", "i", "î", "i", "ï", "i",
		"ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o",
		"ú", "u", "ù", "u", "û", "u", "ü", "u",
		"ç", "c", "ñ", "n",
	)
	s = replacer.Replace(s)
	reg, _ := regexp.Compile("[^a-z0-9]+")
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

type ConfigCompeticao struct {
	Name             string
	ChampionshipSlug string
	EditionSlug      string
}

var campeonatos = []ConfigCompeticao{
	{"Taça Conmebol Libertadores", "taca-libertadores", "libertadores-2026"},
	{"Copa Sul-Americana", "copa-sul-americana", "copa-sul-americana-2026"},
	{"Campeonato Brasileiro", "campeonato-brasileiro", "campeonato-brasileiro-2026"},
	{"Campeonato Brasileiro Série B", "campeonato-brasileiro-b", "brasileiro-serie-b-2026"},
	{"Copa do Brasil", "copa-do-brasil", "copa-do-brasil-2026"},
	{"Liga dos Campeões", "ligadoscampeoes", "liga-dos-campeoes-2026-2027"},
	{"Campeonato Inglês", "campeonatoingles", "campeonato-ingles-2026-27"},
	{"Campeonato Espanhol", "campeonatoespanhol", "campeonato-espanhol-2026-27"},
	{"Campeonato Alemão", "campeonatoalemao", "campeonato-alemao-2026-27"},
	{"Campeonato Italiano", "campeonatoitaliano", "campeonato-italiano-2026-27"},
	{"Campeonato Francês", "campeonatofrances", "campeonato-frances-2026-27"},
}

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	repo := db.NewRepository(database.DB)

	now := time.Now()
	startDate := now.AddDate(0, 0, -1).Format("2006-01-02")
	endDate := now.AddDate(0, 0, 6).Format("2006-01-02")

	log.Printf("Iniciando sync de %s até %s usando GE GraphQL", startDate, endDate)

	for _, camp := range campeonatos {
		log.Printf("\n--- Processando %s ---", camp.Name)
		
		compId, err := repo.UpsertCompetition(camp.Name, camp.ChampionshipSlug, camp.Name, camp.EditionSlug, "GE")
		if err != nil {
			log.Printf("Erro ao salvar competição %s: %v", camp.Name, err)
			continue
		}

		matches, err := ge.FetchAgenda(camp.ChampionshipSlug, camp.EditionSlug, startDate, endDate)
		if err != nil {
			log.Printf("Erro ao buscar agenda para %s: %v", camp.Name, err)
			continue
		}

		log.Printf("Encontrados %d jogos na API", len(matches))

		for _, m := range matches {
			if m.Match.FirstContestant.Name == "" || m.Match.SecondContestant.Name == "" {
				continue
			}

			// Upsert Times
			homeSlug := generateSlug(m.Match.FirstContestant.PopularName)
			if homeSlug == "" {
				homeSlug = generateSlug(m.Match.FirstContestant.Name)
			}
			homeId, _ := repo.UpsertTeam(m.Match.FirstContestant.Name, m.Match.FirstContestant.PopularName, m.Match.FirstContestant.BadgePng, homeSlug)
			repo.UpsertExternalTeam(homeId, "GE", strconv.Itoa(m.Match.FirstContestant.ID), m.Match.FirstContestant.Name)

			awaySlug := generateSlug(m.Match.SecondContestant.PopularName)
			if awaySlug == "" {
				awaySlug = generateSlug(m.Match.SecondContestant.Name)
			}
			awayId, _ := repo.UpsertTeam(m.Match.SecondContestant.Name, m.Match.SecondContestant.PopularName, m.Match.SecondContestant.BadgePng, awaySlug)
			repo.UpsertExternalTeam(awayId, "GE", strconv.Itoa(m.Match.SecondContestant.ID), m.Match.SecondContestant.Name)

			// Parse Data/Hora
			dateTimeStr := fmt.Sprintf("%sT%s-03:00", m.Match.StartDate[:10], m.Match.StartHour)
			parsedStartAt, err := time.Parse(time.RFC3339, dateTimeStr)
			if err != nil {
				parsedStartAt, _ = time.Parse(time.RFC3339, m.Match.StartDate)
			}

			// Generate Fixture Slug
			fixtureSlug := fmt.Sprintf("%s-x-%s-%s", homeSlug, awaySlug, parsedStartAt.Format("2006-01-02"))

			// Upsert Fixture
			fixtureId, err := repo.UpsertFixture(compId, homeId, awayId, parsedStartAt, m.Match.Phase.Name, fixtureSlug, m.Match.Location.PopularName)
			if err != nil {
				log.Printf("Erro ao salvar fixture %d: %v", m.Match.ID, err)
				continue
			}

			repo.UpsertExternalMatch(fixtureId, "GE", strconv.Itoa(m.Match.ID))

			// Upsert Transmissoes
			for _, src := range m.Match.LiveWatchSources {
				if src.Name == "Cartola" {
					continue
				}

				srcType := "TV"
				lowerName := strings.ToLower(src.Name)
				if strings.Contains(lowerName, "play") || strings.Contains(lowerName, "+") || strings.Contains(lowerName, "max") || strings.Contains(lowerName, "prime") || strings.Contains(lowerName, "tv") || strings.Contains(lowerName, "youtube") {
					srcType = "STREAMING"
				}

				sourceId, _ := repo.UpsertBroadcastSource(src.Name, srcType, src.OfficialLogoUrl)
				repo.UpsertBroadcast(fixtureId, sourceId, src.Name, src.Description, src.URL, strconv.Itoa(src.TransmissionID), "ge")
			}
		}
		
		log.Printf("Concluído. Salvos/Atualizados com sucesso.")
	}

	log.Printf("\n======================================")
	log.Println("Sync GE GraphQL finalizado com sucesso!")
}
