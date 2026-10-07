package handlers

import (
	"container/heap"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"vilmap/models"
)

type RouteHandler struct {
	nodes map[string]models.StreetNode
}

func NewRouteHandler() *RouteHandler {
	// Sample village street graph nodes & edges
	nodes := map[string]models.StreetNode{
		"N1": {ID: "N1", Lng: 76.1532, Lat: 28.2415},
		"N2": {ID: "N2", Lng: 76.1540, Lat: 28.2420},
		"N3": {ID: "N3", Lng: 76.1550, Lat: 28.2425},
		"N4": {ID: "N4", Lng: 76.1560, Lat: 28.2430},
	}

	// Connect street intersections
	addEdge := func(from, to string, dist float64) {
		nFrom := nodes[from]
		nFrom.Neighbors = append(nFrom.Neighbors, models.Edge{ToNodeID: to, DistanceM: dist})
		nodes[from] = nFrom

		nTo := nodes[to]
		nTo.Neighbors = append(nTo.Neighbors, models.Edge{ToNodeID: from, DistanceM: dist})
		nodes[to] = nTo
	}

	addEdge("N1", "N2", 100)
	addEdge("N2", "N3", 120)
	addEdge("N3", "N4", 150)

	return &RouteHandler{nodes: nodes}
}

// GET /api/route?start_lat=X&start_lng=Y&end_lat=A&end_lng=B
func (h *RouteHandler) CalculateRoute(w http.ResponseWriter, r *http.Request) {
	startLatStr := r.URL.Query().Get("start_lat")
	startLngStr := r.URL.Query().Get("start_lng")
	endLatStr := r.URL.Query().Get("end_lat")
	endLngStr := r.URL.Query().Get("end_lng")

	sLat, _ := strconv.ParseFloat(startLatStr, 64)
	sLng, _ := strconv.ParseFloat(startLngStr, 64)
	eLat, _ := strconv.ParseFloat(endLatStr, 64)
	eLng, _ := strconv.ParseFloat(endLngStr, 64)

	// Find closest graph nodes to request coordinates
	startNodeID := h.findNearestNode(sLng, sLat)
	endNodeID := h.findNearestNode(eLng, eLat)

	path, distance := h.dijkstra(startNodeID, endNodeID)

	var coordinates [][]float64
	var steps []models.RouteStep

	for idx, nodeID := range path {
		node := h.nodes[nodeID]
		coordinates = append(coordinates, []float64{node.Lng, node.Lat})

		steps = append(steps, models.RouteStep{
			Instruction: fmt.Sprintf("Waypoint %d: Reach street node %s", idx+1, nodeID),
			DistanceM:   distance,
			Location:    []float64{node.Lng, node.Lat},
		})
	}

	response := models.RouteResponse{
		Type: "Feature",
		Geometry: models.GeometryLineString{
			Type:        "LineString",
			Coordinates: coordinates,
		},
		Properties: models.RouteProperties{
			TotalDistanceM: distance,
			DurationSec:    distance / 1.4, // ~1.4 m/s walking speed
			Steps:          steps,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *RouteHandler) findNearestNode(lng, lat float64) string {
	closestID := ""
	minDist := math.MaxFloat64

	for id, node := range h.nodes {
		dLat := node.Lat - lat
		dLng := node.Lng - lng
		dist := math.Sqrt(dLat*dLat + dLng*dLng)
		if dist < minDist {
			minDist = dist
			closestID = id
		}
	}
	return closestID
}

// Priority Queue implementation for Dijkstra
type PriorityItem struct {
	nodeID   string
	priority float64
	index    int
}

type PriorityQueue []*PriorityItem

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].priority < pq[j].priority }
func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}
func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*PriorityItem)
	item.index = n
	*pq = append(*pq, item)
}
func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	*pq = old[0 : n-1]
	return item
}

func (h *RouteHandler) dijkstra(startID, targetID string) ([]string, float64) {
	distances := make(map[string]float64)
	previous := make(map[string]string)
	pq := &PriorityQueue{}
	heap.Init(pq)

	for id := range h.nodes {
		if id == startID {
			distances[id] = 0
			heap.Push(pq, &PriorityItem{nodeID: id, priority: 0})
		} else {
			distances[id] = math.MaxFloat64
		}
	}

	for pq.Len() > 0 {
		current := heap.Pop(pq).(*PriorityItem).nodeID

		if current == targetID {
			break
		}

		for _, edge := range h.nodes[current].Neighbors {
			alt := distances[current] + edge.DistanceM
			if alt < distances[edge.ToNodeID] {
				distances[edge.ToNodeID] = alt
				previous[edge.ToNodeID] = current
				heap.Push(pq, &PriorityItem{nodeID: edge.ToNodeID, priority: alt})
			}
		}
	}

	var path []string
	curr := targetID
	for curr != "" {
		path = append([]string{curr}, path...)
		curr = previous[curr]
	}

	return path, distances[targetID]
}
