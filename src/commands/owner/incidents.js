const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { env } = require('process');

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
        .setName('incidents')
        .setDescription('Afficher tous les incidents enregistrés'),

        async execute(interaction) {

            if(interaction.member.id !== env.IDOWNER){
                return interaction.editReply({
                    content: '❌ Seul le propriétaire du BOT peux consulter cette historique.',
                    ephemeral: true
                });
            }else{
                console.log('Bonjour Corentin, voici les bugs du jour.')
            }
                
            const incidentFilePath = path.join(__dirname, '../../../incidents.json');

            const filePath = path.join(__dirname, '../../../guilds-data', `${interaction.guild.id}.json`);
            const guildData = loadGuildData(filePath); // Charger les données du serveur
    
            // Charger les données des incidents
            const incidentsData = loadIncidentsData(incidentFilePath);
    
            if (incidentsData.length === 0) {
                return interaction.editReply({
                    content: '❌ Aucun incident n\'a été enregistré.',
                    ephemeral: true
                });
            }
    
            // Créer un embed pour afficher les incidents
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076') // Utilisation de la couleur définie dans guildData
                .setTitle('📜 Liste des Incidents')
                .setDescription('Voici la liste de tous les incidents enregistrés.')
                .setFooter({
                    text: `Demandé par ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
    
            // Ajouter les incidents au Embed
            incidentsData.forEach((incident) => {
                embed.addFields(
                    {
                        name: `Incident #${incident.id}`,
                        value: `**Auteur**: <@${incident.userId}>\n**Message**: \`\`\`${incident.content}\`\`\`\n**Date**: \`\`\`${new Date(incident.timestamp).toLocaleString()}\`\`\`\n**Serveur**: \`\`\`${incident.serveur}\`\`\``,
                        inline: false
                    }
                );
            });
    
            // Limiter le nombre de champs affichés pour ne pas dépasser la limite de Discord
            const MAX_FIELDS = 25; // Par exemple, 25 incidents par page
            const pages = Math.ceil(incidentsData.length / MAX_FIELDS);
            let currentPage = 1;
    
            if (incidentsData.length > MAX_FIELDS) {
                const start = (currentPage - 1) * MAX_FIELDS;
                const end = currentPage * MAX_FIELDS;
                const currentIncidents = incidentsData.slice(start, end);
    
                const pageEmbed = new EmbedBuilder(embed)
                    .setDescription(`Voici les incidents (Page ${currentPage}/${pages})`)
                    .spliceFields(0, embed.fields.length, ...currentIncidents.map(incident => ({
                        name: `Incident #${incident.id}`,
                        value: `**Auteur**: <@${incident.userId}>\n**Message**: \`\`\`${incident.content}\`\`\`\n**Date**: \`\`\`${new Date(incident.timestamp).toLocaleString()}\`\`\``,
                        inline: false
                    })));
    
                await interaction.editReply({ content: '', embeds: [pageEmbed], ephemeral: true });
            } else {
                await interaction.editReply({ content: '', embeds: [embed], ephemeral: true });
            }
        }
};
