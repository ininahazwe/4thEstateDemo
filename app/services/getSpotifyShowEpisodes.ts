export async function getSpotifyShowEpisodes() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const showId = "4YWOssmCac8ulV9LzDZIDp";

    // 1. Authentification pour obtenir le token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
        body: "grant_type=client_credentials",
        next: {revalidate: 3600} // Cache le token pendant 1h
    });

    const {access_token} = await tokenResponse.json();

    // 2. Récupération des épisodes du Show
    const dataResponse = await fetch(`https://api.spotify.com/v1/shows/${showId}/episodes?limit=10`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        next: {revalidate: 86400} // Mise à jour automatique du flux toutes les 24h
    });

    return dataResponse.json();
}