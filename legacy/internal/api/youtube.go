package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

var MonitoredChannels = map[string]string{
	"CazéTV":     "UC5X3kR12Gv5J4m0M-pGjRgw", // Placeholder IDs
	"Canal GOAT": "UC2X4pXq54r3H9X-4M_V1gzw",
}

type YouTubeSearchResponse struct {
	Items []YouTubeItem `json:"items"`
}

type YouTubeItem struct {
	Id      YouTubeItemId      `json:"id"`
	Snippet YouTubeItemSnippet `json:"snippet"`
}

type YouTubeItemId struct {
	VideoId string `json:"videoId"`
}

type YouTubeItemSnippet struct {
	Title                string `json:"title"`
	ChannelTitle         string `json:"channelTitle"`
	LiveBroadcastContent string `json:"liveBroadcastContent"` // "live", "upcoming", "none"
}

// GetUpcomingStreams fetches live or upcoming videos for a channel
func GetUpcomingStreams(channelId, apiKey string) ([]YouTubeItem, error) {
	// Buscamos os vídeos mais recentes para ver quais são lives futuras ou atuais
	url := fmt.Sprintf("https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=%s&type=video&order=date&maxResults=15&key=%s", channelId, apiKey)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("YouTube API returned status: %d", res.StatusCode)
	}

	var payload YouTubeSearchResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}

	var streams []YouTubeItem
	for _, item := range payload.Items {
		if item.Snippet.LiveBroadcastContent == "upcoming" || item.Snippet.LiveBroadcastContent == "live" {
			streams = append(streams, item)
		}
	}

	return streams, nil
}
