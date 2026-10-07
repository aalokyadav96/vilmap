package handlers

import (
	"encoding/json"
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
	// Seed with sample village points (replace with DB queries in production)
	initialPOIs := []models.POIFeature{
		{
			Type: "Feature",
			Geometry: models.GeometryPoint{
				Type:        "Point",
				Coordinates: []float64{76.1532, 28.2415}, // [Lng, Lat]
			},
			Properties: models.POIProperties{
				ID:          "poi_1",
				Name:        "CJ's Safehouse",
				Category:    "home",
				Icon:        "gta-house",
				Description: "Village main residence",
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
				Description: "Village eatery & general store",
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
				Description: "Local Barber Shop",
			},
		},
	}

	return &POIHandler{
		pois: initialPOIs,
	}
}

// GET /api/pois - Return all points in standard GeoJSON
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

// POST /api/pois - Add new POI
func (h *POIHandler) CreatePOI(w http.ResponseWriter, r *http.Request) {
	var newPOI models.POIFeature
	if err := json.NewDecoder(r.Body).Decode(&newPOI); err != nil {
		http.Error(w, "Invalid POI payload", http.StatusBadRequest)
		return
	}

	newPOI.Type = "Feature"
	newPOI.Geometry.Type = "Point"

	h.mu.Lock()
	h.pois = append(h.pois, newPOI)
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newPOI)
}

// GET /api/pois/{id} - Return single POI
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
