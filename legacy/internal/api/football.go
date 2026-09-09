package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

var WhitelistedLeagues = map[int]bool{
	71:  true, // Brasileirão Série A
	72:  true, // Brasileirão Série B
	73:  true, // Copa do Brasil
	13:  true, // CONMEBOL Libertadores
	11:  true, // CONMEBOL Sul-Americana
	2:   true, // UEFA Champions League
	39:  true, // Premier League
	140: true, // La Liga
	135: true, // Serie A Italiana
	78:  true, // Bundesliga Alemã
	61:  true, // Ligue 1 Francesa
}

type FixtureResponse struct {
	Response []Match `json:"response"`
}

type Match struct {
	Fixture FixtureInfo `json:"fixture"`
	League  LeagueInfo  `json:"league"`
	Teams   TeamsInfo   `json:"teams"`
}

type FixtureInfo struct {
	ID   int       `json:"id"`
	Date time.Time `json:"date"`
}

type LeagueInfo struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Logo  string `json:"logo"`
	Round string `json:"round"`
}

type TeamsInfo struct {
	Home Team `json:"home"`
	Away Team `json:"away"`
}

type Team struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo"`
}

// GetFixtures fetches matches for a specific date and returns those in the whitelisted leagues.
func GetFixtures(date string, apiKey string) ([]Match, error) {
	url := fmt.Sprintf("https://v3.football.api-sports.io/fixtures?date=%s&timezone=America/Sao_Paulo", date)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("x-apisports-key", apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("API returned status: %d", res.StatusCode)
	}

	var payload FixtureResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}

	var filtered []Match
	for _, match := range payload.Response {
		if WhitelistedLeagues[match.League.ID] {
			filtered = append(filtered, match)
		}
	}

	return filtered, nil
}
