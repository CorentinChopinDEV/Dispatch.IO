const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');


function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            console.log(`Le fichier pour la guilde ${guildPath} n'existe pas.`);
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Afficher le statut actuel des services du bot.'),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Variables pour les émojis personnalisés
        let emojis = {
            status: {
                functional: '<:7431theconnectionisexcellent:1328478446795358330>',
                bug: '<:3657theconnectionisgood:1328478465200095332>',
                down: '<:8920theconnectionisbad:1328478490835816449>',
                maintenance: '<:supportscommands:1327778758337236992>',
            },
            tools: {
                gear: '<:discordearlysupporter:1327777649803788370>',
            },
        };

        // Embed pour le statut des services
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076') // Utilisation de la couleur définie dans les données de guilde ou une couleur par défaut
            .setDescription(
                `# ${emojis.tools.gear} Service Status Report
**Voici l'état actuel de nos services pour Dispatch.IO :**

# :gear: Bot Status
* ${emojis.status.functional} **Statut :** Fonctionnel.
* :white_check_mark: **Description :** Toutes les commandes disponnible fonctionnent parfaitement.

# :globe_with_meridians: Website Status
* ${emojis.status.functional} **Statut :** Fonctionnel
* :white_check_mark: **Description :** Le site est fonctionnel, le site est en beta. La configuration du BOT ce ferra bientôt dessus !

# :electric_plug: API Status
- **GIPHY :**
  * ${emojis.status.functional} **Statut :** Fonctionnel
  * :white_check_mark: **Description :** L'API GIPHY fonctionne correctement. Les recherches de GIF sont entièrement opérationnelles.
- **Gemini AI (Google AI) :**
  * ${emojis.status.functional} **Statut :** Fonctionnel
  * :white_check_mark: **Description :** L'API Gemini AI est active. Les commandes basées sur Google AI fonctionnent parfaitement.

### Tous les services sont fonctionnel, tous va bien ! 🚀
                `
            )
            .setFooter({
                text: `Demandé par ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        await interaction.editReply({ content: '', embeds: [embed], ephemeral: true });
    },
};
