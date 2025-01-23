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
                type: 8,
                description: 'Le rôle que vous souhaitez attribuer à tous les membres.',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        // Defer la réponse immédiatement
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.editReply({ content: 'Vous n\'avez pas la permission de consulter ceci.' });
            }
        } else {
            return interaction.editReply({ content: '**Rôle administrateur non configuré ->** ``/config-general``' });
        }

        const roleToAssign = interaction.options.getRole('role');
        if (!roleToAssign) {
            return interaction.editReply({ content: 'Veuillez spécifier un rôle valide.' });
        }

        // Vérifier si le bot a la permission de gérer les rôles
        if (!interaction.guild.members.me.permissions.has('ManageRoles')) {
            return interaction.editReply({ content: 'Je n\'ai pas la permission de gérer les rôles sur ce serveur.' });
        }

        // Vérifier si le rôle du bot est plus bas que le rôle à attribuer
        if (roleToAssign.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({ content: 'Je ne peux pas attribuer ce rôle car il est plus haut que mon rôle le plus élevé.' });
        }

        const memberCount = interaction.guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setAuthor({
                name: 'Attribution en masse de rôle',
                iconURL: interaction.guild.iconURL({ dynamic: true }),
            })
            .setDescription(
                `⚠️ Vous vous apprêtez à donner le rôle **<@&${roleToAssign.id}>** aux **${memberCount.toLocaleString('fr-FR')}** membres du serveur.\n\n**Que souhaitez-vous faire ?**\n` +
                `👥・Attribuer le rôle uniquement **aux humains.**\n` +
                `🤖・Attribuer le rôle uniquement **aux robots.**\n` +
                `♾️・Attribuer le rôle à **tous les membres.**`
            )
            .setFooter({
                text: `Demandé par ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('assign_humans')
                .setLabel('Humains')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('assign_bots')
                .setLabel('Robots')
                .setEmoji('🤖')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('assign_all')
                .setLabel('Tous')
                .setEmoji('♾️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.editReply({ embeds: [embed], components: [row] });

        try {
            const filter = i => i.user.id === interaction.user.id;
            const buttonResponse = await message.awaitMessageComponent({ filter, time: 60000 });

            if (buttonResponse.customId === 'cancel') {
                return buttonResponse.update({
                    content: 'L\'attribution en masse de rôle a été annulée.',
                    embeds: [],
                    components: []
                });
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
                    text: `Demandé par ${interaction.user.tag}`,
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

            await buttonResponse.update({ embeds: [confirmationEmbed], components: [confirmationRow] });

            const confirmResponse = await message.awaitMessageComponent({ filter, time: 30000 });

            if (confirmResponse.customId === 'reject') {
                return confirmResponse.update({
                    content: 'L\'attribution en masse de rôle a été annulée.',
                    embeds: [],
                    components: []
                });
            }

            if (confirmResponse.customId === 'confirm') {
                await confirmResponse.update({
                    content: 'Attribution des rôles en cours...',
                    embeds: [],
                    components: []
                });

                const guildMembers = await interaction.guild.members.fetch();
                let targetMembers;

                switch (buttonResponse.customId) {
                    case 'assign_humans':
                        targetMembers = guildMembers.filter(member => !member.user.bot);
                        break;
                    case 'assign_bots':
                        targetMembers = guildMembers.filter(member => member.user.bot);
                        break;
                    case 'assign_all':
                        targetMembers = guildMembers;
                        break;
                }

                let success = 0;
                let failed = 0;
                const totalMembers = targetMembers.size;

                for (const [, member] of targetMembers) {
                    try {
                        await member.roles.add(roleToAssign);
                        success++;

                        if (success % 10 === 0 || success + failed === totalMembers) {
                            const progress = Math.round(((success + failed) / totalMembers) * 100);
                            await interaction.editReply({
                                content: `Attribution en cours... ${progress}% (${success + failed}/${totalMembers})\nRéussis: ${success}\nÉchecs: ${failed}`
                            });
                        }
                    } catch (error) {
                        failed++;
                        console.error(`Erreur lors de l'attribution du rôle à ${member.user.tag}:`, error);
                    }
                }

                return interaction.editReply({
                    content: `✅ Attribution terminée!\nRôle attribué avec succès à ${success} membres.\nÉchecs: ${failed}`,
                    embeds: [],
                    components: []
                });
            }
        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                return interaction.editReply({
                    content: 'Temps écoulé. L\'attribution en masse de rôle a été annulée.',
                    embeds: [],
                    components: []
                });
            }
            console.error('Erreur lors de l\'attribution des rôles:', error);
            return interaction.editReply({
                content: 'Une erreur est survenue lors de l\'attribution des rôles.',
                embeds: [],
                components: []
            });
        }
    },
};