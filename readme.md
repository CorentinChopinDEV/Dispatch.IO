# Liste des fonctions à créer

## Numéro de build: Dispatch.IO -> 1.0.0

## Build
- `slash-system` 🟢
- `guild create` (Nouveau fichier JSON pour sauvegarder les données de la guilde) 🟢
- `new user` (Nouvel utilisateur Discord) 🟢
- `set presence` 🟢
- `radio-system` 🟢
- `role react js` 🟢
- `Verification ETAT JSON` 🟢

## Configurations (Config) (DEV & OWNER)
- `/antiraid` ⚠️
- `/config`
- `/config-general` 🟢
- `/config-color` 🟢
- `/config-welcome` 🟢
- `/config-language` 🟣 [Pas dans la première version]
- `/config-rules` 🟢
- `/config-whitelist`🟢
- `/config-music` 🟣 [Pas dans la première version]
- `/config-level`

- `/backup` (Créer une backup du serveur) 🟣 [Pas dans la première version]
- `/load-backup` (Charge une backup du serveur) 🟣 [Pas dans la première version]
- `/clear-backup` (Supprime une backup) 🟣 [Pas dans la première version]
- `/clear-serveur-backup` (Supprime tous sur un serveur pour pouvoir charger une backup) 🟣 [Pas dans la première version]
## Commandes

### Administrateur
- `/salon` (Lock-Unlock-Bulk) 🟢
- `/say` 🟢
- `/clear` 🟢
- `/nuke` 🟢
- `/level-reset`
- `/embed` 🟢
- `/role-react-add` 🟢
- `/role-react`🟢
- `/titre-image` 🟢
- `/ticket-manager` 🟢

### Modérateur
- `/ban` 🟢
- `/unban` 🟢
- `/avertir` 🟢
- `/infractions`🟢
- `/kick`🟢
- `/timeout` 🟢
- `/end-timeout`🟢
- `/user-informations` 🟢
- `/mp user` (Envoie un message privé à un utilisateur) 🟢

### Général
- `/invitation` (Inviter le bot sur un serveur ou un membre) 🟢
- `/help`🟢
- `/giphy` 🟢
- `/chat-gpt`
- `/signalement` 🟢
- `/ping` (Affiche la latence du bot) 🟢
- `/informations` (Affiche les informations du bot) 🟢
- `/couple`🟢
- `/level`

## Anti-Raid
- Anti Spam
- Anti-modifications interdites
- Anti Raid
- Anti Lien
- Anti Bot Ajout
- Anti-insultes (Mots interdits)
- Protection double compte

## Spécial LSPDFR French Corporation

### Commandes
- `/noname`
- `/restore`
- `/reset-all` (Anciennement Fetch)

### Système
- Réponse du mot "Pack" 🟢
- Protection des packs


### Dependances
- Créer un fichier .env dans votre dossier root
> .env
```TOKEN=
IDOWNER=
GIPHY_API_KEY=```

- Créer un dossier guilds-data dans le dossier root

- Utilisez `npm install` avec Node.JS pour installer les dépendances
- Lancer le projet avec `node index.js`

### Bon développement