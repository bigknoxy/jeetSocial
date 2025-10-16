# Data Model: Kindness Points View

## Entities

### Post
- id: string/int — unique identifier
- content: string — post content (max 280 chars)
- created_at: timestamp — ISO 8601 UTC timestamp
- kindness_points: integer — may be negative, zero, or positive; used for Top ranking

## Validation Rules
- `content` length <= 280 characters (enforced elsewhere, documented here)
- `created_at` must be a valid timestamp
- `kindness_points` must be an integer (can be negative)

## State and Derived Values
- `top_window_kindness_points` (derived): when computing Top view, consider kindness_points earned within last 24 hours. Implementation detail left to backend; frontend will request `GET /posts?view=top` and backend returns posts already filtered/sorted.

