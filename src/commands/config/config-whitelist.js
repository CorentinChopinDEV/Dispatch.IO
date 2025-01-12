const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Chargement des données de la guilde
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

// Sauvegarde des données de la guilde
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

        // Vérification de l'existence des données de la guilde
        if (!fs.existsSync(guildFilePath)) {
            return interaction.followUp({
                content: "\u26A0\uFE0F Les données du serveur n'ont pas été initialisées.",
                ephemeral: true,
            });
        }

        const guildData = loadGuildData(guildFilePath);
        const whitelist = Array.isArray(guildData.whitelist) ? guildData.whitelist : [];
        const isOwner = guildData.ownerId === interaction.user.id;
        const devRoleId = guildData.dev_role;
        const hasDevRole = devRoleId && interaction.member.roles.cache.has(devRoleId);

        // Vérification des permissions
        if (!isOwner && !hasDevRole) {
            return interaction.reply({
                content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                ephemeral: true,
            });
        }

        // Embed initial
        const whitelistEmbed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('🪬 Configuration de la Whitelist')
            .setDescription('La Whitelist est utilisée pour :\n\n\u2022 **Ne pas être contraint par les limitations de l\'Anti-Raid.**\n\u2022 **Utiliser les commandes WhiteList.**')
            .addFields([
                {
                    name: 'Membres actuels',
                    value: whitelist.length > 0
                        ? whitelist.map(id => `<@${id}>`).join(', ')
                        : 'Aucun membre dans la Whitelist.',
                    inline: false,
                },
            ])
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
                        value: 'close_configuration',
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
                    },
                ])
        );

        // Envoi de l'embed initial
        const message = await interaction.followUp({
            embeds: [whitelistEmbed],
            components: [whitelistMenu],
            ephemeral: true,
        });

        const filter = i => i.customId === 'manage_whitelist' && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const action = i.values[0];
            if (action === 'add_member') {
                await handleAddMember(interaction, i, guildData, whitelist, guildFilePath, whitelistEmbed, whitelistMenu);
            } else if (action === 'remove_member') {
                await handleRemoveMember(interaction, i, guildData, whitelist, guildFilePath, whitelistEmbed, whitelistMenu);
            } else if (action === 'close_configuration') {
                collector.stop();
                await i.reply({
                    content: 'La configuration a été fermée avec succès.',
                    ephemeral: true,
                });
                await message.delete().catch(() => console.log('Impossible de supprimer le message d\'interaction.'));
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: '⏳ Temps écoulé, veuillez relancer la commande pour continuer.',
                    embeds: [],
                    components: [],
                });
            }
        });
    },
};

// Gestion de l'ajout de membre
async function handleAddMember(interaction, i, guildData, whitelist, guildFilePath, whitelistEmbed, whitelistMenu) {
    const responseMessage = await i.reply({
        content: 'Veuillez mentionner un utilisateur à ajouter à la Whitelist (format : @username).',
        ephemeral: true,
    });

    const msgFilter = m => m.author.id === i.user.id && m.mentions.users.size > 0;
    const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter, time: 60000 });

    msgCollector.on('collect', async response => {
        const mentionedUser = response.mentions.users.first();
        if (mentionedUser && !whitelist.includes(mentionedUser.id)) {
            whitelist.push(mentionedUser.id);
            guildData.whitelist = whitelist;
            saveGuildData(guildFilePath, guildData);

            whitelistEmbed.setFields([
                {
                    name: 'Membres actuels',
                    value: whitelist.map(id => `<@${id}>`).join(', ') || 'Aucun membre dans la Whitelist.',
                    inline: false,
                },
            ]);

            await interaction.editReply({
                embeds: [whitelistEmbed],
                components: [whitelistMenu],
            });

            await response.delete().catch(() => console.log('Impossible de supprimer le message.'));
            await responseMessage.delete();
        } else {
            await i.followUp({
                content: '⚠️ Utilisateur invalide ou déjà dans la Whitelist.',
                ephemeral: true,
            });
        }
        msgCollector.stop();
    });

    msgCollector.on('end', (_, reason) => {
        if (reason === 'time') {
            i.followUp({
                content: '⏳ Temps écoulé, aucun utilisateur ajouté.',
                ephemeral: true,
            });
        }
    });
}

// Gestion de la suppression de membre
async function handleRemoveMember(interaction, i, guildData, whitelist, guildFilePath, whitelistEmbed, whitelistMenu) {
    const removableWhitelist = whitelist.filter(id => id !== guildData.ownerId);

    if (removableWhitelist.length === 0) {
        return i.reply({
            content: '⚠️ Aucun membre ne peut être retiré de la Whitelist.',
            ephemeral: true,
        });
    }

    const removeMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('remove_whitelist_member')
            .setPlaceholder('Sélectionnez un membre à retirer')
            .addOptions(
                removableWhitelist.map(id => ({
                    label: interaction.guild.members.cache.get(id)?.user.tag || `ID: ${id}`,
                    value: id,
                }))
            )
    );

    await i.reply({
        content: 'Sélectionnez un membre à retirer :',
        components: [removeMenu],
        ephemeral: true,
    });

    const removeFilter = i => i.customId === 'remove_whitelist_member' && i.user.id === interaction.user.id;
    const removeCollector = interaction.channel.createMessageComponentCollector({ filter: removeFilter, time: 60000 });

    removeCollector.on('collect', async selection => {
        const memberId = selection.values[0];
        const index = whitelist.indexOf(memberId);
        if (index !== -1) {
            whitelist.splice(index, 1);
            guildData.whitelist = whitelist;
            saveGuildData(guildFilePath, guildData);

            whitelistEmbed.setFields([
                {
                    name: 'Membres actuels',
                    value: whitelist.length > 0
                        ? whitelist.map(id => `<@${id}>`).join(', ')
                        : 'Aucun membre dans la Whitelist.',
                    inline: false,
                },
            ]);

            await interaction.editReply({
                embeds: [whitelistEmbed],
                components: [whitelistMenu],
            });

            await selection.reply({
                content: `✅ <@${memberId}> a été retiré de la Whitelist.`,
                ephemeral: true,
            });
        }
        removeCollector.stop();
    });

    removeCollector.on('end', (_, reason) => {
        if (reason === 'time') {
            i.followUp({
                content: '⏳ Temps écoulé, aucun membre retiré.',
                ephemeral: true,
            });
        }
    });
}
