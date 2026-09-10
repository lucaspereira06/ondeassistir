package scores365

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type Game struct {
	ID                     int       `json:"id"`
	StartTime              time.Time `json:"startTime"`
	StatusGroup            int       `json:"statusGroup"`
	HasTVNetworks          bool      `json:"hasTVNetworks"`
	HomeCompetitor         Competitor `json:"homeCompetitor"`
	AwayCompetitor         Competitor `json:"awayCompetitor"`
}

type Competitor struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type AllScoresResponse struct {
	Games []Game `json:"games"`
}

type Client struct {
	HTTPClient *http.Client
}

func NewClient() *Client {
	return &Client{
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *Client) FetchGames(startDate, endDate string) ([]Game, error) {
	url := fmt.Sprintf("https://webws.365scores.com/web/games/allscores/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&userCountryId=21&startDate=%s&endDate=%s&withTop=true&topBookmaker=156&onlyOnTv=true", startDate, endDate)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Origin", "https://www.365scores.com")
	req.Header.Set("Referer", "https://www.365scores.com/")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API 365Scores retornou status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	log.Printf("Raw response size from 365 API: %d bytes (URL: %s)", len(body), url)

	var response AllScoresResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	return response.Games, nil
}

type TVNetwork struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type GameDetailsResponse struct {
	Game struct {
		TVNetworks []TVNetwork `json:"tvNetworks"`
	} `json:"game"`
}

func (c *Client) FetchGameDetails(gameId int) ([]TVNetwork, error) {
	url := fmt.Sprintf("https://webws.365scores.com/web/game/?appTypeId=5&langId=31&timezoneName=America/Sao_Paulo&userCountryId=21&gameId=%d", gameId)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API 365Scores retornou status %d", resp.StatusCode)
	}

	var response GameDetailsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	return response.Game.TVNetworks, nil
}
