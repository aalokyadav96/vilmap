package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"vilmap/models"

	"github.com/go-chi/chi/v5"
)

type POIHandler struct {
	mu   sync.RWMutex
	pois []models.POIFeature
}

func NewPOIHandler() *POIHandler {
	initialPOIs := []models.POIFeature{
		{
			Type: "Feature",
			Geometry: models.GeometryPoint{
				Type:        "Point",
				Coordinates: []float64{76.1532, 28.2415},
			},
			Properties: models.POIProperties{
				ID:          "poi_1",
				Name:        "CJ's Safehouse",
				Category:    "home",
				Icon:        "gta-house",
				Description: "Main Grove Street residence in the village.",
				Images: []string{
					"https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=600&q=80",
					"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
				},
			},
		},
		{
			Type: "Feature",
			Geometry: models.GeometryPoint{
				Type:        "Point",
				Coordinates: []float64{76.1560, 28.2430},
			},
			Properties: models.POIProperties{
				ID:          "poi_2",
				Name:        "Well Stacked Pizza Co.",
				Category:    "shop",
				Icon:        "gta-pizza",
				Description: "Village eatery, pizza counter & general store.",
				Images: []string{
					"https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
				},
			},
		},
		{
			Type: "Feature",
			Geometry: models.GeometryPoint{
				Type:        "Point",
				Coordinates: []float64{76.1545, 28.2400},
			},
			Properties: models.POIProperties{
				ID:          "poi_3",
				Name:        "Reece's Haircut Barbershop",
				Category:    "service",
				Icon:        "gta-barber",
				Description: "Classic village barber shop and styling.",
				Images: []string{
					"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
				},
			},
		},
	}

	return &POIHandler{pois: initialPOIs}
}

func (h *POIHandler) GetPOIs(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	collection := models.POIFeatureCollection{
		Type:     "FeatureCollection",
		Features: h.pois,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(collection)
}

func (h *POIHandler) CreatePOI(w http.ResponseWriter, r *http.Request) {
	var newPOI models.POIFeature
	if err := json.NewDecoder(r.Body).Decode(&newPOI); err != nil {
		http.Error(w, "Invalid POI payload", http.StatusBadRequest)
		return
	}

	h.mu.Lock()
	newPOI.Type = "Feature"
	newPOI.Geometry.Type = "Point"
	if newPOI.Properties.ID == "" {
		newPOI.Properties.ID = fmt.Sprintf("poi_%d", len(h.pois)+1)
	}
	h.pois = append(h.pois, newPOI)
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newPOI)
}

func (h *POIHandler) GetPOIByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, poi := range h.pois {
		if poi.Properties.ID == id {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(poi)
			return
		}
	}

	http.Error(w, "POI not found", http.StatusNotFound)
}
