package models

type GeometryPoint struct {
	Type        string    `json:"type"`        // "Point"
	Coordinates []float64 `json:"coordinates"` // [lng, lat]
}

type GeometryLineString struct {
	Type        string      `json:"type"`        // "LineString"
	Coordinates [][]float64 `json:"coordinates"` // [[lng, lat], ...]
}

type POIProperties struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Category    string   `json:"category"` // "shop", "home", "hospital", "barber"
	Icon        string   `json:"icon"`     // GTA icon key or custom SVG URL
	Description string   `json:"description"`
	Images      []string `json:"images"` // Array of photo URLs
}

type POIFeature struct {
	Type       string        `json:"type"` // "Feature"
	Geometry   GeometryPoint `json:"geometry"`
	Properties POIProperties `json:"properties"`
}

type POIFeatureCollection struct {
	Type     string       `json:"type"` // "FeatureCollection"
	Features []POIFeature `json:"features"`
}

// Live tracking payload for WebSockets
type VehicleLocation struct {
	VehicleID string  `json:"vehicle_id"`
	Type      string  `json:"type"` // "patrol", "delivery", "bus"
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Heading   float64 `json:"heading"` // 0-360 degrees
	Speed     float64 `json:"speed"`   // km/h
}

// Route structs remain standard GeoJSON responses
type RouteStep struct {
	Instruction string    `json:"instruction"`
	DistanceM   float64   `json:"distance_m"`
	Location    []float64 `json:"location"`
}

type RouteProperties struct {
	TotalDistanceM float64     `json:"total_distance_m"`
	DurationSec    float64     `json:"duration_sec"`
	Steps          []RouteStep `json:"steps"`
}

type RouteResponse struct {
	Type       string             `json:"type"`
	Geometry   GeometryLineString `json:"geometry"`
	Properties RouteProperties    `json:"properties"`
}

type StreetNode struct {
	ID        string
	Lng       float64
	Lat       float64
	Neighbors []Edge
}

type Edge struct {
	ToNodeID  string
	DistanceM float64
}
