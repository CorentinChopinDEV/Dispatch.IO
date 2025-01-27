import { Client, GatewayIntentBits, Collection, Partials, ActivityType, AttachmentBuilder, EmbedBuilder, IntentsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import roleReactionHandler from './build/role-react.js';
import loadCommands from './build/load-command.js';
import handleBotJoin from './build/bot-join.js';
import handleBotLeave from './build/bot-leave.js';
import refreshCommands from './build/client-ready.js';
import dotenv from 'dotenv';
import { userAdd } from './build/userAdd.js';
import interactionCREATE from './build/interaction-create.js';
import premiumPing from './src/guild/french-corp/premium-ping.js';
import { handleInteractionEvent, handleMessageEvent } from './src/guild/french-corp/suggestion-react.js';
import suggestion from './src/guild/french-corp/suggestion.js';
import protectionBOTCheck from './src/guild/french-corp/douanier.js';
import AntiRaidSystem from './build/anti-raid.js';
import LogSystem from './build/log-system.js';
import geminiText from './build/gemini-text.js';
import premiumClose from './src/guild/french-corp/premium-end.js';
import LevelingSystem from './build/level-system.js';
import { Player } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor'
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du failover
const CHECK_INTERVAL = 5000; // 5 secondes
const FAILOVER_THRESHOLD = 30000; // 30 secondes

// Variables globales
let isActive = false;
let mainBotDowntime = 0;
let isInitialized = false;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration
    ],
    intents: new IntentsBitField(3276799),
    partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

// Initialisation des systèmes
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
const levelSystem = new LevelingSystem(client);
const queue = new Collection();
const antiRaid = new AntiRaidSystem();
const logSystem = new LogSystem();

async function checkMainBot() {
    try {
        let mainBotOnline = false;
        
        for (const guild of client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch('1326262596705189929').catch(() => null);
                
                if (member) {
                    console.log('\x1b[36mStatut du bot principal:', member?.presence?.status || 'offline', '\x1b[0m');
                    
                    if (!member.presence) {
                        mainBotOnline = false;
                        console.log('\x1b[33mAucune information de présence disponible, considéré comme hors ligne\x1b[0m');
                    } else {
                        mainBotOnline = member.presence.status !== 'offline';
                        console.log(`\x1b[36mStatut détecté: ${member.presence.status} -> Bot en ligne: ${mainBotOnline}\x1b[0m`);
                    }

                    if (mainBotOnline) {
                        console.log('\x1b[32mBot principal en ligne.\x1b[0m');
                        try {
                            const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
                            
                            await rest.put(
                                Routes.applicationCommands(client.user.id),
                                { body: [] }
                            );
                            console.log('\x1b[32mCommandes globales supprimées avec succès\x1b[0m');
                            
                            isActive = false;
                            mainBotDowntime = 0;
                            isInitialized = false;
                            
                            client.user.setPresence({
                                activities: [{
                                    name: '🔄 En attente',
                                    type: ActivityType.Watching
                                }],
                                status: 'invisible'
                            });
                            
                            console.log('\x1b[32mBot secondaire désactivé avec succès.\x1b[0m');
                            return;
                        } catch (error) {
                            console.error('\x1b[31mErreur lors de la suppression des commandes:', error, '\x1b[0m');
                        }
                    }
                }
            } catch (err) {
                console.log('\x1b[31mErreur lors de la vérification dans un serveur:', err.message, '\x1b[0m');
                continue;
            }
        }

        mainBotDowntime += CHECK_INTERVAL;
        console.log(`\x1b[33mBot principal hors ligne depuis ${mainBotDowntime}ms\x1b[0m`);
        
        if (mainBotDowntime >= FAILOVER_THRESHOLD) {
            if (!isActive) {
                console.log('\x1b[33mBot principal hors ligne depuis 30 secondes. Activation du bot secondaire.\x1b[0m');
                isActive = true;
                
                client.user.setPresence({
                    activities: [{
                        name: '⚠️ Mode Failover Actif',
                        type: ActivityType.Watching
                    }],
                    status: 'dnd'
                });
                
                if (!isInitialized) {
                    await initializeBot();
                }
            }
        }
    } catch (error) {
        console.error('\x1b[31mErreur lors de la vérification du bot principal:', error, '\x1b[0m');
    }
}

