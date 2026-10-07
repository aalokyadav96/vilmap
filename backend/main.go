package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"vilmap/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	poiHandler := handlers.NewPOIHandler()
	routeHandler := handlers.NewRouteHandler()
	trackerHandler := handlers.NewTrackerHandler()

	r.Route("/api", func(r chi.Router) {
		r.Get("/pois", poiHandler.GetPOIs)
		r.Post("/pois", poiHandler.CreatePOI)
		r.Get("/pois/{id}", poiHandler.GetPOIByID)
		r.Get("/route", routeHandler.CalculateRoute)
	})

	// WebSocket endpoint for real-time tracking
	r.Get("/ws", trackerHandler.HandleWS)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := ":4000"
	fmt.Printf("🚀 Server running on http://localhost%s\n", port)
	log.Fatal(http.ListenAndServe(port, r))
}
