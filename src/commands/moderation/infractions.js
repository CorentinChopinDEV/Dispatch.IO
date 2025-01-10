const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Charger les données de la guilde
const loadGuildData = (guildPath) => {
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données : ${error.message}`);
    }
    return {};
};

// Sauvegarder les données de la guilde
const saveGuildData = (guildPath, newData) => {
    try {
        const currentData = loadGuildData(guildPath);
        const mergedData = { ...currentData, ...newData };
        fs.writeFileSync(guildPath, JSON.stringify(mergedData, null, 2));
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde des données : ${error.message}`);
    }
};

// Créer une rangée d'actions (boutons)
const createActionRow = (currentIndex, infractions, isAdmin, isGuildOwner) => {
    const actionRow = new ActionRowBuilder();
    const buttons = [];

    if (currentIndex > 0) {
        buttons.push(new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Précédent')
            .setStyle(ButtonStyle.Primary));
    }

    if (currentIndex < infractions.length - 1) {
        buttons.push(new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Suivant')
            .setStyle(ButtonStyle.Primary));
    }

    if (isAdmin || isGuildOwner) {
        buttons.push(new ButtonBuilder()
            .setCustomId('delete')
            .setLabel('Supprimer')
            .setStyle(ButtonStyle.Danger));
    }

    if (buttons.length > 0) {
        actionRow.addComponents(buttons);
    }

    return actionRow;
};