const initializeBot = async () => {
    if (isInitialized) return;
    isInitialized = true;

    try {
        console.log('\x1b[32m%s\x1b[0m', `${client.user.tag} est prêt (Mode Failover)`);

        // Initialisation du player
        client.player = new Player(client, {
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            }
        });
        await client.player.extractors.loadMulti(DefaultExtractors);

        // Initialisation des systèmes
        await antiRaid.initialize(client);
        await logSystem.initialize(client);
        console.log('\x1b[32m%s\x1b[0m', 'Systèmes d\'anti-raid et de logs activés.');

        // Enregistrement des commandes
        await loadCommands(commandsPath, client, commands);
        await refreshCommands(client, commands);
        console.log('\x1b[32m%s\x1b[0m', 'Commandes (/) enregistrées avec succès.');

        // Mise à jour de la présence
        client.user.setPresence({
            activities: [{
                name: `${client.guilds.cache.size} serveurs | 📂: ${client.commands.size}`,
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/codanotw',
            }],
            status: 'online',
        });

        // Notification de redémarrage
        client.guilds.cache.forEach(async guild => {
            const guildPath = path.resolve(`./guilds-data/${guild.id}.json`);
            if (fs.existsSync(guildPath)) {
                const guildData = JSON.parse(fs.readFileSync(guildPath, 'utf8'));
                if (guildData.logs_server_channel) {
                    const logChannel = guild.channels.cache.get(guildData.logs_server_channel);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(guildData.botColor || '#f40076')
                            .setDescription('## Système FAILOVER ACTIF 🚀\n**Le bot principal est actuellement hors ligne.**\n\nLe bot secondaire est actuellement en ligne et opérationnel.')
                            .setTimestamp();
                        try {
                            await logChannel.send({ embeds: [embed] });
                        } catch (err) {
                            console.error(`Impossible d'envoyer un message dans le salon ${logChannel.id}:`, err.message);
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error('\x1b[31mUne erreur est survenue lors de l\'initialisation :\x1b[0m', err);
        isInitialized = false; // Reset en cas d'erreur
    }
};

// Event handlers
client.once('ready', async () => {
    console.log('\x1b[32m%s\x1b[0m', `${client.user.tag} est en ligne.`);
    setInterval(checkMainBot, CHECK_INTERVAL);
});

client.on('interactionCreate', async interaction => {
    if (!isActive) {
        if (interaction.isRepliable()) {
            await interaction.reply({
                content: "⚠️ Je suis actuellement en mode veille. Le bot principal est opérationnel.",
                ephemeral: true
            });
        }
        return;
    }
    await interactionCREATE(interaction, client, loadGuildData);
});

client.on('messageCreate', async (message) => {
    if (!isActive) return;
    await suggestion(message);
    await geminiText.execute(message);
    await levelSystem.handleMessage(message);
    handleMessageEvent(message);
});

client.on('guildCreate', async (guild) => {
    if (!isActive) return;
    await handleBotJoin(guild);
});

client.on('guildDelete', guild => {
    if (!isActive) return;
    handleBotLeave(guild);
});

client.on('threadCreate', async (thread) => {
    if (!isActive) return;
    const guildId = thread.guild.id;
    premiumPing(thread, guildId);
});

client.on('threadUpdate', async (oldThread, newThread) => {
    if (!isActive) return;
    if (!oldThread.archived && newThread.archived) {
        try {
            const guildId = newThread.guild.id;
            premiumClose(newThread, guildId, client);
        } catch (error) {
            console.error('\x1b[31mErreur lors du traitement de threadUpdate (fermeture de thread) :', error);
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    if (!isActive) return;
    await userAdd(client, member);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!isActive) return;
    if (!oldState.channelId && newState.channelId) {
        levelSystem.startVoiceTimer(newState.member);
    } else if (oldState.channelId && !newState.channelId) {
        levelSystem.stopVoiceTimer(oldState.member);
    }
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('\x1b[31mUne erreur non interceptée a été détectée :', error);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('\x1b[31mUne promesse rejetée sans gestionnaire a été détectée :', reason);
    if (!isActive) return;
    
    if (reason?.code === 10062) {
        console.warn('\x1b[33mErreur liée à une interaction inconnue détectée. Tentative de réexécution...');
        const interaction = reason?.interaction;
        if (interaction && interaction.commandName) {
            try {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) throw new Error('\x1b[35mCommande introuvable.');
                await command.execute(interaction);
                console.log(`\x1b[35mCommande "${interaction.commandName}" réexécutée avec succès.`);
            } catch (error) {
                console.error('\x1b[33mErreur lors de la tentative de réexécution :', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: '❌ Une erreur est survenue et la commande n\'a pas pu être exécutée.',
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: '❌ Une erreur est survenue et la commande n\'a pas pu être exécutée.',
                        ephemeral: true,
                    });
                }
            }
        } else {
            console.warn('\x1b[31mImpossible de réexécuter l\'interaction : données manquantes.');
        }
    }
});

async function loadGuildData(guildPath) {
    try {
        const data = await fs.readFile(guildPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('\x1b[35mErreur de chargement des données de la guilde:', error);
        return {};
    }
}

client.login(process.env.TOKEN);