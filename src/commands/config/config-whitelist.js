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
        const dir = path.dirname(guildPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
        return false;
    }
}

module.exports = {
    data: {
        name: 'config-whitelist',
        description: 'Configurer la whitelist de ce serveur.',
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const guildFilePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        let guildData = loadGuildData(guildFilePath);

        if (!guildData || Object.keys(guildData).length === 0) {
            return interaction.followUp({
                content: "⚠️ Les données du serveur n'ont pas été initialisées.",
                ephemeral: true
            });
        }

        const whitelist = guildData.whitelist || [];
        const isOwner = guildData.ownerId === interaction.user.id;
        const devRoleId = guildData.dev_role;
        const hasDevRole = devRoleId && interaction.member.roles.cache.has(devRoleId);

        if (!isOwner && !hasDevRole) {
            return interaction.followUp({
                content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                ephemeral: true
            });
        }

        let currentMessage = null;
        let currentCollector = null;

        const createEmbed = () => {
            return new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('🪬 Configuration de la Whitelist')
                .setDescription('La Whitelist est utilisée pour :\n\n• **Ne pas être contraint par les limitations de l\'Anti-Raid.**\n• **Utiliser les commandes WhiteList.**')
                .addFields([{
                    name: 'Membres actuels',
                    value: whitelist.length > 0
                        ? whitelist.map(id => `<@${id}>`).join(', ')
                        : 'Aucun membre dans la Whitelist.',
                    inline: false
                }])
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();
        };

        const createMenu = () => {
            return new ActionRowBuilder().addComponents(
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
                            value: 'add_member'
                        },
                        {
                            label: 'Retirer un membre',
                            description: 'Retirez un membre de la Whitelist',
                            value: 'remove_member'
                        }
                    ])
            );
        };

        const updateMainMessage = async () => {
            try {
                await interaction.editReply({
                    embeds: [createEmbed()],
                    components: [createMenu()]
                });
            } catch (error) {
                console.error('Erreur lors de la mise à jour du message principal:', error);
            }
        };

        const cleanupMessages = async (messages) => {
            if (!Array.isArray(messages)) messages = [messages];
            for (const msg of messages) {
                if (msg) {
                    try {
                        await msg.delete().catch(() => {});
                    } catch (error) {
                        console.error('Erreur lors de la suppression du message:', error);
                    }
                }
            }
        };

        const handleAddMember = async (i) => {
            const prompt = await i.reply({
                content: 'Veuillez mentionner un utilisateur à ajouter à la Whitelist (format : @username).',
                ephemeral: true,
                fetchReply: true
            });

            const filter = m => m.author.id === i.user.id && m.mentions.users.size > 0;
            const collector = i.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async (response) => {
                const mentionedUser = response.mentions.users.first();
                if (mentionedUser && !whitelist.includes(mentionedUser.id)) {
                    whitelist.push(mentionedUser.id);
                    guildData.whitelist = whitelist;
                    
                    if (saveGuildData(guildFilePath, guildData)) {
                        await updateMainMessage();
                        await i.followUp({
                            content: `✅ <@${mentionedUser.id}> a été ajouté à la Whitelist.`,
                            ephemeral: true
                        });
                    } else {
                        await i.followUp({
                            content: '❌ Erreur lors de la sauvegarde des données.',
                            ephemeral: true
                        });
                    }
                } else {
                    await i.followUp({
                        content: '⚠️ Utilisateur invalide ou déjà dans la Whitelist.',
                        ephemeral: true
                    });
                }
                await cleanupMessages([response, prompt]);
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await i.followUp({
                        content: '⏳ Temps écoulé, aucun utilisateur ajouté.',
                        ephemeral: true
                    });
                    await cleanupMessages(prompt);
                }
            });
        };

        const handleRemoveMember = async (i) => {
            const removableWhitelist = whitelist.filter(id => id !== guildData.ownerId);
            
            if (removableWhitelist.length === 0) {
                return await i.reply({
                    content: '⚠️ Aucun membre ne peut être retiré de la Whitelist.',
                    ephemeral: true
                });
            }

            const removeMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('remove_whitelist_member')
                    .setPlaceholder('Sélectionnez un membre à retirer')
                    .addOptions(
                        removableWhitelist.map(id => ({
                            label: interaction.guild.members.cache.get(id)?.user.tag || `ID: ${id}`,
                            value: id
                        }))
                    )
            );

            const prompt = await i.reply({
                content: 'Sélectionnez un membre à retirer :',
                components: [removeMenu],
                ephemeral: true,
                fetchReply: true
            });

            const collector = prompt.createMessageComponentCollector({
                filter: response => response.user.id === i.user.id,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (selection) => {
                const memberId = selection.values[0];
                const index = whitelist.indexOf(memberId);
                
                if (index !== -1) {
                    whitelist.splice(index, 1);
                    guildData.whitelist = whitelist;
                    
                    if (saveGuildData(guildFilePath, guildData)) {
                        await updateMainMessage();
                        await selection.update({
                            content: `✅ <@${memberId}> a été retiré de la Whitelist.`,
                            components: []
                        });
                    } else {
                        await selection.update({
                            content: '❌ Erreur lors de la sauvegarde des données.',
                            components: []
                        });
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    await prompt.edit({ components: [] });
                } catch (error) {
                    console.error('Erreur lors de la mise à jour du prompt:', error);
                }
            });
        };

        currentMessage = await interaction.followUp({
            embeds: [createEmbed()],
            components: [createMenu()],
            ephemeral: true
        });

        currentCollector = currentMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        currentCollector.on('collect', async (i) => {
            const action = i.values[0];
            
            if (action === 'close_configuration') {
                await i.update({
                    content: 'Configuration fermée avec succès.',
                    embeds: [],
                    components: []
                });
                currentCollector.stop();
            } else if (action === 'add_member') {
                await handleAddMember(i);
            } else if (action === 'remove_member') {
                await handleRemoveMember(i);
            }
        });

        currentCollector.on('end', async () => {
            try {
                await interaction.editReply({
                    content: 'Session de configuration terminée.',
                    embeds: [],
                    components: []
                });
            } catch (error) {
                console.error('Erreur lors de la fermeture de la configuration:', error);
            }
        });
    }
};