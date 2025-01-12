const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function saveGuildData(guildPath, data) {
    try {
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
    }
}

module.exports = {
    data: {
        name: 'config-antiraid',
        description: 'Configurer le système Anti-Raid.',
    },
    async execute(interaction) {
        const client = interaction.client; // Assurez-vous que le client est accessible à partir de l'interaction
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        
        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const devRoleId = guildData.dev_role; // ID du rôle Dev, si configuré
            const hasDevRole = devRoleId && interaction.member.roles.cache.has(devRoleId); // Vérifie si l'utilisateur possède le rôle Dev

            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasDevRole) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                    ephemeral: true,
                });
            }
        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }

        // Créer l'embed de configuration
        const embed = new EmbedBuilder()
            .setTitle('Configuration Anti-Raid')
            .setDescription(`L\'Anti-Raid protège votre serveur contre les attaques de bots et d\'intrusions massives. Vous pouvez activer ou désactiver cette fonctionnalité.\n\n**Anti-Raid est actuellement:**\n **${guildData.antiRaid || 'Inactif'}**`)
            .setColor(guildData.botColor || '#f40076')
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNW9rZ3ljdGNnMzdkMHVzOWUzdWw4ZGJyMzA2cXA1MW11ZXgwOWxydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyj0xKaPQ9BmKSQ/giphy.gif')
            .setFooter({ text: 'Cliquez sur le bouton pour activer ou désactiver l\'Anti-Raid.' });

        // Créer le bouton pour activer/désactiver l'Anti-Raid
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('toggleAntiRaid')
                .setLabel(guildData.antiRaid === 'Actif' ? 'Désactiver Anti-Raid' : 'Activer Anti-Raid')
                .setStyle(guildData.antiRaid === 'Actif' ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        // Envoyer l'embed avec le bouton
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        // Gérer les interactions avec les boutons
        const filter = (btnInteraction) => btnInteraction.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'toggleAntiRaid') {
                // Changer le statut de l'Anti-Raid
                const newStatus = guildData.antiRaid === 'Actif' ? 'Inactif' : 'Actif';
                guildData.antiRaid = newStatus;
                saveGuildData(guildPath, guildData);

                // Mise à jour de l'embed
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('Configuration Anti-Raid')
                    .setDescription(`L\'Anti-Raid protège votre serveur contre les attaques de bots et d\'intrusions massives. Vous pouvez activer ou désactiver cette fonctionnalité.\n\n**Anti-Raid est actuellement:**\n **${guildData.antiRaid || 'Inactif'}**`)
                    .setColor(guildData.botColor || '#f40076')
                    .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNW9rZ3ljdGNnMzdkMHVzOWUzdWw4ZGJyMzA2cXA1MW11ZXgwOWxydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyj0xKaPQ9BmKSQ/giphy.gif')
                    .setFooter({ text: 'Cliquez sur le bouton pour activer ou désactiver l\'Anti-Raid.' });

                // Mettre à jour l'embed avec le nouveau statut et le bouton approprié
                await btnInteraction.update({
                    embeds: [updatedEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('toggleAntiRaid')
                                .setLabel(newStatus === 'Actif' ? 'Désactiver Anti-Raid' : 'Activer Anti-Raid')
                                .setStyle(guildData.antiRaid === 'Actif' ? ButtonStyle.Danger : ButtonStyle.Success)
                        )
                    ]
                });
            }
        });
    }
};
