const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs/search';
const { env } = require('process');

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
        .setName('giphy')
        .setDescription('Rechercher une image GIF sur Giphy avec un titre.')
        .addStringOption(option => 
            option.setName('titre')
            .setDescription('Le titre de l\'image GIF à rechercher')
            .setRequired(true)
        ),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const title = interaction.options.getString('titre');

        try {
            // Effectuer une requête vers l'API Giphy avec un nombre de résultats plus élevé
            const response = await axios.get(GIPHY_API_URL, {
                params: {
                    q: title,
                    api_key: env.GIPHY_API_KEY,
                    limit: 10 // Limiter à 10 résultats, vous pouvez ajuster ce nombre
                }
            });

            // Vérifier s'il y a des résultats
            const gifs = response.data.data;
            if (gifs.length === 0) {
                return interaction.reply('Aucun GIF trouvé pour ce titre.');
            }

            // Sélectionner un GIF aléatoire parmi les résultats
            const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

            // Créer l'embed avec l'image sélectionnée aléatoirement
            const embed = new EmbedBuilder()
                .setTitle(`🚀 GIF Généré avec succès !`)
                .setDescription(`*GIF trouvé sur Giphy, voici le résultat :*\n\n**${title}**`)
                .setImage(randomGif.images.original.url)
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp() // Ajouter un timestamp pour plus de dynamisme
                .setFooter({ text: 'GIF fourni par Giphy', iconURL: 'https://media.giphy.com/media/26AOLh3CUwAPs8biU/giphy.gif' });

            // Répondre avec l'embed
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erreur lors de la récupération du GIF:', error);
            return interaction.reply('Une erreur est survenue lors de la recherche du GIF.');
        }
    },
};
