const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
        name: 'config-whitelist',
        description: 'Configurer la whitelist de ce serveur.',
    },
    async execute(interaction) {
            console.log('Interaction CONFWhitelist reçue.');
            await interaction.deferReply({ ephemeral: true });

            const guildId = interaction.guild.id;
            const guildFilePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);

            if (!fs.existsSync(guildFilePath)) {
                return interaction.followUp({
                    content: "\u26A0\uFE0F Les données du serveur n'ont pas été initialisées.",
                    ephemeral: true
                });
            }

            const guildData = JSON.parse(fs.readFileSync(guildFilePath, 'utf8'));
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
            const whitelist = guildData.whitelist || [];

            // Embed initial
            const whitelistEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('🪬 Configuration de la Whitelist')
                .setDescription('La Whitelist est utilisée pour :\n\n\u2022 **Ne pas être contraint par les limitations de l\'Anti-Raid.**\n\u2022 **Utiliser les commandes WhiteList.**')
                // .addFields([
                //     {
                //         name: 'Membres actuels',
                //         // value: whitelist.length > 0 ? whitelist.map(id => `<@${id}>`).join(', ') : 'Aucun membre dans la Whitelist.',
                //         inline: false
                //     }
                // ])
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const whitelistMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('manage_whitelist')
                    .setPlaceholder('Ajouter ou retirer des membres')
                    .addOptions([
                        {
                            label: 'Fermer la configuration',
                            description: 'Fermez et supprimez la configuration',
                            value: 'close_configuration'
                        },
                        {
                            label: 'Ajouter un membre',
                            description: 'Ajoutez un membre à la Whitelist',
                            value: 'add_member',
                        },
                        {
                            label: 'Retirer un membre',
                            description: 'Retirez un membre de la Whitelist',
                            value: 'remove_member',
                        }
                    ])
            );

            // Envoi de l'embed initial
            const message = await interaction.followUp({
                embeds: [whitelistEmbed],
                components: [whitelistMenu],
                ephemeral: true
            });

            const filter = i => i.customId === 'manage_whitelist' && i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const action = i.values[0];
                if (action === 'add_member') {
                    const responseMessage = await i.reply({
                        content: 'Veuillez mentionner un utilisateur à ajouter à la Whitelist (format : @username).',
                        ephemeral: true
                    });

                    const msgFilter = m => m.author.id === i.user.id && m.mentions.users.size > 0;
                    const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter, time: 60000 });

                    msgCollector.on('collect', async response => {
                        const mentionedUser = response.mentions.users.first();

                        if (mentionedUser) {
                            const userId = mentionedUser.id;

                            if (!whitelist.includes(userId)) {
                                whitelist.push(userId);

                                // Mise à jour du fichier JSON
                                guildData.whitelist = whitelist;
                                fs.writeFileSync(
                                    guildFilePath,
                                    JSON.stringify(guildData, null, 2)
                                );

                                // Confirmation dans un embed séparé
                                const confirmationEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('✅ Membre ajouté')
                                    .setDescription(`<@${mentionedUser.id}> a été ajouté à la Whitelist avec succès.`)
                                    .setTimestamp();

                                await i.followUp({
                                    embeds: [confirmationEmbed],
                                    ephemeral: true
                                });

                                // Mise à jour de l'embed principal
                                whitelistEmbed.setFields([
                                    {
                                        name: 'Membres actuels',
                                        value: whitelist.map(id => `<@${id}>`).join('\n'),
                                        inline: false
                                    }
                                ]);

                                await interaction.editReply({
                                    embeds: [whitelistEmbed],
                                    components: [whitelistMenu]
                                });

                                // Suppression des messages temporaires
                                await response.delete().catch(() => console.log('Impossible de supprimer le message de l\'utilisateur.'));
                                await responseMessage.delete();
                            } else {
                                await i.followUp({
                                    content: `⚠️ **${mentionedUser.tag}** est déjà dans la Whitelist.`,
                                    ephemeral: true
                                });
                            }
                        } else {
                            await i.followUp({
                                content: '⚠️ Aucune mention valide détectée.',
                                ephemeral: true
                            });
                        }

                        msgCollector.stop(); // Fin de la collecte des messages
                    });

                    msgCollector.on('end', async (_, reason) => {
                        if (reason === 'time') {
                            await i.followUp({
                                content: '⏳ Temps écoulé, aucun utilisateur n’a été ajouté.',
                                ephemeral: true
                            });
                        }
                    });
                } else if (action === 'remove_member') {
                    // Filtrer les membres de la whitelist pour exclure le propriétaire de la guilde
                    const removableMembers = whitelist.filter(id => id !== interaction.guild.ownerId);
                
                    if (removableMembers.length === 0) {
                        return i.reply({
                            content: '⚠️ Aucun membre à retirer de la Whitelist (le propriétaire ne peut pas être retiré).',
                            ephemeral: true
                        });
                    }

                    const removeMenuOptions = [];

                    for (const id of removableMembers) {
                        try {
                            // Récupérer le membre depuis l'API Discord si nécessaire
                            const member = await interaction.guild.members.fetch(id).catch(() => null);

                            removeMenuOptions.push({
                                label: member ? member.user.tag : `Utilisateur inconnu (${id})`, // Nom ou "Utilisateur inconnu"
                                value: id
                            });
                        } catch (err) {
                            console.error(`Impossible de récupérer le membre avec l'ID ${id}:`, err);
                            removeMenuOptions.push({
                                label: `Utilisateur inconnu (${id})`, // Si une erreur survient
                                value: id
                            });
                        }
                    }

                    const removeMenu = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('select_remove_member')
                            .setPlaceholder('Sélectionnez un membre à retirer')
                            .addOptions(removeMenuOptions)
                    );

                    
                
                    // Envoyer le menu pour retirer un membre
                    await i.reply({
                        content: 'Sélectionnez un membre à retirer de la Whitelist.',
                        components: [removeMenu],
                        ephemeral: true
                    });
                
                    // Créer un collecteur pour le menu de suppression
                    const removeCollector = i.channel.createMessageComponentCollector({
                        filter: subI => subI.customId === 'select_remove_member' && subI.user.id === interaction.user.id,
                        time: 60000
                    });
                
                    removeCollector.on('collect', async subI => {
                        const selectedMemberId = subI.values[0];
                    
                        // Vérifier si l'utilisateur sélectionné est dans la whitelist
                        const index = whitelist.indexOf(selectedMemberId);
                        if (index > -1) {
                            whitelist.splice(index, 1);
                    
                            // Mise à jour des données dans le fichier JSON
                            guildData.whitelist = whitelist;
                            fs.writeFileSync(
                                guildFilePath,
                                JSON.stringify(guildData, null, 2)
                            );
                    
                            // Confirmation visuelle
                            const confirmationEmbed = new EmbedBuilder()
                                .setColor('#FF0000')
                                .setTitle('❌ Membre retiré')
                                .setDescription(`<@${selectedMemberId}> a été retiré de la Whitelist.`)
                                .setTimestamp();
                    
                            await subI.reply({
                                embeds: [confirmationEmbed],
                                ephemeral: true
                            });
                    
                            // Mise à jour de l'embed principal
                            whitelistEmbed.setFields([{
                                name: 'Membres actuels',
                                value: whitelist.length > 0
                                    ? whitelist.map(id => `<@${id}>`).join(', ')
                                    : 'Aucun membre dans la Whitelist.',
                                inline: false
                            }]);
                    
                            // Supprimer le menu déroulant de sélection
                            await i.deleteReply()
                        } else {
                            await subI.reply({
                                content: '⚠️ Le membre sélectionné n\'est pas dans la Whitelist.',
                                ephemeral: true
                            });
                        }
                    
                        removeCollector.stop(); // Arrêter le collecteur
                    });                    
                
                    removeCollector.on('end', (_, reason) => {
                        if (reason === 'time') {
                            i.followUp({
                                content: '⏳ Temps écoulé, aucun membre n\'a été retiré.',
                                ephemeral: true
                            }).catch(() => null);
                        }
                    });
                }
                 else if (action === 'close_configuration') {
                    await interaction.deleteReply();
                    await i.reply({ content: '🛑 Configuration fermée.', ephemeral: true });
                    collector.stop();
                }
            });

            collector.on('end', () => {
                console.log('Interaction expirée.');
            });
    }
};
