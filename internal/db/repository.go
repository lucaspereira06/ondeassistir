package db

import (
	"database/sql"
	"time"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) UpsertCompetition(name, slug, editionName, editionSlug, provider string) (int, error) {
	var id int
	query := `
		INSERT INTO competitions (name, slug, edition_name, edition_slug, provider)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (provider, edition_slug) DO UPDATE SET
			name = EXCLUDED.name,
			slug = EXCLUDED.slug,
			edition_name = EXCLUDED.edition_name,
			updated_at = NOW()
		RETURNING id;
	`
	err := r.db.QueryRow(query, name, slug, editionName, editionSlug, provider).Scan(&id)
	return id, err
}

func (r *Repository) UpsertTeam(name, popularName, logoUrl, slug string) (int, error) {
	var id int
	err := r.db.QueryRow(`SELECT id FROM teams WHERE name = $1 OR popular_name = $2 LIMIT 1`, name, popularName).Scan(&id)
	if err == nil {
		_, _ = r.db.Exec(`UPDATE teams SET slug = $1, logo_url = $2, updated_at = NOW() WHERE id = $3`, slug, logoUrl, id)
		return id, nil
	}

	query := `
		INSERT INTO teams (name, popular_name, logo_url, slug)
		VALUES ($1, $2, $3, $4)
		RETURNING id;
	`
	err = r.db.QueryRow(query, name, popularName, logoUrl, slug).Scan(&id)
	return id, err
}

func (r *Repository) UpsertExternalTeam(teamId int, provider, externalId, externalName string) error {
	query := `
		INSERT INTO external_teams (team_id, provider, external_id, external_name)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (provider, external_id) DO UPDATE SET
			external_name = EXCLUDED.external_name,
			updated_at = NOW();
	`
	_, err := r.db.Exec(query, teamId, provider, externalId, externalName)
	return err
}

func (r *Repository) UpsertFixture(competitionId, homeTeamId, awayTeamId int, startAt time.Time, phase, slug, location string) (int, error) {
	var id int
	err := r.db.QueryRow(`
		SELECT id FROM fixtures 
		WHERE competition_id = $1 AND home_team_id = $2 AND away_team_id = $3 AND start_at = $4
	`, competitionId, homeTeamId, awayTeamId, startAt).Scan(&id)
	
	if err == nil {
		_, _ = r.db.Exec(`UPDATE fixtures SET slug = $1, phase = $2, location = $3, updated_at = NOW() WHERE id = $4`, slug, phase, location, id)
		return id, nil
	}

	query := `
		INSERT INTO fixtures (competition_id, home_team_id, away_team_id, start_at, phase, slug, location)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id;
	`
	err = r.db.QueryRow(query, competitionId, homeTeamId, awayTeamId, startAt, phase, slug, location).Scan(&id)
	return id, err
}

func (r *Repository) UpsertExternalMatch(fixtureId int, provider, externalId string) error {
	query := `
		INSERT INTO external_matches (fixture_id, provider, external_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider, external_id) DO UPDATE SET
			fixture_id = EXCLUDED.fixture_id,
			updated_at = NOW();
	`
	_, err := r.db.Exec(query, fixtureId, provider, externalId)
	return err
}

func (r *Repository) UpsertBroadcastSource(canonicalName, sourceType, logoUrl string) (int, error) {
	var id int
	query := `
		INSERT INTO broadcast_sources (canonical_name, type, logo_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (canonical_name) DO UPDATE SET
			type = EXCLUDED.type,
			logo_url = EXCLUDED.logo_url,
			updated_at = NOW()
		RETURNING id;
	`
	err := r.db.QueryRow(query, canonicalName, sourceType, logoUrl).Scan(&id)
	return id, err
}

func (r *Repository) UpsertBroadcast(fixtureId, sourceId int, name, description, urlStr, transmissionId, provider string) error {
	query := `
		INSERT INTO broadcasts (fixture_id, source_id, name, description, url, transmission_id, provider)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (fixture_id, source_id) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			url = EXCLUDED.url,
			transmission_id = EXCLUDED.transmission_id,
			provider = EXCLUDED.provider,
			updated_at = NOW();
	`
	_, err := r.db.Exec(query, fixtureId, sourceId, name, description, urlStr, transmissionId, provider)
	return err
}

type FixtureMatch struct {
	ID        int
	HomeTeam  string
	AwayTeam  string
	StartAt   time.Time
}

func (r *Repository) GetFixturesInDateRange(startDate, endDate time.Time) ([]FixtureMatch, error) {
	query := `
		SELECT f.id, th.name, ta.name, f.start_at
		FROM fixtures f
		JOIN teams th ON f.home_team_id = th.id
		JOIN teams ta ON f.away_team_id = ta.id
		WHERE f.start_at >= $1 AND f.start_at <= $2
	`
	rows, err := r.db.Query(query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fixtures []FixtureMatch
	for rows.Next() {
		var f FixtureMatch
		if err := rows.Scan(&f.ID, &f.HomeTeam, &f.AwayTeam, &f.StartAt); err != nil {
			return nil, err
		}
		fixtures = append(fixtures, f)
	}
	return fixtures, nil
}

func (r *Repository) GetTeamAliases() (map[string]string, error) {
	query := `SELECT alias, normalized_name FROM team_aliases`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	aliases := make(map[string]string)
	for rows.Next() {
		var alias, normalizedName string
		if err := rows.Scan(&alias, &normalizedName); err != nil {
			return nil, err
		}
		aliases[alias] = normalizedName
	}
	return aliases, nil
}
