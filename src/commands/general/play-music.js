const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
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

module.exports = {
    data: {
        name: 'play',
        description: 'Joue une musique ou une playlist depuis YouTube, Spotify ou SoundCloud',
        options: [
            {
                name: 'query',
                type: 3,
                description: 'Le titre, lien ou playlist à jouer',
                required: true
            }
        ]
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Vous devez être dans un salon vocal pour utiliser cette commande.',
                ephemeral: true
            });
        }

        const client = this.client;
        await interaction.deferReply();
        const query = interaction.options.getString('query');

        try {
            const existingConnection = getVoiceConnection(interaction.guild.id);
            const queue = client.player.nodes.get(interaction.guildId);

            // Si une musique est déjà en cours de lecture
            if (queue && queue.isPlaying()) {
                const result = await client.player.search(query, {
                    requestedBy: interaction.user
                });

                if (!result.tracks.length) {
                    return interaction.editReply('❌ Aucun résultat trouvé !');
                }

                queue.addTrack(result.tracks);

                const embed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('🎵 Ajouté à la playlist')
                    .setDescription(`${result.tracks.length > 1
                        ? `**${result.tracks.length} pistes** ajoutées à la playlist`
                        : `**[${result.tracks[0].title}](${result.tracks[0].url})**`}`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            const { track } = await client.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: true,
                    leaveOnEnd: true,
                    leaveOnStop: true,
                    volume: 50,
                    quality: "high",
                    bufferingTimeout: 15000,
                    smoothVolume: true
                }
            });

            // Construct action row with buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pause')
                        .setLabel('⏯️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('loop')
                        .setLabel('🔁')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('skip')
                        .setLabel('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('playlist')
                        .setLabel('📑')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('clear')
                        .setLabel('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

            // Function to create embed for the current track
            const createEmbed = (track, isPaused = false, isLooping = false) => {
                if (!track) {
                    return interaction.deleteReply();
                }

                return new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('🎵 Musique en cours')
                    .setDescription(`**[${track.title}](${track.url})**`)
                    .addFields(
                        { name: '⏱️ Durée', value: track.duration || '?', inline: true },
                        { name: '👤 Demandé par', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '🔁 Boucle', value: isLooping ? 'Activée' : 'Désactivée', inline: false },
                        { name: '⏯️ État', value: isPaused ? 'En pause' : 'En lecture', inline: false },
                        { name: '🙂‍↕️ Contributeur', value: '**Merci à** [MRezor](https://discord.gg/eBTmECdBFH) **pour son aide !**', inline: false },
                        { name: '🎚️ Crédit', value: '**Dispatch.IO | 2025**', inline: false },
                    )
                    .setThumbnail(track.thumbnail)
                    .setTimestamp();
            };

            // Initial message with embed and buttons
            let currentMessage = await interaction.editReply({
                embeds: [createEmbed(track)],
                components: [row]
            });

            // Event handler for player
            client.player.events.on('playerStart', (queue, track) => {
                if (queue.metadata.channelId === interaction.channelId) {
                    currentMessage.edit({
                        embeds: [createEmbed(track, queue.node.isPaused(), queue.repeatMode === 1)],
                        components: [row]
                    }).catch(console.error);
                }
            });

            client.player.events.on('emptyQueue', (queue) => {
                if (queue.metadata.channelId === interaction.channelId) {
                    currentMessage.edit({
                        embeds: [createEmbed(null)],
                        components: [row]
                    }).catch(console.error);

                    const connection = getVoiceConnection(interaction.guild.id);
                    if (connection) {
                        setTimeout(() => connection.destroy(), 1000);
                    }
                }
            });

            // Collector for button interactions
            const collector = currentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 3600000
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: '❌ Seule la personne ayant lancé la musique peut utiliser ces boutons.',
                        ephemeral: true 
                    });
                }

                const queue = client.player.nodes.get(interaction.guildId);
                let updatedEmbed;

                switch (i.customId) {
                    case 'pause':
                        if (!queue || !queue.currentTrack) {
                            return i.reply({
                                content: '❌ Aucune musique en cours de lecture.',
                                ephemeral: true
                            });
                        }
                        queue.node.setPaused(!queue.node.isPaused());
                        updatedEmbed = createEmbed(queue.currentTrack, queue.node.isPaused(), queue.repeatMode === 1);
                        await i.reply({
                            content: queue.node.isPaused() ? '⏸️ Pause' : '▶️ Lecture',
                            ephemeral: true
                        });
                        break;

                    case 'loop':
                        if (!queue || !queue.currentTrack) {
                            return i.reply({
                                content: '❌ Aucune musique en cours de lecture.',
                                ephemeral: true
                            });
                        }
                        queue.setRepeatMode(queue.repeatMode === 0 ? 1 : 0);
                        updatedEmbed = createEmbed(queue.currentTrack, queue.node.isPaused(), queue.repeatMode === 1);
                        await i.reply({
                            content: `🔁 Boucle ${queue.repeatMode === 0 ? 'désactivée' : 'activée'}`,
                            ephemeral: true
                        });
                        break;

                    case 'skip':
                        if (!queue || !queue.currentTrack) {
                            return i.reply({
                                content: '❌ Aucune musique en cours de lecture.',
                                ephemeral: true
                            });
                        }
                        queue.node.skip();
                        await i.reply({
                            content: '⏭️ Musique suivante',
                            ephemeral: true
                        });
                        break;

                    case 'clear':
                        if (queue) {
                            queue.delete();
                        }
                        const connection = getVoiceConnection(interaction.guild.id);
                        if (connection) {
                            connection.destroy();
                        }
                        updatedEmbed = createEmbed(null);
                        await i.reply({
                            content: '🗑️ Playlist vidée et bot déconnecté',
                            ephemeral: true
                        });
                        break;

                    case 'playlist':
                        if (!queue || !queue.tracks.size) {
                            return i.reply({
                                content: '❌ La playlist est vide.',
                                ephemeral: true
                            });
                        }

                        const tracks = queue.tracks.map((track, index) =>
                            `${index + 1}. [${track.title}](${track.url})`
                        );

                        const pages = [];
                        const chunkSize = 10;
                        for (let i = 0; i < tracks.length; i += chunkSize) {
                            pages.push(tracks.slice(i, i + chunkSize).join('\n'));
                        }

                        let currentPage = 0;

                        const updatePlaylistEmbed = () => {
                            return new EmbedBuilder()
                                .setColor(guildData.botColor || '#f40076')
                                .setTitle('📑 Playlist')
                                .setDescription(pages.length > 0 ? pages[currentPage] : 'Aucune piste dans la playlist.')
                                .setFooter({ text: `Page ${currentPage + 1} sur ${pages.length || 1}` });
                        };

                        const playlistRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('prev_page')
                                    .setLabel('⬅️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(currentPage === 0),
                                new ButtonBuilder()
                                    .setCustomId('next_page')
                                    .setLabel('➡️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(currentPage === pages.length - 1)
                            );

                        const reply = await i.reply({
                            embeds: [updatePlaylistEmbed()],
                            components: [playlistRow],
                            ephemeral: true
                        });

                        const playlistCollector = reply.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            time: 300000
                        });

                        playlistCollector.on('collect', async buttonInteraction => {
                            if (buttonInteraction.user.id !== interaction.user.id) {
                                return buttonInteraction.reply({
                                    content: '❌ Vous ne pouvez pas interagir avec cette commande.',
                                    ephemeral: true
                                });
                            }

                            switch (buttonInteraction.customId) {
                                case 'prev_page':
                                    currentPage = Math.max(currentPage - 1, 0);
                                    break;
                                case 'next_page':
                                    currentPage = Math.min(currentPage + 1, pages.length - 1);
                                    break;
                            }

                            await buttonInteraction.update({
                                embeds: [updatePlaylistEmbed()],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder()
                                                .setCustomId('prev_page')
                                                .setLabel('⬅️')
                                                .setStyle(ButtonStyle.Secondary)
                                                .setDisabled(currentPage === 0),
                                            new ButtonBuilder()
                                                .setCustomId('next_page')
                                                .setLabel('➡️')
                                                .setStyle(ButtonStyle.Secondary)
                                                .setDisabled(currentPage === pages.length - 1)
                                        )
                                ]
                            });
                        });
                        break;
                }

                // Update the message with the new embed after the action
                await currentMessage.edit({
                    embeds: [updatedEmbed],
                    components: [row]
                });
            });
        } catch (error) {
            console.error(error);
            interaction.editReply({
                content: '❌ Une erreur est survenue lors de la lecture de la musique.',
                ephemeral: true
            });
        }
    }
};
