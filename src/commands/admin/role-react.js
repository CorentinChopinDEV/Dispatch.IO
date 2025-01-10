const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

async function checkMessageExistence(channel, messageId) {
    try {
        const message = await channel.messages.fetch(messageId);
        return message ? true : false;
    } catch (error) {
        console.log(`Message avec ID ${messageId} n'existe plus.`);
        return false;
    }
}

async function removeReactionFromMessage(message, emoji) {
    try {
        await message.reactions.remove(emoji);
    } catch (error) {
        console.error('Erreur lors de la suppression de la réaction:', error);
    }
}

async function deleteInvalidReactions(guildData, channel) {
    const validReactions = [];
    for (let i = 0; i < guildData.roleReactions.length; i++) {
        const reaction = guildData.roleReactions[i];
        const exists = await checkMessageExistence(channel, reaction.messageId);
        if (exists) {
            validReactions.push(reaction); // Conserver les réactions valides
        } else {
            // Supprimer les réactions invalides
            console.log(`Suppression de la réaction avec l'emoji ${reaction.emoji} car le message est supprimé.`);
        }
    }
    return validReactions;
}

module.exports = {
    data: {
        name: 'role-react-list',
        description: 'Affiche les rôles de réaction actifs.',
    },

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildDataPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);
        const guildData = loadGuildData(guildDataPath);

        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if(guildData.dev_role){
                const isDev = interaction.member.roles.cache.has(guildData.dev_role);
                if (!isAdmin && !isOwner && !isDev) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
                }
            } else {
                if (!isAdmin && !isOwner) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
                }
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }

        const channel = interaction.channel;
        let updatedReactions = await deleteInvalidReactions(guildData, channel);

        // Sauvegarder les données mises à jour
        guildData.roleReactions = updatedReactions;
        try {
            fs.writeFileSync(guildDataPath, JSON.stringify(guildData, null, 2));
        } catch (err) {
            console.error('Erreur lors de la sauvegarde des données du rôle réaction:', err);
        }

        // Affichage des rôles de réaction valides
        if (updatedReactions.length > 0) {
            let logoURL = 'https://i.ibb.co/TcdznPc/IO-2.png';
            let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Rôles de Réaction Actifs')
                .setThumbnail(logoURL)
                .setImage(bannerURL)
                .setDescription('Voici la liste des rôles de réaction actifs. Sélectionnez un rôle dans le menu déroulant pour le supprimer ou quittez la configuration.');

            updatedReactions.forEach((reaction, index) => {
                // Vérifie si le rôle existe dans la guilde
                const role = interaction.guild.roles.cache.get(reaction.roleId);
            
                if (role) {
                    embed.addFields({
                        name: `Rôle : ${role ? `<@&${reaction.roleId}>` : 'Rôle non trouvé'}`,
                        value: `Émoji : ${reaction.emoji}\nMessage ID : ${reaction.messageId}`,
                        inline: false
                    });
                } else {
                    // Si le rôle n'existe pas, affiche une valeur par défaut ou un message d'erreur
                    embed.addFields({
                        name: `Rôle : Inconnu`,
                        value: `Émoji : ${reaction.emoji}\nMessage ID : ${reaction.messageId}`,
                        inline: false
                    });
                }
            });
                

            // Première rangée pour le menu déroulant
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_reaction_to_remove')
                        .setPlaceholder('Sélectionner un rôle à supprimer')
                        .addOptions(updatedReactions.map((reaction, index) => ({
                            label: reaction.emoji || 'Nom du rôle',
                            value: index.toString(),
                        })))
                );

            // Deuxième rangée pour le bouton de quitter
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('quit_config')
                        .setLabel('Quitter la configuration')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],  // Répond avec les deux rangées
                ephemeral: true,
            });


            // Collecteur pour supprimer une réaction de rôle
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'quit_config') {
                    await i.update({ content: '**Vous avez quitté la configuration des rôles de réaction.** 📂', components: [] });
                    return collector.stop();
                }

                if (i.isSelectMenu()) {
                    const index = parseInt(i.values[0]);
                    const reaction = updatedReactions[index];
                    const message = await channel.messages.fetch(reaction.messageId); // Récupérer le message avec l'ID
                
                    // Vérifier si une réaction avec l'émoji existe
                    const reactionToRemove = message.reactions.cache.get(reaction.emoji); 
                
                    if (reactionToRemove) {
                        // Supprimer toutes les réactions associées à cet émoji
                        await reactionToRemove.remove();
                
                        // Confirmer la suppression
                        const row1 = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('select_reaction_to_remove')
                                    .setPlaceholder('Sélectionner un rôle à supprimer')
                                    .addOptions(updatedReactions.map((reaction, index) => ({
                                        label: reaction.emoji || 'Nom du rôle',
                                        value: index.toString(),
                                    })))
                            );

                        // Deuxième rangée pour le bouton de quitter
                        const row2 = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('quit_config')
                                    .setLabel('Quitter la configuration')
                                    .setStyle(ButtonStyle.Secondary)
                            );
                        await i.update({ content: `La réaction pour le rôle ${reaction.roleName} a été supprimée avec succès.`, components: [row1, row2] });
                
                        // Supprimer de la configuration et sauvegarder
                        updatedReactions.splice(index, 1);
                        guildData.roleReactions = updatedReactions;
                        fs.writeFileSync(guildDataPath, JSON.stringify(guildData, null, 2));
                    } else {
                        console.log("Réaction introuvable");
                        updatedReactions.splice(index, 1);
                        guildData.roleReactions = updatedReactions;
                        fs.writeFileSync(guildDataPath, JSON.stringify(guildData, null, 2));
                        await i.update({ content: "La réaction n'a pas pu être trouvée.", components: [row1, row2] });
                    }
                }
            });
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: 'Temps écoulé pour supprimer une réaction.', components: [] });
                }
            });
        } else {
            await interaction.reply({ content: 'Aucun rôle de réaction actif trouvé.', ephemeral: true });
        }
    },
};
