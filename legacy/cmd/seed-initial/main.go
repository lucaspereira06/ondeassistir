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
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	apiKey := os.Getenv("API_FOOTBALL_KEY")

	if dbURL == "" || apiKey == "" {
		log.Fatal("As variáveis DATABASE_URL e API_FOOTBALL_KEY precisam estar definidas.")
	}

	database, err := db.Connect(dbURL)
	if err != nil {
		log.Fatalf("Erro ao conectar ao banco de dados: %v", err)
	}
	defer database.Close()

	loc, _ := time.LoadLocation("America/Sao_Paulo")
	now := time.Now().In(loc)

	log.Println("Iniciando a carga inicial de D+0 até D+7...")

	// Roda para hoje e os próximos 7 dias
	for i := 0; i <= 7; i++ {
		targetDate := now.AddDate(0, 0, i).Format("2006-01-02")
		log.Printf("\n--- Buscando data: %s (D+%d) ---", targetDate, i)

		hasRun, _ := database.HasSeedRunForDate(targetDate)
		if hasRun {
			log.Printf("A data %s já foi executada. Pulando...", targetDate)
			continue
		}

		matches, err := api.GetFixtures(targetDate, apiKey)
		if err != nil {
			log.Printf("Erro na API para %s: %v", targetDate, err)
			continue
		}

		log.Printf("Encontradas %d partidas.", len(matches))

		if len(matches) > 0 {
			if err := database.UpsertMatches(matches); err != nil {
				log.Printf("Erro ao salvar no banco: %v", err)
			}
		}

		_ = database.LogSeedRun(targetDate, len(matches))
		
		// Pausa de 1 segundo para respeitar limites da API (se houver)
		time.Sleep(1 * time.Second)
	}

	log.Println("\nCarga inicial concluída com sucesso! Agora você pode testar a interface web.")
}
