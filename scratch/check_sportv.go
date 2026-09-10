package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query(`SELECT canonical_name, logo_url FROM broadcast_sources WHERE canonical_name ILIKE '%spor%' OR canonical_name ILIKE '%sport%' ORDER BY canonical_name`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var name, logo string
		rows.Scan(&name, &logo)
		if logo == "" {
			logo = "(vazio)"
		}
		fmt.Printf("%-30s | %s\n", name, logo)
	}
}
