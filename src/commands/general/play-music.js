const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { SpotifyExtractor } = require('@discord-player/extractor');
const { QueryType } = require('discord-player');
const path = require('path');
const fs = require('fs');

// Fonction pour charger les données de la guilde
function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        }
        console.log(`Le fichier pour la guilde ${guildPath} n'existe pas.`);
        return {};
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde:', err);
        return {};
    }
}

// Fonction pour créer l'embed de la musique en cours
function createMusicEmbed(track, guildData, interaction, isPaused = false, isLooping = false) {
    if (!track) return null;

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
            { name: '🎚️ Crédit', value: '**Dispatch.IO | 2025**', inline: false }
        )
        .setThumbnail(track.thumbnail)
        .setTimestamp();
}

// Fonction pour créer les boutons de contrôle
function createControlButtons() {
    return new ActionRowBuilder()
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
}

// Fonction pour créer l'embed de la playlist
function createPlaylistEmbed(tracks, currentPage, totalPages, guildData) {
    const tracksOnPage = tracks.slice(currentPage * 10, (currentPage + 1) * 10)
        .map((track, index) => `${currentPage * 10 + index + 1}. [${track.title}](${track.url})`);

    return new EmbedBuilder()
        .setColor(guildData.botColor || '#f40076')
        .setTitle('📑 Playlist')
        .setDescription(tracksOnPage.join('\n'))
        .setFooter({ text: `Page ${currentPage + 1} sur ${totalPages}` });
}

// Fonction pour déterminer le type de recherche
function getSearchEngine(query) {
    if (query.includes('spotify.com/track/')) return QueryType.SPOTIFY_TRACK;
    if (query.includes('spotify.com/playlist/')) return QueryType.SPOTIFY_PLAYLIST;
    if (query.includes('spotify.com/album/')) return QueryType.SPOTIFY_ALBUM;
    return QueryType.AUTO;
}

