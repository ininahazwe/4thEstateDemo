export async function getSpotifyShowEpisodes() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const showId = "4YWOssmCac8ulV9LzDZIDp";

    // --- Vérification temporaire : les variables sont-elles bien lues en prod ? ---
    if (!clientId || !clientSecret) {
        console.error(
            "Spotify Debug: SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET manquante.",
            { hasClientId: !!clientId, hasClientSecret: !!clientSecret }
        );
        return { items: [] };
    }

    // 1. Authentification pour obtenir le token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
        body: "grant_type=client_credentials",
        next: { revalidate: 3600 } // Cache le token pendant 1h
    });

    const tokenData = await tokenResponse.json();

    // --- Vérification temporaire : le token a-t-il bien été obtenu ? ---
    if (!tokenResponse.ok || !tokenData.access_token) {
        console.error("Spotify Debug: échec de récupération du token.", {
            status: tokenResponse.status,
            body: tokenData,
        });
        return { items: [] };
    }

    const { access_token } = tokenData;

    // 2. Récupération des épisodes du Show
    const dataResponse = await fetch(`https://api.spotify.com/v1/shows/${showId}/episodes?limit=10`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        next: { revalidate: 86400 } // Mise à jour automatique du flux toutes les 24h
    });

    const data = await dataResponse.json();

    // --- Vérification temporaire : la requête episodes a-t-elle réussi ? ---
    if (!dataResponse.ok) {
        console.error("Spotify Debug: échec de récupération des épisodes.", {
            status: dataResponse.status,
            body: data,
            showId,
        });
        return { items: [] };
    }

    console.log("Spotify Debug: succès, nombre d'épisodes reçus:", data.items?.length ?? 0);

    return data;
}