const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

module.exports = {
    data: {
        name: 'role-all',
        description: 'Ajoute un rôle à tous les membres du serveur.',
        options: [
            {
                name: 'role',
                type: 8, // Type 8 correspond à ROLE dans Discord.js
                description: 'Le rôle que vous souhaitez attribuer à tous les membres.',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.editReply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }
        const roleToAssign = interaction.options.getRole('role'); // Récupère le rôle mentionné dans la commande
        if (!roleToAssign) {
            return interaction.editReply({
                content: 'Veuillez spécifier un rôle valide.',
                ephemeral: true,
            });
        }

        const memberCount = interaction.guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setAuthor({
                name: 'Attribution en masse de rôle',
                iconURL: interaction.guild.iconURL({ dynamic: true }), // Icone de la guilde
            })
            .setDescription(
                `⚠️ Vous vous apprêtez à donner le rôle **<@&${roleToAssign.id}>** aux **${memberCount.toLocaleString('fr-FR')}** membres du serveur.\n\n**Que souhaitez-vous faire ?**\n` +
                `👥・Attribuer le rôle uniquement **aux humains.**\n` +
                `🤖・Attribuer le rôle uniquement **aux robots.**\n` +
                `♾️・Attribuer le rôle à **tous les membres.**`
            )
            .setFooter({
                text: `Demandé par @${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }), // Avatar de l'utilisateur
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('assign_humans')
                .setLabel('👥')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('assign_bots')
                .setLabel('🤖')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('assign_all')
                .setLabel('♾️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 60000, // Durée de 60 secondes pour interagir
        });

        collector.on('collect', async (buttonInteraction) => {
            await buttonInteraction.deferUpdate();

            if (buttonInteraction.customId === 'cancel') {
                await interaction.editReply({
                    content: 'L’attribution en masse de rôle a été annulée.',
                    components: [],
                });
                return collector.stop();
            }

            // Confirmation supplémentaire
            const confirmationEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('Confirmation requise')
                .setDescription(
                    `Voulez-vous vraiment attribuer le rôle **<@&${roleToAssign.id}>** selon l'option choisie ?\n` +
                    `Appuyez sur **Valider** pour confirmer ou **Refuser** pour annuler.`
                )
                .setFooter({
                    text: `Demandé par @${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                })
                .setTimestamp();

            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Valider')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('reject')
                    .setLabel('Refuser')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ embeds: [confirmationEmbed], components: [confirmationRow] });

            const confirmationCollector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 30000, // 30 secondes pour la confirmation
            });

            confirmationCollector.on('collect', async (confirmationInteraction) => {
                await confirmationInteraction.deferUpdate();

                if (confirmationInteraction.customId === 'reject') {
                    await interaction.editReply({
                        content: 'L’attribution en masse de rôle a été annulée.',
                        components: [],
                    });
                    return confirmationCollector.stop();
                }

                if (confirmationInteraction.customId === 'confirm') {
                    const guildMembers = await interaction.guild.members.fetch();
                    const humans = guildMembers.filter((member) => !member.user.bot);
                    const bots = guildMembers.filter((member) => member.user.bot);

                    switch (buttonInteraction.customId) {
                        case 'assign_humans': {
                            const totalHumans = humans.size;
                            let completed = 0;
                            const startTime = Date.now();
                        
                            for (const member of humans.values()) {
                                await member.roles.add(roleToAssign).catch(console.error);
                                completed++;
                        
                                // Calcul du pourcentage et du temps restant
                                const progress = Math.round((completed / totalHumans) * 100);
                                const elapsed = (Date.now() - startTime) / 1000; // Temps écoulé en secondes
                                const remaining = ((elapsed / completed) * (totalHumans - completed)).toFixed(2); // Temps restant estimé
                        
                                // Mise à jour de l'embed pour afficher la progression
                                const progressEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('Attribution des rôles en cours...')
                                    .setDescription(
                                        `👥 Rôle **<@&${roleToAssign.id}>** en cours d'attribution aux membres humains.\n\n` +
                                        `**Progression** : ${progress}%\n` +
                                        `**Membres traités** : ${completed}/${totalHumans}\n` +
                                        `⏳ Temps estimé restant : ${remaining} secondes`
                                    )
                                    .setFooter({ text: `Demandé par @${interaction.user.tag}` })
                                    .setTimestamp();
                        
                                await interaction.editReply({ embeds: [progressEmbed], components: [] });
                            }
                        
                            await interaction.editReply({
                                content: `✅ Le rôle **<@&${roleToAssign.id}>** a été attribué à tous les membres humains.`,
                                embeds: [],
                                components: [],
                            });
                            break;
                        }
                        
                        case 'assign_bots': {
                            const totalBots = bots.size;
                            let completed = 0;
                            const startTime = Date.now();
                        
                            for (const member of bots.values()) {
                                await member.roles.add(roleToAssign).catch(console.error);
                                completed++;
                        
                                const progress = Math.round((completed / totalBots) * 100);
                                const elapsed = (Date.now() - startTime) / 1000;
                                const remaining = ((elapsed / completed) * (totalBots - completed)).toFixed(2);
                        
                                const progressEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('Attribution des rôles en cours...')
                                    .setDescription(
                                        `🤖 Rôle **<@&${roleToAssign.id}>** en cours d'attribution aux robots.\n\n` +
                                        `**Progression** : ${progress}%\n` +
                                        `**Membres traités** : ${completed}/${totalBots}\n` +
                                        `⏳ Temps estimé restant : ${remaining} secondes`
                                    )
                                    .setFooter({ text: `Demandé par @${interaction.user.tag}` })
                                    .setTimestamp();
                        
                                await interaction.editReply({ embeds: [progressEmbed], components: [] });
                            }
                        
                            await interaction.editReply({
                                content: `✅ Le rôle **<@&${roleToAssign.id}>** a été attribué à tous les robots.`,
                                embeds: [],
                                components: [],
                            });
                            break;
                        }
                        
                        case 'assign_all': {
                            const totalMembers = guildMembers.size;
                            let completed = 0;
                            const startTime = Date.now();
                        
                            for (const member of guildMembers.values()) {
                                await member.roles.add(roleToAssign).catch(console.error);
                                completed++;
                        
                                const progress = Math.round((completed / totalMembers) * 100);
                                const elapsed = (Date.now() - startTime) / 1000;
                                const remaining = ((elapsed / completed) * (totalMembers - completed)).toFixed(2);
                        
                                const progressEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('Attribution des rôles en cours...')
                                    .setDescription(
                                        `♾️ Rôle **<@&${roleToAssign.id}>** en cours d'attribution à tous les membres.\n\n` +
                                        `**Progression** : ${progress}%\n` +
                                        `**Membres traités** : ${completed}/${totalMembers}\n` +
                                        `⏳ Temps estimé restant : ${remaining} secondes`
                                    )
                                    .setFooter({ text: `Demandé par @${interaction.user.tag}` })
                                    .setTimestamp();
                        
                                await interaction.editReply({ embeds: [progressEmbed], components: [] });
                            }
                        
                            await interaction.editReply({
                                content: `✅ Le rôle **<@&${roleToAssign.id}>** a été attribué à tous les membres.`,
                                embeds: [],
                                components: [],
                            });
                            break;
                        }                        
                    }

                    confirmationCollector.stop();
                }
            });

            confirmationCollector.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.editReply({
                        content: 'Temps écoulé. L’opération a été annulée.',
                        components: [],
                    });
                }
            });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: 'Temps écoulé. L’attribution en masse de rôle a été annulée.',
                    components: [],
                });
            }
        });
    },
};
