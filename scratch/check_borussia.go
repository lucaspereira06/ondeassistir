package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/onde-assistir/internal/db"
)

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
	defer database.DB.Close()

	query := `
		SELECT f.id, th.name, ta.name, f.start_at
		FROM fixtures f
		JOIN teams th ON f.home_team_id = th.id
		JOIN teams ta ON f.away_team_id = ta.id
		WHERE th.name ILIKE '%Borussia%' OR ta.name ILIKE '%Borussia%'
	`
	rows, err := database.DB.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id int
		var home, away string
		var start time.Time // wait, import time
		if err := rows.Scan(&id, &home, &away, &start); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("GE Game DB: %s x %s at %s. ID: %d\n", home, away, start.String(), id)
	}
}
