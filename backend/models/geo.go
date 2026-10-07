package models

// GeoJSON Point Geometry
type GeometryPoint struct {
	Type        string    `json:"type"`        // "Point"
	Coordinates []float64 `json:"coordinates"` // [longitude, latitude]
}

// GeoJSON LineString Geometry
type GeometryLineString struct {
	Type        string      `json:"type"`        // "LineString"
	Coordinates [][]float64 `json:"coordinates"` // [[lng, lat], [lng, lat], ...]
}

// Point of Interest (Home, Shop, Barber, GTA Radar Icon, etc.)
type POIProperties struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Category    string `json:"category"` // e.g., "shop", "home", "hospital", "barber"
	Icon        string `json:"icon"`     // GTA icon key or custom SVG URL
	Description string `json:"description"`
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

// Routing Data Structures
type RouteStep struct {
	Instruction string    `json:"instruction"`
	DistanceM   float64   `json:"distance_m"`
	Location    []float64 `json:"location"` // [lng, lat]
}

type RouteProperties struct {
	TotalDistanceM float64     `json:"total_distance_m"`
	DurationSec    float64     `json:"duration_sec"`
	Steps          []RouteStep `json:"steps"`
}

type RouteResponse struct {
	Type       string             `json:"type"` // "Feature"
	Geometry   GeometryLineString `json:"geometry"`
	Properties RouteProperties    `json:"properties"`
}

// Street Node for Pathfinding Graph
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
