const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Fonction pour charger les données du fichier JSON
const loadDevLogs = () => {
    const devLogsPath = path.join(__dirname, '../../../devlogs.json');
    try {
        if (fs.existsSync(devLogsPath)) {
            return JSON.parse(fs.readFileSync(devLogsPath, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error(`Erreur lors du chargement des devlogs : ${error.message}`);
        return [];
    }
};

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


// Commande "devlogs"
module.exports = {
    data: {
        name: 'devlogs',
        description: 'Affiche les devlogs du projet'
    },
    async execute(interaction) {
        const devLogs = loadDevLogs();
        
        // Si aucun devlog n'est trouvé
        if (devLogs.length === 0) {
            return interaction.reply({ content: 'Aucun devlog trouvé.', ephemeral: true });
        }

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        // Création de l'embed pour chaque devlog
        const embeds = devLogs.map(log => {
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`Version ${log.version} - ${log.title}`)
                .setDescription(`### <:activedeveloper:1327778740322832386> | Changes: \n\`\`\`${log.changes.join('\n\n')}\`\`\``)
                .addFields(
                    { name: 'Date', value: log.date, inline: true },
                    { name: 'Auteur', value: log.author, inline: true },
                )
                .setTimestamp();
            
            return embed;
        });

        // Envoi des embeds en réponse
        await interaction.reply({
            embeds: embeds,
            ephemeral: false
        });
    },
};
