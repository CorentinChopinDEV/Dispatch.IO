const { 
    createAudioPlayer, 
    createAudioResource, 
    joinVoiceChannel, 
    getVoiceConnection, 
    VoiceConnectionStatus 
} = require('@discordjs/voice');
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const play = require('play-dl');

module.exports = {
    data: {
        name: 'play',
        description: 'Joue une musique à partir d\'une recherche ou d\'un lien',
        options: [
            {
                name: 'query',
                type: 3, // Type STRING
                description: 'Le titre ou le lien de la musique',
                required: true
            }
        ]
    },
    async execute(interaction) {
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
            // Vérification de la connexion existante
            const existingConnection = getVoiceConnection(interaction.guild.id);
            if (existingConnection) {
                return interaction.editReply('❌ Le bot est déjà connecté à un salon vocal.');
            }

            // Recherche de la musique
            const searchResult = await play.search(query, { limit: 1 });
            if (!searchResult.length) {
                return interaction.editReply('❌ Aucun résultat trouvé pour votre recherche.');
            }

            const song = searchResult[0];

            // Connexion au salon vocal
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false // Assurez-vous que le bot n'est pas en sourdine
            });

            // Gestion des états de la connexion
            connection.on(VoiceConnectionStatus.Disconnected, () => connection.destroy());

            // Création du player et du stream
            const player = createAudioPlayer();
            connection.subscribe(player);

            try{
                const stream = await play.stream(song.url, { quality: 2 });
                const resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                    inlineVolume: true
                });
                resource.volume.setVolume(1); // Réglez le volume à 100%

                player.play(resource);
            }catch(err){
                console.log(err)
            }

            // Création de l'embed
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎵 Musique en cours')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: '⏱️ Durée', value: song.durationRaw || '?', inline: true },
                    { name: '👤 Demandé par', value: interaction.user.username, inline: true }
                )
                .setThumbnail(song.thumbnails[0]?.url)
                .setTimestamp();

            // Création des boutons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pause')
                        .setLabel('Pause')
                        .setEmoji('⏸️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('resume')
                        .setLabel('Reprendre')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('stop')
                        .setLabel('Stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            // Gestion des événements du player
            player.on('stateChange', (oldState, newState) => {
                if (newState.status === 'idle') {
                    connection.destroy();
                    if (message.editable) {
                        const endedEmbed = EmbedBuilder.from(embed)
                            .setTitle('🎵 Lecture terminée')
                            .setColor('#ff0000');
                        message.edit({ embeds: [endedEmbed], components: [] });
                    }
                }
            });

            player.on('error', error => {
                console.error('Erreur du player:', error);
                connection.destroy();
                if (message.editable) {
                    interaction.editReply({
                        content: '❌ Une erreur est survenue pendant la lecture!',
                        embeds: [],
                        components: []
                    });
                }
            });

            // Stockage des données pour les boutons
            if (!interaction.client.players) {
                interaction.client.players = new Map();
            }

            interaction.client.players.set(interaction.guild.id, {
                connection,
                player,
                message
            });

        } catch (error) {
            console.error('Erreur:', error);
            return interaction.editReply('❌ Une erreur est survenue lors de la lecture!');
        }
    }
};
