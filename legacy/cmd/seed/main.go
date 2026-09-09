package main

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/onde-assistir/internal/api"
	"github.com/onde-assistir/internal/db"
)

func main() {
	// Carrega .env se existir (ambiente local)
	_ = godotenv.Load()

	apiKey := os.Getenv("API_FOOTBALL_KEY")
	dbURL := os.Getenv("DATABASE_URL")

	if apiKey == "" || dbURL == "" {
		log.Fatal("As variáveis API_FOOTBALL_KEY e DATABASE_URL precisam estar definidas.")
	}

	// Calcula D+7
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		log.Fatal("Erro ao carregar timezone:", err)
	}
	
	targetDate := time.Now().In(loc).AddDate(0, 0, 7).Format("2006-01-02")
	log.Printf("Iniciando seed para a data alvo: %s", targetDate)

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("Erro ao conectar ao banco de dados: %v", err)
	}
	defer database.Close()

	// Verifica se o seed já rodou hoje
	hasRun, err := database.HasSeedRunForDate(targetDate)
	if err != nil {
		log.Fatalf("Erro ao verificar log de seed: %v", err)
	}
	if hasRun {
		log.Printf("O seed para a data %s já foi executado anteriormente. Abortando nova execução.", targetDate)
		return
	}

	matches, err := api.GetFixtures(targetDate, apiKey)
	if err != nil {
		log.Fatalf("Erro ao buscar partidas da API: %v", err)
	}

	log.Printf("Encontradas %d partidas nas ligas permitidas.", len(matches))

	if len(matches) > 0 {
		if err := database.UpsertMatches(matches); err != nil {
			log.Fatalf("Erro ao salvar partidas no banco de dados: %v", err)
		}
	}

	if err := database.LogSeedRun(targetDate, len(matches)); err != nil {
		log.Printf("Aviso: Falha ao registrar execução no log: %v", err)
	}

	log.Println("Seed concluído com sucesso!")
}
