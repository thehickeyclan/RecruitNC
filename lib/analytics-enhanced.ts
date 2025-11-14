// Enhanced analytics functions for tracking user interactions

export const trackCardView = async (athleteId: string, athleteName: string) => {
  try {
    await fetch("/api/track-card-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        athleteId,
        athleteName,
        eventType: "card_view",
      }),
    })
  } catch (error) {
    console.error("Failed to track card view:", error)
  }
}

export const trackCardClick = async (athleteId: string, athleteName: string) => {
  try {
    await fetch("/api/track-card-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        athleteId,
        athleteName,
        eventType: "card_click",
      }),
    })
  } catch (error) {
    console.error("Failed to track card click:", error)
  }
}

export const trackProfileView = async (athleteId: string, athleteName: string) => {
  try {
    await fetch("/api/track-card-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        athleteId,
        athleteName,
        eventType: "profile_view",
      }),
    })
  } catch (error) {
    console.error("Failed to track profile view:", error)
  }
}
