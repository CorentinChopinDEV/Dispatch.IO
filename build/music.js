import { config } from 'dotenv';
import play from 'play-dl';
import fs from 'fs';
import axios from 'axios';

config();

export async function setupAPIs() {
  try {
    // Vérification des clés API requises
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('La clé API YouTube est manquante dans le fichier .env');
    }
    const cookies = fs.readFileSync('./cookie-youtube.json', 'utf-8');
    
    // Configuration de YouTube avec authentification
    await play.setToken({
      youtube: {
        token: process.env.YOUTUBE_API_KEY,
        cookie: process.env.YOUTUBE_COOKIE // Ajoutez cette variable dans votre .env
      }
    });

    // Configuration de Spotify si les identifiants sont présents
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      await play.setToken({
        spotify: {
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
          market: 'FR'
        }
      });
      console.log('Configuration de Spotify réussie!');
    }

    // Exemple d'appel HTTP avec un User-Agent personnalisé via axios
    const response = await axios.get('https://www.youtube.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Requête HTTP réussie:', response.status);

    console.log('Configuration de toutes les APIs terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la configuration des APIs:', error);
    throw error;
  }
}
