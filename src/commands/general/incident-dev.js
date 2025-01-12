const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadIncidentsData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } else {
            return [];
        }
    } catch (err) {
        console.error('Erreur lors du chargement des incidents :', err);
        return [];
    }
}

function saveIncidentData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des incidents :', err);
    }
}

function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde :', err);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('incident-dev')
        .setDescription('Signaler un problème technique au développement.')
        .addStringOption(option =>
            option
                .setName('contenu')
                .setDescription('Décrivez le problème ou l\'incident.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const content = interaction.options.getString('contenu');
        const incidentFilePath = path.join(__dirname, '../../../incidents.json');
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Charge les données des incidents précédents
        const incidentsData = loadIncidentsData(incidentFilePath);

        // Ajoute l'incident actuel à la liste
        const newIncident = {
            id: incidentsData.length + 1,
            author: interaction.user.tag,
            userId: interaction.user.id,
            serveur: guildId,
            content: content,
            timestamp: new Date().toISOString(),
        };
        
        incidentsData.push(newIncident);

        // Sauvegarde les incidents mis à jour
        saveIncidentData(incidentFilePath, incidentsData);

        if(guildId === '1212777500565045258'){
            const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('🔧 Nouveau Signalement d\'Incident')
            .setDescription(`\`\`\`${content}\`\`\``)
            .addFields(
                { name: 'Auteur', value: `<@${interaction.user.id}>`, inline: false },
                { name: 'ID Auteur', value: `\`\`\`${interaction.user.id}\`\`\``, inline: false },
                { name: 'Timestamp', value: `\`\`\`${new Date().toLocaleString()}\`\`\``, inline: false }
            )
            .setFooter({ 
                text: `Signalement envoyé par ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();
            const channel = interaction.guild.channels.cache.get('1328130047214751784');
            if(channel){
                await channel.send({ embeds: [embed] });
            }
        }
        try {
            await interaction.editReply({
                content: '✅ Votre signalement d\'incident a été enregistré.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du signalement d\'incident :', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de l\'enregistrement de votre incident. Veuillez réessayer plus tard.',
                ephemeral: true
            });
        }
    },
};
