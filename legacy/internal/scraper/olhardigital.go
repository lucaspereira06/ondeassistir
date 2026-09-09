package scraper

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type ScrapedMatch struct {
	HomeTeam string
	AwayTeam string
	Channels []string
}

func ScrapeOlharDigital(date time.Time) ([]ScrapedMatch, error) {
	// A URL usa o formato DD-MM-YYYY
	url := fmt.Sprintf("https://olhardigital.com.br/esportes/jogos/%s/", date.Format("02-01-2006"))

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("Status code error: %d %s", res.StatusCode, res.Status)
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	var matches []ScrapedMatch

	doc.Find("section.evento, section.evento.destaque").Each(func(i int, s *goquery.Selection) {
		name, exists := s.Find("meta[itemprop='name']").Attr("content")
		if !exists || !strings.Contains(name, " vs ") {
			// fallback para checar no name com " x " se houver
			name, exists = s.Find("meta[itemprop='name']").Attr("content")
			if !exists {
				return
			}
		}
		
		var parts []string
		if strings.Contains(name, " vs ") {
			parts = strings.Split(name, " vs ")
		} else if strings.Contains(name, " x ") {
			parts = strings.Split(name, " x ")
		}

		if len(parts) == 2 {
			match := ScrapedMatch{
				HomeTeam: strings.TrimSpace(parts[0]),
				AwayTeam: strings.TrimSpace(parts[1]),
			}

			s.Find(".evt-assistir .evt-btn-onde").Each(func(j int, tag *goquery.Selection) {
				tagText := strings.TrimSpace(tag.Text())
				if tagText != "" {
					match.Channels = append(match.Channels, tagText)
				}
			})
			
			match.Channels = unique(match.Channels)
			if len(match.Channels) > 0 {
				matches = append(matches, match)
			}
		}
	})

	return matches, nil
}

func unique(strSlice []string) []string {
	keys := make(map[string]bool)
	var list []string
	for _, entry := range strSlice {
		// remove textos genéricos que o scraper pode ter pego por engano
		if entry == "Jogos de Hoje" || entry == "Esportes" {
			continue
		}
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}
