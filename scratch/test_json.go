package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Game struct {
	ID                     int                    `json:"id"`
	HasTVNetworks          *bool                  `json:"hasTVNetworks"`
	TVNetworkName          *string                `json:"tvNetworkName"`
	TVNetworks             []interface{}          `json:"tvNetworks"`
}

type Resp struct {
	Games []Game `json:"games"`
}

func main() {
	b, _ := os.ReadFile("C:\\Users\\Pichau\\.gemini\\antigravity-ide\\brain\\c2db84e4-6741-46d4-89b8-91011e34a3bb\\.system_generated\\steps\\1381\\content.md")
	
	// Strip "Title: ... ---" header
	str := string(b)
	idx := 0
	for i := 0; i < len(str)-3; i++ {
		if str[i:i+3] == "---" {
			idx = i + 3
			break
		}
	}
	
	var r Resp
	err := json.Unmarshal([]byte(str[idx:]), &r)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	
	fmt.Printf("Total games: %d\n", len(r.Games))
	for _, g := range r.Games {
		if g.HasTVNetworks != nil {
			fmt.Printf("Game ID: %d hasTVNetworks: %v\n", g.ID, *g.HasTVNetworks)
		}
		if g.TVNetworkName != nil {
			fmt.Printf("Game ID: %d tvNetworkName: %s\n", g.ID, *g.TVNetworkName)
		}
		if len(g.TVNetworks) > 0 {
			fmt.Printf("Game ID: %d tvNetworks: %v\n", g.ID, g.TVNetworks)
		}
	}
}