module.exports = {
    data: {
        name: 'play',
        description: 'Joue une musique ou une playlist depuis YouTube, Spotify ou SoundCloud',
        options: [{
            name: 'query',
            type: 3,
            description: 'Le titre, lien ou playlist à jouer',
            required: true
        }]
    },
    async execute(interaction) {
        // Initialisation
        const client = this.client;
        client.player.extractors.register(SpotifyExtractor);

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        // Vérification du salon vocal
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Vous devez être dans un salon vocal pour utiliser cette commande.',
                ephemeral: true
            });
        }

        await interaction.deferReply();
        const query = interaction.options.getString('query');

        try {
            const queue = client.player.nodes.get(interaction.guildId);
            const searchEngine = getSearchEngine(query);
            const searchOptions = {
                requestedBy: interaction.user,
                searchEngine: searchEngine
            };

            // Gestion de l'ajout à la file d'attente
            if (queue?.isPlaying()) {
                const result = await client.player.search(query, searchOptions);

                if (!result.tracks.length) {
                    return interaction.editReply('❌ Aucun résultat trouvé !');
                }

                queue.addTrack(result.tracks);

                const embed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('🎵 Ajouté à la playlist')
                    .setDescription(result.tracks.length > 1
                        ? `**${result.tracks.length} pistes** ajoutées à la playlist`
                        : `**[${result.tracks[0].title}](${result.tracks[0].url})**`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            // Lecture de la première piste
            const { track } = await client.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: interaction,
                    leaveOnEmpty: false,
                    leaveOnEnd: true,
                    leaveOnStop: true,
                    volume: 50,
                    bufferingTimeout: 15000,
                    smoothVolume: true
                },
                ...searchOptions
            });

            const controlButtons = createControlButtons();
            let currentMessage = await interaction.editReply({
                embeds: [createMusicEmbed(track, guildData, interaction)],
                components: [controlButtons]
            });

            // Gestion des événements du lecteur
            client.player.events.on('playerStart', (queue, track) => {
                if (queue.metadata.channelId === interaction.channelId) {
                    currentMessage.edit({
                        embeds: [createMusicEmbed(track, guildData, interaction, queue.node.isPaused(), queue.repeatMode === 1)],
                        components: [controlButtons]
                    }).catch(console.error);
                }
            });

            client.player.events.on('emptyQueue', (queue) => {
                if (queue.metadata.channelId === interaction.channelId) {
                    const connection = getVoiceConnection(interaction.guild.id);
                    if (connection) {
                        setTimeout(() => connection.destroy(), 1000);
                    }
                    currentMessage.edit({
                        embeds: [createMusicEmbed(null, guildData, interaction)],
                        components: []
                    }).catch(console.error);
                }
            });

            // Collecteur pour les boutons
            const collector = currentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 3600000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '❌ Seule la personne ayant lancé la musique peut utiliser ces boutons.',
                        ephemeral: true
                    });
                }

                const queue = client.player.nodes.get(interaction.guildId);
                if (!queue && i.customId !== 'clear') {
                    return i.reply({
                        content: '❌ Aucune musique en cours de lecture.',
                        ephemeral: true
                    });
                }

                switch (i.customId) {
                    case 'pause':
                        queue.node.setPaused(!queue.node.isPaused());
                        await i.reply({
                            content: queue.node.isPaused() ? '⏸️ Pause' : '▶️ Lecture',
                            ephemeral: true
                        });
                        break;

                    case 'loop':
                        queue.setRepeatMode(queue.repeatMode === 0 ? 1 : 0);
                        await i.reply({
                            content: `🔁 Boucle ${queue.repeatMode === 0 ? 'désactivée' : 'activée'}`,
                            ephemeral: true
                        });
                        break;

                    case 'skip':
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
                        await i.reply({
                            content: '🗑️ Playlist vidée et bot déconnecté',
                            ephemeral: true
                        });
                        break;

                    case 'playlist':
                        if (!queue?.tracks.size) {
                            return i.reply({
                                content: '❌ La playlist est vide.',
                                ephemeral: true
                            });
                        }

                        let currentPage = 0;
                        const tracksArray = Array.from(queue.tracks);
                        const totalPages = Math.ceil(tracksArray.length / 10);

                        const playlistButtons = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('prev_page')
                                    .setLabel('⬅️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(true),
                                new ButtonBuilder()
                                    .setCustomId('next_page')
                                    .setLabel('➡️')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setDisabled(totalPages <= 1)
                            );

                        const playlistMessage = await i.reply({
                            embeds: [createPlaylistEmbed(tracksArray, currentPage, totalPages, guildData)],
                            components: [playlistButtons],
                            ephemeral: true
                        });

                        const playlistCollector = playlistMessage.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            time: 300000
                        });

                        playlistCollector.on('collect', async (buttonInteraction) => {
                            if (buttonInteraction.user.id !== interaction.user.id) {
                                return buttonInteraction.reply({
                                    content: '❌ Vous ne pouvez pas interagir avec cette commande.',
                                    ephemeral: true
                                });
                            }

                            if (buttonInteraction.customId === 'prev_page') {
                                currentPage = Math.max(0, currentPage - 1);
                            } else if (buttonInteraction.customId === 'next_page') {
                                currentPage = Math.min(totalPages - 1, currentPage + 1);
                            }

                            const updatedButtons = new ActionRowBuilder()
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
                                        .setDisabled(currentPage === totalPages - 1)
                                );

                            await buttonInteraction.update({
                                embeds: [createPlaylistEmbed(tracksArray, currentPage, totalPages, guildData)],
                                components: [updatedButtons]
                            });
                        });
                        break;
                }

                if (queue?.currentTrack) {
                    await currentMessage.edit({
                        embeds: [createMusicEmbed(queue.currentTrack, guildData, interaction, queue.node.isPaused(), queue.repeatMode === 1)],
                        components: [controlButtons]
                    });
                }
            });

        } catch (error) {
            console.error(error);
            return interaction.editReply({
                content: '❌ Une erreur est survenue lors de la lecture de la musique.',
                ephemeral: true
            });
        }
    }
};