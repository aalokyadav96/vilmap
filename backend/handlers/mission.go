// handlers/mission.go

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

type Mission struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Description  string     `json:"description"`
	Reward       int        `json:"reward"`
	TimeLimitSec int        `json:"time_limit_sec"`
	Pickup       [2]float64 `json:"pickup"`  // [lng, lat]
	Dropoff      [2]float64 `json:"dropoff"` // [lng, lat]
	Active       bool       `json:"active"`
	AcceptedAt   time.Time  `json:"accepted_at,omitempty"`
}

type MissionHandler struct {
	mu       sync.RWMutex
	missions map[string]Mission
}

func NewMissionHandler() *MissionHandler {
	return &MissionHandler{
		missions: map[string]Mission{
			"m_1": {
				ID:           "m_1",
				Title:        "Farm Fresh Produce Run",
				Description:  "Deliver organic crop crate from Market Square to Harbor Point.",
				Reward:       500,
				TimeLimitSec: 90,
				Pickup:       [2]float64{76.1514, 28.2422},
				Dropoff:      [2]float64{76.1558, 28.2402},
			},
			"m_2": {
				ID:           "m_2",
				Title:        "Baito Event Ticket Express",
				Description:  "Rush VIP concert tickets to Civic Hall before soundcheck.",
				Reward:       750,
				TimeLimitSec: 60,
				Pickup:       [2]float64{76.1532, 28.2415},
				Dropoff:      [2]float64{76.1548, 28.2444},
			},
		},
	}
}

// GET /api/missions
func (h *MissionHandler) GetMissions(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var list []Mission
	for _, m := range h.missions {
		list = append(list, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

// POST /api/missions/{id}/accept
func (h *MissionHandler) AcceptMission(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	h.mu.Lock()
	defer h.mu.Unlock()

	mission, exists := h.missions[id]
	if !exists {
		http.Error(w, "Mission not found", http.StatusNotFound)
		return
	}

	mission.Active = true
	mission.AcceptedAt = time.Now()
	h.missions[id] = mission

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mission)
}

// POST /api/missions/{id}/complete
func (h *MissionHandler) CompleteMission(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	h.mu.Lock()
	defer h.mu.Unlock()

	mission, exists := h.missions[id]
	if !exists {
		http.Error(w, "Mission not found", http.StatusNotFound)
		return
	}

	mission.Active = false
	h.missions[id] = mission

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":  "success",
		"reward":  mission.Reward,
		"message": fmt.Sprintf("Mission completed! Earned $%d", mission.Reward),
	})
}