module.exports = {
    data: {
        name: 'infractions',
        description: 'Affiche toutes les infractions d\'un utilisateur.',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: 'L\'utilisateur dont vous voulez voir les infractions',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        const targetUser = interaction.options.getUser('utilisateur');
        const infractions = (guildData.infractions || []).filter(
            (infraction) => infraction.id === targetUser.id
        );

        if (infractions.length === 0) {
            return interaction.reply({
                content: `Aucune infraction trouvée pour ${targetUser.tag}.`,
                ephemeral: true,
            });
        }

        let currentIndex = 0;
        const isGuildOwner = interaction.user.id === interaction.guild.ownerId;
        const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);

        const generateEmbed = (index) => {
            const infraction = infractions[index];
        
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`🚨 Infraction #${index + 1} sur ${infractions.length}`)
                .setDescription(
                    `Voici les détails de l'infraction pour **<@${infraction.id}>** :`
                )
                .addFields(
                    { name: '🛑 **Type d\'infraction**', value: infraction.type || 'Inconnu', inline: false },
                    { name: '⏰ **Date**', value: new Date(infraction.date).toLocaleString(), inline: false },
                    { name: '👮 **Averti par**', value: `<@${infraction.warnedBy}>`, inline: false }
                )
                .setThumbnail('https://i.imgur.com/XO9fkrb.png') // Une icône d'avertissement
                .setFooter({
                    text: `ID Infraction : ${infraction.id}`,
                    iconURL: 'https://i.imgur.com/Ka1F8LX.png' // Une petite icône discrète pour le footer
                });
        
            // Ajout conditionnel des champs
            if (infraction.duration && infraction.duration !== 'Non attribuée') {
                embed.addFields({ name: '⏳ **Durée**', value: infraction.duration, inline: false });
            }
            if (infraction.raison && infraction.raison !== 'Non spécifiée' && infraction.raison !== 'Aucune raison spécifiée.') {
                embed.addFields({ name: '📄 **Raison**', value: infraction.raison, inline: false });
            }
        
            return embed;
        };

        const embed = generateEmbed(currentIndex);
        const actionRow = createActionRow(currentIndex, infractions, isAdmin, isGuildOwner);

        const message = await interaction.reply({
            embeds: [embed],
            components: actionRow.components.length > 0 ? [actionRow] : [],
            fetchReply: true,
            ephemeral: true
        });

        const collector = message.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Vous ne pouvez pas interagir avec ce message.', ephemeral: true });
            }
            if (i.customId === 'delete') {
                if (!isAdmin && !isGuildOwner) {
                    return i.reply({ content: 'Seuls les administrateurs peuvent supprimer des infractions.', ephemeral: true });
                }
                const confirmationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_delete')
                        .setLabel('Confirmer')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_delete')
                        .setLabel('Annuler')
                        .setStyle(ButtonStyle.Secondary)
                );
        
                // Réponse initiale avec les boutons de confirmation
                const deleteConfirm = await i.reply({
                    content: 'Êtes-vous sûr de vouloir supprimer cette infraction ?',
                    components: [confirmationRow],
                    ephemeral: true,
                });
            
                const filter = (confirmInteraction) =>
                    confirmInteraction.user.id === i.user.id && 
                    ['confirm_delete', 'cancel_delete'].includes(confirmInteraction.customId);
            
                const confirmCollector = i.channel.createMessageComponentCollector({
                    filter,
                    time: 15000, // 15 secondes pour répondre
                    max: 1, // Une seule interaction est attendue
                });
            
                confirmCollector.on('collect', async (confirmInteraction) => {
                    if (confirmInteraction.customId === 'confirm_delete') {
                        const infraction = infractions[currentIndex];
                        infractions.splice(currentIndex, 1);
                        saveGuildData(guildPath, { infractions });
                        await deleteConfirm.delete();
                        // Créer un embed détaillé pour les logs
                        const confirmationEmbed = new EmbedBuilder()
                            .setColor('#ff0000') // Couleur de l'embed de confirmation
                            .setTitle('Infraction supprimée')
                            .setDescription(`L'infraction pour <@${targetUser.id}> a été supprimée avec succès.`)
                            .addFields(
                                { name: '🛑 **Type d\'infraction**', value: infraction.type || 'Inconnu' },
                                { name: '⏰ **Date de l\'infraction**', value: new Date(infraction.date).toLocaleString() },
                                { name: '📄 **Raison**', value: infraction.raison || 'Aucune raison spécifiée' },
                                { name: '👮 **Averti par**', value: `<@${infraction.warnedBy}>` },
                                { name: '🗑️ **Supprimée par**', value: `<@${i.user.id}>` },
                                { name: '⏳ **Date de suppression**', value: new Date().toLocaleString() }
                            )
                            .setFooter({
                                text: `ID Infraction : ${infraction.id}`,
                                iconURL: 'https://i.imgur.com/Ka1F8LX.png'
                            });

                        // Vérifier si le salon `logs_member_channel` existe
                        const logChannelId = guildData.logs_member_channel;
                        const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;

                        if (logChannel) {
                            // Si le salon de logs existe, envoyer l'embed dans ce salon
                            await logChannel.send({ embeds: [confirmationEmbed] });
                        } else {
                            // Sinon, envoyer l'embed dans le salon de l'interaction
                            await confirmInteraction.update({ content: 'Infraction supprimée avec succès.', components: [] });
                            await interaction.channel.send({ embeds: [confirmationEmbed] });
                        }

                        if (infractions.length === 0) {
                            return interaction.editReply({ content: 'Toutes les infractions ont été supprimées.', embeds: [], components: [] });
                        }

                        currentIndex = Math.max(currentIndex - 1, 0);
                        const updatedEmbed = generateEmbed(currentIndex);
                        const updatedActionRow = createActionRow(currentIndex, infractions, isAdmin);

                        await interaction.editReply({
                            embeds: [updatedEmbed],
                            components: updatedActionRow.components.length >= 1  ? [updatedActionRow] : [],
                        });
                    } else if (confirmInteraction.customId === 'cancel_delete') {
                        await confirmInteraction.update({ content: 'Suppression annulée.', components: [] });
                    }
                });
            
                confirmCollector.on('end', (collected, reason) => {
                    if (reason === 'time') {
                        i.editReply({ content: 'Temps écoulé, suppression annulée.', components: [] }).catch(() => null);
                    }
                });
                return;
            }
        });
    },
};
