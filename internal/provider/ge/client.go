package ge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const geGraphQLURL = "https://geql.globo.com/graphql"
const geHash = "56dca51afdf3f49839e211298d60e25e68ad06dcc2d41f973d8aaa21f5e977a6"

// GEGraphQLResponse mapeia a resposta completa do endpoint GraphQL
type GEGraphQLResponse struct {
	Data struct {
		ChampionshipEditionAgenda struct {
			Past   []MatchEventKind `json:"past"`
			Now    []MatchEventKind `json:"now"`
			Future []MatchEventKind `json:"future"`
		} `json:"championshipEditionAgenda"`
	} `json:"data"`
}

type MatchEventKind struct {
	Typename string `json:"__typename"`
	Match    struct {
		ID               int    `json:"id"`
		StartDate        string `json:"startDate"`
		StartHour        string `json:"startHour"`
		Moment           string `json:"moment"`
		FirstContestant  Team   `json:"firstContestant"`
		SecondContestant Team   `json:"secondContestant"`
		Phase            struct {
			Name                string `json:"name"`
			ChampionshipEdition struct {
				Championship struct {
					Name string `json:"name"`
				} `json:"championship"`
			} `json:"championshipEdition"`
		} `json:"phase"`
		LiveWatchSources []LiveWatchSource `json:"liveWatchSources"`
		Location         struct {
			PopularName string `json:"popularName"`
		} `json:"location"`
	} `json:"match"`
}

type Team struct {
	ID          int    `json:"id"`
	PopularName string `json:"popularName"`
	Name        string `json:"name"`
	BadgePng    string `json:"badgePng"`
}

type LiveWatchSource struct {
	Name            string `json:"name"`
	Description     string `json:"description"`
	URL             string `json:"url"`
	CTA             string `json:"cta"`
	TransmissionID  int    `json:"transmissionId"`
	OfficialLogoUrl string `json:"officialLogoUrl"`
}

// Structs para enviar o Payload
type AgendaVariables struct {
	ChampionshipSlug string `json:"championshipSlug"`
	EditionSlug      string `json:"editionSlug"`
	StartDate        string `json:"startDate"`
	EndDate          string `json:"endDate"`
}

type PersistedQuery struct {
	Version    int    `json:"version"`
	Sha256Hash string `json:"sha256Hash"`
}

type Extensions struct {
	PersistedQuery PersistedQuery `json:"persistedQuery"`
}

type GraphQLPayload struct {
	OperationName string          `json:"operationName"`
	Variables     AgendaVariables `json:"variables"`
	Extensions    Extensions      `json:"extensions"`
}

// FetchAgenda busca a agenda no GraphQL do GE
func FetchAgenda(championshipSlug, editionSlug, startDate, endDate string) ([]MatchEventKind, error) {
	payload := GraphQLPayload{
		OperationName: "championshipEditionAgenda",
		Variables: AgendaVariables{
			ChampionshipSlug: championshipSlug,
			EditionSlug:      editionSlug,
			StartDate:        startDate,
			EndDate:          endDate,
		},
		Extensions: Extensions{
			PersistedQuery: PersistedQuery{
				Version:    1,
				Sha256Hash: geHash,
			},
		},
	}

	payloadBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", geGraphQLURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("Erro na API GE: status code %d", res.StatusCode)
	}

	bodyBytes, _ := io.ReadAll(res.Body)
	var graphqlResp GEGraphQLResponse
	if err := json.Unmarshal(bodyBytes, &graphqlResp); err != nil {
		return nil, err
	}

	agenda := graphqlResp.Data.ChampionshipEditionAgenda
	
	// Consolida todos os jogos retornados (passados, agora, futuros)
	var allMatches []MatchEventKind
	allMatches = append(allMatches, agenda.Past...)
	allMatches = append(allMatches, agenda.Now...)
	allMatches = append(allMatches, agenda.Future...)

	return allMatches, nil
}
