const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Envoyez un message et choisissez où l\'envoyer.')
        .addStringOption(option =>
            option.setName('message')
            .setDescription('Le message à envoyer.')
            .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }

        const message = interaction.options.getString('message');
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('📢 Choisissez une option')
            .setDescription('Veuillez sélectionner une destination pour votre message.')
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R6djQ4YXZtOGRnOHlpamg3bjhhcGR1eHBndmhza3B4eWkzYjVtcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/M8xmO5ZcLPtAY/giphy.gif')
            .addFields(
                { name: '🔤 Contenu du message', value: message },
                { name: '🌐 Serveur entier', value: 'Envoyer un message à tous les salons visibles.' },
                { name: '📄 Salon spécifique', value: 'Envoyer un message dans un salon précis.' },
                { name: '👤 Message privé', value: 'Envoyer un message directement à un utilisateur.' }
            )
            .setFooter({ text: 'Commande /say', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select')
                    .setPlaceholder('Rien de sélectionné')
                    .addOptions([
                        {
                            label: 'Envoyer dans ce salon',
                            description: 'Envoyer le message dans le salon actuel',
                            value: 'current_channel',
                            emoji: '📥',
                        },
                        {
                            label: 'Choisir un salon',
                            description: 'Envoyer le message dans un salon spécifique',
                            value: 'choose_channel',
                            emoji: '📑',
                        },
                        {
                            label: 'Mentionner un utilisateur',
                            description: 'Envoyer un message privé à un utilisateur mentionné',
                            value: 'mention_user',
                            emoji: '👤',
                        },
                        {
                            label: 'Annuler l\'envoi',
                            description: 'Annuler cette opération',
                            value: 'cancel',
                            emoji: '❌',
                        }
                    ]),
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        const filter = i => i.customId === 'select' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.values[0] === 'current_channel') {
                await interaction.channel.send(message);
                await interaction.editReply({ content: 'Message envoyé dans le salon actuel.', embeds: [], components: [] });
            }else if (i.values[0] === 'choose_channel') {
                const MAX_OPTIONS = 25; // Limite Discord pour les options dans un menu déroulant
                let currentPage = 0;
            
                const textChannels = interaction.guild.channels.cache
                    .filter(channel => channel.type === ChannelType.GuildText)
                    .map(channel => ({ label: channel.name, value: channel.id }));
            
                const totalPages = Math.ceil(textChannels.length / MAX_OPTIONS);
            
                // Fonction pour créer un menu déroulant basé sur la page actuelle
                function createChannelMenu(page) {
                    const start = page * MAX_OPTIONS;
                    const end = start + MAX_OPTIONS;
            
                    return new StringSelectMenuBuilder()
                        .setCustomId('channel_select')
                        .setPlaceholder('Sélectionnez un salon')
                        .addOptions(textChannels.slice(start, end));
                }
            
                // Fonction pour créer les boutons de pagination
                function createPaginationButtons(page) {
                    return new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous_page')
                            .setLabel('⬅️ Précédent')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next_page')
                            .setLabel('➡️ Suivant')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );
                }
            
                const channelSelectEmbed = new EmbedBuilder()
                    .setTitle('📢 Choisissez un salon')
                    .setColor(guildData.botColor || '#f40076')
                    .setDescription('Sélectionnez un salon où envoyer votre message.')
                    .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXhid3loZ2t3YzF4OTU3NGEzNHlyOTFjZ2NrOWZlNmhiMDJtdzNlbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZEaEpXemtVDRra0V07/giphy.gif')
                    .addFields(
                        { name: '🔤 Contenu du message', value: message },
                        { name: '📄 Salon spécifique', value: 'Envoyer un message dans un salon précis.' }
                    )
                    .setFooter({ text: 'Commande /say', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
                    .setTimestamp();
            
                // Envoyer le premier menu avec les boutons de pagination
                await i.update({
                    embeds: [channelSelectEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(createChannelMenu(currentPage)),
                        createPaginationButtons(currentPage),
                    ],
                });
            
                // Collecteurs pour le menu déroulant et les boutons de pagination
                const filter = i => i.user.id === interaction.user.id;
                const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
            
                collector.on('collect', async i => {
                    if (i.customId === 'next_page') {
                        currentPage++;
                        await i.update({
                            components: [
                                new ActionRowBuilder().addComponents(createChannelMenu(currentPage)),
                                createPaginationButtons(currentPage),
                            ],
                        });
                    } else if (i.customId === 'previous_page') {
                        currentPage--;
                        await i.update({
                            components: [
                                new ActionRowBuilder().addComponents(createChannelMenu(currentPage)),
                                createPaginationButtons(currentPage),
                            ],
                        });
                    } else if (i.customId === 'channel_select') {
                        const selectedChannel = interaction.guild.channels.cache.get(i.values[0]);
                        await selectedChannel.send(message);
            
                        await interaction.editReply({
                            content: '✅ Message envoyé dans le salon sélectionné.',
                            embeds: [],
                            components: [],
                        });
                        collector.stop(); // Arrêter le collecteur après la sélection
                    }
                });
            
                collector.on('end', () => {
                    interaction.editReply({
                        components: [],
                    }).catch(() => {});
                });
            } else if (i.values[0] === 'mention_user') {
                const userMentionEmbed = new EmbedBuilder()
                    .setTitle('📢 Mentionnez un utilisateur')
                    .setColor(guildData.botColor || '#f40076')
                    .setDescription('Sélectionnez un utilisateur à qui envoyer un message.')
                    .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmc2bXdhMDhsMmg4bDV4NmF6cTcwYzU4MHQyZjdkNHc1bnRwbHVhayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufeYWInLG5hBv9e/giphy.gif')
                    .addFields(
                        { name: '🔤 Contenu du message', value: message },
                        { name: '👤 Message privé', value: 'Envoyer un message directement à un utilisateur.' }
                    )
                    .setFooter({ text: 'Commande /say', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
                    .setTimestamp();

                await i.update({ embeds: [userMentionEmbed], components: [] });

                const userFilter = m => m.mentions.users.size > 0 && m.author.id === interaction.user.id;
                const userCollector = interaction.channel.createMessageCollector({ filter: userFilter, time: 60000 });

                userCollector.on('collect', async m => {
                    const user = m.mentions.users.first();
                    await user.send(message);
                    await interaction.editReply({ content: 'Message privé envoyé à l\'utilisateur mentionné.', embeds: [], components: [] });
                    await m.delete();
                });
            } else if (i.values[0] === 'cancel') {
                await interaction.editReply({ content: 'Opération annulée.', embeds: [], components: [] });
            }
        });
    }
};