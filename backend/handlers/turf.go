package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
)

type Territory struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Gang      string      `json:"gang"` // e.g., "Grove", "Ballas", "Vagos", "Neutral"
	Color     string      `json:"color"`
	Contested bool        `json:"contested"`
	Polygon   [][]float64 `json:"polygon"` // [lng, lat] coords
}

type TurfHandler struct {
	mu          sync.RWMutex
	territories map[string]Territory
}

func NewTurfHandler() *TurfHandler {
	return &TurfHandler{
		territories: map[string]Territory{
			"turf_grove": {
				ID:        "turf_grove",
				Name:      "Grove Street Turf",
				Gang:      "Grove",
				Color:     "#2ecc71", // Green
				Contested: false,
				Polygon: [][]float64{
					{76.1500, 28.2410},
					{76.1535, 28.2410},
					{76.1535, 28.2435},
					{76.1500, 28.2435},
					{76.1500, 28.2410},
				},
			},
			"turf_idlewood": {
				ID:        "turf_idlewood",
				Name:      "Idlewood Plaza",
				Gang:      "Ballas",
				Color:     "#9b59b6", // Purple
				Contested: true,
				Polygon: [][]float64{
					{76.1545, 28.2410},
					{76.1585, 28.2410},
					{76.1585, 28.2440},
					{76.1545, 28.2440},
					{76.1545, 28.2410},
				},
			},
		},
	}
}

// GET /api/turfs
func (h *TurfHandler) GetTurfs(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var list []Territory
	for _, t := range h.territories {
		list = append(list, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}
