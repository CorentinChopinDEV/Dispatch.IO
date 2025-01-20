import { VoiceConnectionStatus, getVoiceConnection, VoiceReceiver, joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus 
} from '@discordjs/voice';
import { PermissionsBitField, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import checkGuildConfig from './erreur-json.js';
import { handleButtonInteraction } from '../src/commands/admin/embed-generator.js';

const radioURLs = {
    'NRJ': 'https://scdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3',
    'Skyrock': 'http://www.skyrock.fm/stream.php/tunein16_64mp3.mp3',
    'Fun Radio': 'http://streamer-02.rtl.fr/fun-1-44-64?listen=webCwsBCggNCQgLDQUGBAcGBg',
    'FredocheFM': 'https://scdn.nrjaudio.fm/adwz2/fr/30201/mp3_128.mp3',
    'SCHMIT FM': 'https://dl.sndup.net/tpn5k/MISTER%20V%20%20SCHMIT%20FM%20%201080p.mp3'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let ticketOwners = new Map();

async function interactionCREATE(interaction, client){
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try 
        {
            const isValidCommand = (
                interaction.commandName !== 'creation-embed' &&
                !interaction.commandName.includes('config') &&
                !interaction.commandName.includes('antiraid') &&
                !interaction.commandName.includes('raidmode') &&
                interaction.commandName !== 'clear' &&
                interaction.commandName !== 'effacer-conversation' &&
                !interaction.commandName.includes('ajout-entretien') &&
                !interaction.commandName.includes('retrait-entretien') &&
                !interaction.commandName.includes('nuke') &&
                !interaction.commandName.includes('role-react-add') &&
                !interaction.commandName.includes('role-react-list') &&
                !interaction.commandName.includes('salon') &&
                !interaction.commandName.includes('image-titre') &&
                !interaction.commandName.includes('ticket-manager') &&
                !interaction.commandName.includes('help') &&
                !interaction.commandName.includes('invitation') &&
                !interaction.commandName.includes('me-renommer') &&
                !interaction.commandName.includes('ping') &&
                !interaction.commandName.includes('signalement') &&
                !interaction.commandName.includes('infractions') &&
                !interaction.commandName.includes('mp-utilisateur') && 
                !interaction.commandName.includes('say') &&
                !interaction.commandName.includes('backup-create') &&
                !interaction.commandName.includes('backup-load') &&
                !interaction.commandName.includes('backup-list') &&
                !interaction.commandName.includes('bannissements-liste') &&
                !interaction.commandName.includes('devine') &&
                !interaction.commandName.includes('quiz') &&
                !interaction.commandName.includes('sondage') &&
                !interaction.commandName.includes('pfc') &&
                !interaction.commandName.includes('add-xp') &&
                !interaction.commandName.includes('leaderboard') &&
                !interaction.commandName.includes('reset-levels') &&
                !interaction.commandName.includes('remove-xp') &&
                !interaction.commandName.includes('rank')
            );
              
              if (isValidCommand) {
                  await interaction.reply({ content: '``Traitement en cours... Veuillez patienter.`` <:supportscommands:1327778758337236992>' });
              }
              
            await command.execute(interaction);
        } catch (error) {
            
            await checkGuildConfig(interaction.guildId, interaction);
            console.error(error);
            await interaction.editReply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isModalSubmit()) {
        const command = client.commands.get('creation-embed');
        if (command && command.handleModalSubmit) {
            try {
                await command.handleModalSubmit(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: '❌ Une erreur est survenue lors de la soumission du modal.',
                    ephemeral: true
                });
            }
        } else {
            return console.log('No modal handler found for:', interaction.customId);
        }
    } else if (interaction.isButton() && interaction.customId === 'accept-rules') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const reactRoleId = guildData.rules?.reactRole;
        if (!reactRoleId) {
            return interaction.reply({
                content: "Aucun rôle n'est configuré pour valider le règlement.",
                ephemeral: true
            });
        }

        const role = interaction.guild.roles.cache.get(reactRoleId);

        if (!role) {
            return interaction.reply({
                content: "Le rôle mentionné pour la validation des règles est introuvable.",
                ephemeral: true
            });
        }

        const member = interaction.member;

        try {
            if (member.roles.cache.has(reactRoleId)) {
                // Si le membre a déjà le rôle, le retirer
                await member.roles.remove(role);
                return interaction.reply({
                    content: "Oh non, vous ne validez plus le règlement. 😔",
                    ephemeral: true
                });
            } else {
                // Sinon, attribuer le rôle
                await member.roles.add(role);
                return interaction.reply({
                    content: "Super, vous avez accepté le règlement ! 😀",
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erreur lors de la gestion du rôle :', error);
            return interaction.reply({
                content: "Une erreur est survenue en tentant de gérer le rôle.",
                ephemeral: true
            });
        }
    }else if (
        interaction.isButton() &&
        (interaction.customId === 'NRJ' ||
         interaction.customId === 'Fun Radio' ||
         interaction.customId === 'Skyrock' ||
         interaction.customId === 'FredocheFM' ||
         interaction.customId === 'Schmit FM')
    ){
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (voiceChannel) {
            if (voiceChannel.id !== guildData.radio_channel_audio) {
                return interaction.reply({ content: `Vous devez être dans le salon vocal <#${guildData.radio_channel_audio}> pour écouter la radio.`, ephemeral: true });
            }
            const existingConnection = getVoiceConnection(voiceChannel.guild.id);
            if(guildId === '1212777500565045258'){
                if (existingConnection) {
                    if (existingConnection) {
                        if (existingConnection.joinConfig.channelId !== '1326002993212031139') {
                            return interaction.reply({
                                content: `Tous les bots sont actuellement occupés. Utilisez <#1326003464039567380> pour écouter votre musique !`,
                                ephemeral: true
                            });
                        }
                    }
                }
            }else{
                if (existingConnection) {
                    return interaction.reply({
                        content: `Le bot est déjà connecté à un autre salon vocal.`,
                        ephemeral: true
                    });
                }
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            connection.on('stateChange', (oldState, newState) => {
                console.log(`État du canal vocal : ${oldState.status} → ${newState.status}`);
                
                if (newState.status === VoiceConnectionStatus.Disconnected) {
                    console.log('Déconnexion détectée, attente de 5 secondes pour confirmation...');
                    
                    setTimeout(() => {
                        if (connection.state.status === VoiceConnectionStatus.Disconnected) {
                            console.log('Toujours déconnecté après 5 secondes, arrêt de la radio.');
                            connection.destroy();
                            
                            // Arrêter le processus FFmpeg si actif
                            if (ffmpegProcess) {
                                ffmpegProcess.kill('SIGTERM');
                            }
                            
                            // Arrêter le player audio si actif
                            if (audioPlayer) {
                                audioPlayer.stop();
                                audioPlayer = null;
                            }
                        } else {
                            console.log('Reconnexion détectée, aucune action nécessaire.');
                        }
                    }, 5000); // 5000ms = 5 secondes
                }                
            });
            const player = createAudioPlayer();
            const radioURL = radioURLs[interaction.customId];
            const ffmpegProcess = spawn("ffmpeg", 
                [
                    "-re",                      
                    "-i", radioURL,             
                    "-filter:a", "volume=1",   
                    "-c:a", "pcm_s16le",       // Utiliser le codec PCM 16 bits pour WAV
                    "-b:a", "128k",            
                    "-f", "wav",                
                    "pipe:1"                    
                ], 
                { detached: true }
            );

            ffmpegProcess.on('error', (err) => {
                console.error('Erreur FFmpeg :', err);
            });

            ffmpegProcess.stderr.on('data', (data) => {
                console.log(`FFmpeg stderr: ${data}`);
            });
            const resource = createAudioResource(ffmpegProcess.stdout);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('Aucun son. Déconnexion du canal vocal.');
                connection.destroy();
            });

            player.on('error', (error) => {
                console.error('Erreur dans le joueur audio:', error.message);
            });

            await interaction.reply({ content: `Vous écoutez maintenant la radio ${interaction.customId}`, ephemeral: true });

            // Déconnexion si le membre se déconnecte du canal vocal
            const voiceStateChange = (oldState, newState) => {
                if (newState.id === member.id && !newState.channel) {
                    console.log('Le joueur a quitté le canal vocal. Déconnexion du bot.');
                    connection.destroy();
                    client.off('voiceStateUpdate', voiceStateChange);
                }
            };

            client.on('voiceStateUpdate', voiceStateChange);
        } else {
            interaction.reply({ content: 'Vous devez être connecté à un canal vocal pour utiliser cette commande.', ephemeral: true });
        }

        setTimeout(async () => {
            await interaction.deleteReply();
        }, 10000);
    } if (interaction.customId === 'openTicket') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const ticketCategoryId = guildData.ticket_category;
        const user = interaction.user;
        const existingTicket = interaction.guild.channels.cache.find(
            (channel) => channel.name === `ticket-${user.username.toLowerCase()}` && channel.type === ChannelType.GuildText
        );
        
        if (existingTicket) {
            return interaction.reply({
                content: '**Vous avez déjà un ticket ouvert.** ⚠️',
                ephemeral: true,
            });
        }

        const ticketChannelName = `ticket-${user.username.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        let ticketChannel;

        if(guildId === '1212777500565045258'){
            ticketChannel = await interaction.guild.channels.create({
                name: ticketChannelName,
                type: 0,
                parent: ticketCategoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Autoriser à voir le salon
                            PermissionsBitField.Flags.SendMessages, // Autoriser à écrire dans le salon
                            PermissionsBitField.Flags.ReadMessageHistory, // Autoriser à consulter l'historique des messages
                        ],
                    },
                    {
                        id: guildData.admin_role,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Autoriser à voir le salon
                            PermissionsBitField.Flags.SendMessages, // Autoriser à écrire dans le salon
                            PermissionsBitField.Flags.ReadMessageHistory, // Autoriser à consulter l'historique des messages
                        ],
                    }
                ],
            });
        }else{
            ticketChannel = await interaction.guild.channels.create({
                name: ticketChannelName,
                type: 0,
                parent: ticketCategoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Autoriser à voir le salon
                            PermissionsBitField.Flags.SendMessages, // Autoriser à écrire dans le salon
                            PermissionsBitField.Flags.ReadMessageHistory, // Autoriser à consulter l'historique des messages
                        ],
                    },
                    {
                        id: guildData.admin_role,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Autoriser à voir le salon
                            PermissionsBitField.Flags.SendMessages, // Autoriser à écrire dans le salon
                            PermissionsBitField.Flags.ReadMessageHistory, // Autoriser à consulter l'historique des messages
                        ],
                    },
                    {
                        id: guildData.mod_role,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel, // Autoriser à voir le salon
                            PermissionsBitField.Flags.SendMessages, // Autoriser à écrire dans le salon
                            PermissionsBitField.Flags.ReadMessageHistory, // Autoriser à consulter l'historique des messages
                        ],
                    }
                ],
            });
        }

        ticketOwners.set(ticketChannel.id, user.id);

        const ticketEmbed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Demande d\'assistance 📨')
            .setDescription(`**Bienvenue dans votre ticket,** ${user}. \n *Un modérateur vous répondra dès qu'il sera disponible !* \n \n **Mention:** <@&${guildData.admin_role}>`)
            .setFooter({ text: 'Besoin d\'assistance - Système de Ticket' })
            .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGp2MXhxbTh5MmhhaWZjZ2JoZTJ1b3ppcW5zaDg5bjA5Y3BsNXFscyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VoysKcErpw9oIpI3Wu/giphy.gif')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('closeTicket')
                .setLabel('Fermer le ticket')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('save-transcript')
                .setLabel('Sauvegarder')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('deleteTicket')
                .setLabel('Supprimer le ticket')
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
            embeds: [ticketEmbed],
            components: [row],
        });

        await interaction.reply({
            content: `**Votre ticket a été créé : ${ticketChannel}** 🆗`,
            ephemeral: true,
        });
    }

    if (interaction.customId === 'closeTicket') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const ticketOwnerId = ticketOwners.get(interaction.channel.id);

        if (!ticketOwnerId) {
            return await interaction.reply({
                content: '# **Impossible de trouver l\'utilisateur ayant ouvert ce ticket.** ⚠️',
                ephemeral: true,
            });
        }
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Ticket Fermé')
            .setDescription('Le ticket a été fermé ! A bientôt.')
            .setTimestamp()
            .setFooter({ text: 'Parker Dispatch' });

        const reopenRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('reopenTicket')
                .setLabel('Réouvrir le ticket')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({
            embeds: [embed],
            components: [reopenRow],
        });
        await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {  // Utilisez l'ID de l'utilisateur qui a ouvert le ticket
            [PermissionsBitField.Flags.SendMessages]: false,  // Refuser l'accès à l'utilisateur pour envoyer des messages
        });
        
        // Attendre 1 seconde
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
            [PermissionsBitField.Flags.ViewChannel]: false,
        });
    }

    if (interaction.customId === 'save-transcript') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const ticketOwnerId = ticketOwners.get(interaction.channel.id);
    
        // Étape 1 : Récupérer tous les messages du salon
        let messages = [];
        let lastId;
        while (true) {
            const fetchedMessages = await interaction.channel.messages.fetch({
                limit: 100,
                before: lastId,
            });
            if (fetchedMessages.size === 0) break;
            messages.push(...fetchedMessages.values());
            lastId = fetchedMessages.last()?.id;
        }
        messages = messages.reverse(); // Mettre dans l'ordre chronologique
    
        // Étape 2 : Générer la transcription
        let transcript = `Transcript de #${interaction.channel.name}\n\n`;
        for (const message of messages) {
            if (message.author.bot) continue;
            const timestamp = message.createdAt.toLocaleString('fr-FR');
            transcript += `[${timestamp}] ${message.author.tag}: ${message.content}\n`;
            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    transcript += `  [Fichier attaché : ${attachment.url}]\n`;
                }
            }
        }
        // Étape 3 : Sauvegarder dans un fichier `.txt`
        const filePath = `./transcripts/${interaction.channel.id}.txt`;
        fs.writeFileSync(filePath, transcript);
    
        // Étape 4 : Envoyer le fichier dans un salon prédéfini
        const transcriptChannelId = interaction.channel.id // Assurez-vous que cette valeur existe dans le JSON
        const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
    
        if (!transcriptChannel) {
            return await interaction.reply({
                content: '# **Impossible de trouver le salon pour sauvegarder le transcript.** ⚠️',
                ephemeral: true,
            });
        }
    
        await transcriptChannel.send({
            content: `# Transcript du ticket **#${interaction.channel.name}**.`,
            files: [filePath],
        });
    
        // Supprimer le fichier après l'envoi
        fs.unlinkSync(filePath);
    
        if(ticketOwnerId){
            await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
                [PermissionsBitField.Flags.SendMessages]: false,
            });
        
            await new Promise(resolve => setTimeout(resolve, 1000));
        
            await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
                [PermissionsBitField.Flags.ViewChannel]: false,
            });
        }
    }    
    if (interaction.customId === 'reopenTicket') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        const ticketOwnerId = ticketOwners.get(interaction.channel.id);

        await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
            [PermissionsBitField.Flags.ViewChannel]: true,
        });
        await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
            [PermissionsBitField.Flags.SendMessages]: true,
        });

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Ticket Réouvert')
            .setDescription('Le ticket a été réouvert.')
            .setTimestamp()
            .setFooter({ text: 'Parker Dispatch' });

        await interaction.channel.send({
            embeds: [embed]
        });
    }

    if (interaction.customId === 'deleteTicket') {
        const guildId = interaction.guild.id;
        const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
        const rawData = fs.readFileSync(guildPath);
        const guildData = JSON.parse(rawData);
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: '**Vous n\'avez pas la permission de supprimer ce ticket.** ⛔',
                ephemeral: true,
            });
        }

        await interaction.reply({
            content: '**Le ticket va être supprimé dans 5 secondes...** 🆗',
            ephemeral: true,
        });

        setTimeout(() => {
            interaction.channel.delete();
            ticketOwners.delete(interaction.channel.id);
        }, 5000);
    } else if (interaction.customId === 'editEmbed' || interaction.customId === 'sendEmbed') {
        if(!interaction.isButton()) return;
        await handleButtonInteraction(interaction);
    }
} 

export default interactionCREATE;