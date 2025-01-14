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
        name: 'raidmode',
        description: 'Configurer le mode Raid du serveur.',
    },
    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);

        // Si raidMode n'existe pas, l'ajouter avec la valeur 'Inactif'
        if (!guildData.raidMode) {
            guildData.raidMode = 'Inactif';
            saveGuildData(guildPath, guildData);
        }
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
            .setTitle('Configuration Raid Mode')
            .setDescription(`Le **Raid Mode** permet de protéger votre serveur contre les raids. Vous pouvez activer ou désactiver ce mode.\n\n**Raid Mode est actuellement:** ${guildData.raidMode}`)
            .setColor(guildData.botColor || '#f40076')
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNW9rZ3ljdGNnMzdkMHVzOWUzdWw4ZGJyMzA2cXA1MW11ZXgwOWxydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyj0xKaPQ9BmKSQ/giphy.gif')
            .setFooter({ text: 'Cliquez sur le bouton pour activer ou désactiver le Raid Mode.' });

        // Créer le bouton pour activer/désactiver le Raid Mode
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('toggleRaidMode')
                .setLabel(guildData.raidMode === 'Actif' ? 'Désactiver Raid Mode' : 'Activer Raid Mode')
                .setStyle(guildData.raidMode === 'Actif' ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        // Envoyer l'embed avec le bouton
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        // Gérer les interactions avec les boutons
        const filter = (btnInteraction) => btnInteraction.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.customId === 'toggleRaidMode') {
                // Changer le statut du Raid Mode
                const newStatus = guildData.raidMode === 'Actif' ? 'Inactif' : 'Actif';
                guildData.raidMode = newStatus;
                saveGuildData(guildPath, guildData);

                // Mise à jour de l'embed
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('Configuration Raid Mode')
                    .setDescription(`Le **Raid Mode** permet de protéger votre serveur contre les raids. Vous pouvez activer ou désactiver ce mode.\n\n**Raid Mode est actuellement:** ${guildData.raidMode}`)
                    .setColor(guildData.botColor || '#f40076')
                    .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNW9rZ3ljdGNnMzdkMHVzOWUzdWw4ZGJyMzA2cXA1MW11ZXgwOWxydSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0Iyj0xKaPQ9BmKSQ/giphy.gif')
                    .setFooter({ text: 'Cliquez sur le bouton pour activer ou désactiver le Raid Mode.' });

                // Mettre à jour l'embed avec le nouveau statut et le bouton approprié
                await btnInteraction.update({
                    embeds: [updatedEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('toggleRaidMode')
                                .setLabel(newStatus === 'Actif' ? 'Désactiver Raid Mode' : 'Activer Raid Mode')
                                .setStyle(newStatus === 'Actif' ? ButtonStyle.Danger : ButtonStyle.Success)
                        )
                    ]
                });
            }
        });
    }
};
