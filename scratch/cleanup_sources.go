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

	queries := []string{
		// 1. Para jogos que já têm "Prime Video" E uma duplicata: deletar a duplicata
		`DELETE FROM broadcasts
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name IN ('Amazon Prime', 'Prime Vídeo', 'Prime Vídeo ')
		)
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'Prime Video')
		);`,

		// 2. Para jogos que SÓ têm a versão antiga (sem "Prime Video"): atualizar para Prime Video
		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'Prime Video'
		)
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name IN ('Amazon Prime', 'Prime Vídeo', 'Prime Vídeo ')
		);`,

		// 3. Agora sem FK pendente, deleta os registros duplicados
		`DELETE FROM broadcast_sources
		WHERE canonical_name IN ('Amazon Prime', 'Prime Vídeo', 'Prime Vídeo ');`,

		// 4. Limpa logo_url de canais com URLs da CDN do 365Scores (evita imagens quebradas)
		`UPDATE broadcast_sources
		SET logo_url = ''
		WHERE logo_url LIKE '%imagecache.365scores.com%';`,

		// 5. Merge "GETV" -> "Ge TV": remove broadcasts que já têm Ge TV no mesmo jogo
		`DELETE FROM broadcasts
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'GETV'
		)
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'Ge TV')
		);`,

		// 6. Redireciona o restante (sem Ge TV ainda) para Ge TV
		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'Ge TV'
		)
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'GETV'
		);`,

		// 7. Remove o registro GETV orfão
		`DELETE FROM broadcast_sources WHERE canonical_name = 'GETV';`,

		// 8. Merge "Youtube TV Romário" e variações -> "Romário TV"
		`DELETE FROM broadcasts
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name ILIKE '%youtube%romario%' OR canonical_name ILIKE '%youtube%romário%'
		)
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'Romário TV')
		);`,

		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'Romário TV'
		)
		WHERE source_id IN (
			SELECT id FROM broadcast_sources WHERE canonical_name ILIKE '%youtube%romario%' OR canonical_name ILIKE '%youtube%romário%'
		);`,

		`DELETE FROM broadcast_sources
		WHERE canonical_name ILIKE '%youtube%romario%' OR canonical_name ILIKE '%youtube%romário%';`,

		// 9. Merge "Sportv" -> "SporTV" (cria SporTV se não existir)
		`DELETE FROM broadcasts
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name = 'Sportv')
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'SporTV')
		);`,

		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'SporTV'
		)
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name = 'Sportv');`,

		`DELETE FROM broadcast_sources WHERE canonical_name = 'Sportv';`,

		// 10. Merge "SporTV" e "SporTV 2" -> "sportv" (que tem a logo do GE)
		`DELETE FROM broadcasts
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name IN ('SporTV', 'SporTV 2'))
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'sportv')
		);`,

		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'sportv'
		)
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name IN ('SporTV', 'SporTV 2'));`,

		`DELETE FROM broadcast_sources WHERE canonical_name IN ('SporTV', 'SporTV 2');`,

		// 11. Limpar "Youtube TNT Sports" órfão (já foi normalizado para "TNT Sports")
		`DELETE FROM broadcasts
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name = 'Youtube TNT Sports')
		AND fixture_id IN (
			SELECT fixture_id FROM broadcasts
			WHERE source_id = (SELECT id FROM broadcast_sources WHERE canonical_name = 'TNT Sports')
		);`,

		`UPDATE broadcasts SET source_id = (
			SELECT id FROM broadcast_sources WHERE canonical_name = 'TNT Sports'
		)
		WHERE source_id IN (SELECT id FROM broadcast_sources WHERE canonical_name = 'Youtube TNT Sports');`,

		`DELETE FROM broadcast_sources WHERE canonical_name = 'Youtube TNT Sports';`,

		// 12. Preenche logo da Record TV que veio sem logo do 365Scores
		`UPDATE broadcast_sources SET logo_url = '/logos_canais/record.png'
		WHERE canonical_name IN ('Record TV', 'Record', 'record tv', 'record')
		  AND (logo_url = '' OR logo_url IS NULL);`,
	}

	for _, q := range queries {
		res, err := db.Exec(q)
		if err != nil {
			fmt.Printf("ERRO: %v\nQuery: %s\n\n", err, q)
		} else {
			rows, _ := res.RowsAffected()
			fmt.Printf("OK (%d rows): %.80s...\n", rows, q)
		}
	}

	fmt.Println("\nCleanup concluído!")
}
