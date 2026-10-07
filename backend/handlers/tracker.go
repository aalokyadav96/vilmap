package handlers

import (
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"vilmap/models"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // Allow Vite origin
}

type TrackerHandler struct {
	clients   map[*websocket.Conn]bool
	broadcast chan models.VehicleLocation
	mu        sync.Mutex
}

func NewTrackerHandler() *TrackerHandler {
	th := &TrackerHandler{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan models.VehicleLocation),
	}

	// Start broadcast worker & vehicle position generator
	go th.handleBroadcasts()
	go th.simulateVehicleMovement()

	return th
}

func (th *TrackerHandler) HandleWS(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket Upgrade Error: %v", err)
		return
	}
	defer ws.Close()

	th.mu.Lock()
	th.clients[ws] = true
	th.mu.Unlock()

	// Keep connection open and read incoming heartbeats
	for {
		_, _, err := ws.ReadMessage()
		if err != nil {
			th.mu.Lock()
			delete(th.clients, ws)
			th.mu.Unlock()
			break
		}
	}
}

func (th *TrackerHandler) handleBroadcasts() {
	for {
		msg := <-th.broadcast
		th.mu.Lock()
		for client := range th.clients {
			err := client.WriteJSON(msg)
			if err != nil {
				client.Close()
				delete(th.clients, client)
			}
		}
		th.mu.Unlock()
	}
}

// Simulates a patrol car moving around village coordinates
func (th *TrackerHandler) simulateVehicleMovement() {
	t := 0.0
	for {
		time.Sleep(1 * time.Second)
		t += 0.1

		// Circular patrol trajectory around village center
		centerLat, centerLng := 28.2420, 76.1540
		radius := 0.0020

		lat := centerLat + (radius * math.Sin(t))
		lng := centerLng + (radius * math.Cos(t))
		heading := math.Mod((t*180/math.Pi)+90, 360)

		vehicle := models.VehicleLocation{
			VehicleID: "patrol_01",
			Type:      "patrol",
			Lat:       lat,
			Lng:       lng,
			Heading:   heading,
			Speed:     35.5,
		}

		th.broadcast <- vehicle
	}
}
