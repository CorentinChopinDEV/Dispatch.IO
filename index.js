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
import  interactionCREATE  from './build/interaction-create.js';
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

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
client.player = new Player (client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
}})
await client.player.extractors.loadMulti(DefaultExtractors);
const antiRaid = new AntiRaidSystem();
const logSystem = new LogSystem();
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
const levelSystem = new LevelingSystem(client);
const queue = new Collection();
loadCommands(commandsPath, client, commands);

//Ceci à passer dans un autre fichier
const TARGET_GUILD_ID = '1212777500565045258'; //LSDPFR French Corporation
const ROLE_A = '1213149429859618926'; // Membres
const ROLE_B = '1327822325323927552' // Violation pseudo
const ROLE_C = '1225029685264519219'; // Règlement valider
async function checkAndRemoveRoles() {
    const targetGuild = client.guilds.cache.get(TARGET_GUILD_ID);
    if (!targetGuild) {
        return;
    }
    try {
        await targetGuild.members.fetch();
        targetGuild.members.cache.forEach(async (member) => {
            // Vérifie si le membre a les rôles A et B
            if (member.roles.cache.has(ROLE_A) && member.roles.cache.has(ROLE_B)) {
                const rolesToRemove = [ROLE_A, ROLE_C].filter(roleId =>
                    member.roles.cache.has(roleId)
                );
                if (rolesToRemove.length > 0) {
                    await member.roles.remove(rolesToRemove);
                    console.log(`\x1b[32mRôles retirés pour ${member.user.tag}: ${rolesToRemove.join(', ')}`);
                }
            }
        });
    } catch (error) {
        console.error('\x1b[33mUne erreur s\'est produite lors de la gestion des rôles :', error);
    }
}

client.once('ready', async () => {
    console.log('\x1b[32m%s\x1b[0m', `${client.user.tag} est prêt à fonctionner 🚀`);

    try {
        // Initialisation des systèmes
        await antiRaid.initialize(client);
        await logSystem.initialize(client);
        console.log('\x1b[32m%s\x1b[0m', 'Systèmes d\'anti-raid et de logs activés.');
            const commands = [];
            await loadCommands(commandsPath, client, commands);
            await refreshCommands(client, commands);
        
        console.log('\x1b[32m%s\x1b[0m', 'Commandes (/) enregistrées avec succès.');

        // Surveillance Anti-Raid
        setInterval(() => protectionBOTCheck(client), 30000);

        // Gestion des rôles
        setInterval(checkAndRemoveRoles, 10000);

        // // Mise à jour de la présence
        const updatePresence = () => {
            client.user.setPresence({
                activities: [{
                    name: `${client.guilds.cache.size} serveurs | 📂: ${client.commands.size}`,
                    type: ActivityType.Streaming,
                    url: 'https://www.twitch.tv/codanotw',
                }],
                status: 'online',
            });
        };
        setInterval(updatePresence, 30000);
        updatePresence();
    } catch (err) {
        console.error('\x1b[31mUne erreur est survenue lors de l\'initialisation :\x1b[0m', err);
    }

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
                        .setDescription('## Le bot a été redémarré 🚀')
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
});

roleReactionHandler(client);
// Client on Interaction Create
client.on('interactionCreate', async interaction => {
    interactionCREATE(interaction, client, loadGuildData);
});
client.on('messageCreate', async (message) => {
    suggestion(message);
});
client.on('messageCreate', (message) => {
    const guildId = message.guild.id;
    const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
    const rawData = fs.readFileSync(guildPath);
    const guildData = JSON.parse(rawData);
    if (message.channel.id === guildData.musique_channel) {
        setTimeout(() => {
        message.delete().catch(console.error);
        }, 10000);
    }
});
client.on('guildCreate', async (guild) => {
    handleBotJoin(guild);
});
client.on('guildDelete', guild => {
    handleBotLeave(guild);
});
process.on('uncaughtException', (error) => {
    console.error('\x1b[31mUne erreur non interceptée a été détectée :', error);
});
// Ceci à passer dans un autre fichier de gestion
process.on('unhandledRejection', async (reason, promise) => {
    console.error('\x1b[31mUne promesse rejetée sans gestionnaire a été détectée :', reason);
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
    } else {
        console.error('\x1b[31mErreur non liée à une interaction inconnue :', reason);
    }
});

client.on('error', (error) => {
    console.error('\x1b[31mErreur de WebSocket détectée :', error);
});
client.on('shardError', (error) => {
    console.error('\x1b[31mErreur de shard détectée :', error);
});
client.on('guildMemberAdd', async (member) => {
    userAdd(client, member);
});
client.on('threadCreate', async (thread) => {
    const guildId = thread.guild.id;
    premiumPing(thread, guildId);
});
client.on('threadUpdate', async (oldThread, newThread) => {
    if (!oldThread.archived && newThread.archived) {
        try {
            const guildId = newThread.guild.id;
            premiumClose(newThread, guildId, client);
        } catch (error) {
            console.error('\x1b[31mErreur lors du traitement de threadUpdate (fermeture de thread) :', error);
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
const loadWhitelist = (guildPath) => {
    try {
        const data = fs.readFileSync(guildPath, 'utf-8');
        const parsedData = JSON.parse(data);
        return parsedData.whitelist || [];
    } catch (error) {
        console.error('\x1b[35mErreur lors du chargement de la whitelist:', error);
        return [];
    }
};
async function sendLog(title, description, color) {
    try {
        const logChannel = client.channels.cache.get('1301991104983597056');
        
        if (!logChannel) {
            console.error(`Le salon avec l'ID ${logChannelId} n'a pas été trouvé.`);
            return;
        }
        const logEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du log :', error);
    }
}
client.on('messageCreate', async (message) => {
    try {
        await geminiText.execute(message);
    } catch (error) {
        console.error('Erreur lors du traitement du message:', error);
    }
});
client.on('messageCreate', handleMessageEvent);
client.on('interactionCreate', handleInteractionEvent);
client.on('messageCreate', async (message) => {
    await levelSystem.handleMessage(message);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!oldState.channelId && newState.channelId) {
        levelSystem.startVoiceTimer(newState.member);
    } else if (oldState.channelId && !newState.channelId) {
        levelSystem.stopVoiceTimer(oldState.member);
    }
});
client.login(process.env.TOKEN);