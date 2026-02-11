package models

import (
	"time"
)

// Rating represents cached ratings from OMDB for a movie/TV show
type Rating struct {
	ID                  uint      `gorm:"primarykey" json:"id"`
	IMDBID              string    `gorm:"uniqueIndex;not null" json:"imdb_id"`
	IMDBRating          string    `json:"imdb_rating"`
	IMDBVotes           string    `json:"imdb_votes"`
	RottenTomatoesScore string    `json:"rotten_tomatoes_score"`
	Metascore           string    `json:"metascore"`
	Awards              string    `json:"awards"`
	BoxOffice           string    `json:"box_office"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
