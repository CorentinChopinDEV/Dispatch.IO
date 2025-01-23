import { Client, GatewayIntentBits, Collection, Partials, ActivityType, AttachmentBuilder, EmbedBuilder } from 'discord.js';
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
import { setupAPIs } from './build/music.js';

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
    partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});

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
                    console.log(`Rôles retirés pour ${member.user.tag}: ${rolesToRemove.join(', ')}`);
                }
            }
        });
    } catch (error) {
        console.error('Une erreur s\'est produite lors de la gestion des rôles :', error);
    }
}

client.once('ready', async () => {
    await antiRaid.initialize(client);
    try{
        await logSystem.initialize(client);
    }catch (err){
        console.log('Log system error:' + err)
    }
    await client.application.commands.set([]);
    const commands = [];
    await loadCommands(commandsPath, client, commands);
    await refreshCommands(client, commands);
    console.log('Bot is ready and commands are available !');
    const updatePresence = () => {
        const commandCount = client.commands.size;
        client.user.setPresence({         
            activities: [{             
                name: `${client.guilds.cache.size} serveurs | 📂: ${commandCount}`,             
                type: ActivityType.Streaming,            
                url: "https://www.twitch.tv/codanotw",
            }],         
            status: 'online'     
        });
        setTimeout(updatePresence, 30000);
    };
    setTimeout(updatePresence, 100);
    setInterval(() => protectionBOTCheck(client), 30000);
    console.log('Bot is ready and commands are available !');
    console.log('Anti-Raid actif !')
    setInterval(checkAndRemoveRoles, 10 * 1000);
    const sondageCommand = client.commands.get('sondage');
    await sondageCommand.restorePolls(client);
    client.guilds.cache.forEach(async (guild) => {
        const guildFilePath = path.join(__dirname, `./guilds-data/${guild.id}.json`);
        if (fs.existsSync(guildFilePath)) {
            const guildData = JSON.parse(fs.readFileSync(guildFilePath, 'utf8'));
            if (guildData.logs_server_channel) {
                const logChannel = guild.channels.cache.get(guildData.logs_server_channel);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(guildData.botColor || '#f40076')
                        .setTitle('Redémarrage du bot... ⚠️')
                        .setDescription('### **Le bot a été redémarré et est prêt à l\'emploi.** 🚀\n### Status: \n\`\`\`Erreur 418: Je suis une théière\`\`\`')
                        .setTimestamp();
                    try {
                        await logChannel.send({ embeds: [embed] });
                    } catch (err) {
                        console.log(`Impossible d'envoyer un message dans le salon de logs pour la guilde ${guild.id}: ${err.message}`);
                    }
                }
            }else{
                console.log('nop')
            }
        }
    });
    try {
        await setupAPIs();
        console.log('Bot prêt à lire de la musique!');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des APIs:', error);
        process.exit(1);
    }
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
    await client.application.commands.set([]);
    const commands = [];
    await loadCommands(commandsPath, client, commands);
    await refreshCommands(client, commands);
});
client.on('guildDelete', guild => {
    handleBotLeave(guild);
});
process.on('uncaughtException', (error) => {
    console.error('Une erreur non interceptée a été détectée :', error);
});
// Ceci à passer dans un autre fichier de gestion
process.on('unhandledRejection', async (reason, promise) => {
    console.error('Une promesse rejetée sans gestionnaire a été détectée :', reason);
    if (reason?.code === 10062) {
        console.warn('Erreur liée à une interaction inconnue détectée. Tentative de réexécution...');
        const interaction = reason?.interaction;
        if (interaction && interaction.commandName) {
            try {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) throw new Error('Commande introuvable.');
                await command.execute(interaction);
                console.log(`Commande "${interaction.commandName}" réexécutée avec succès.`);
            } catch (error) {
                console.error('Erreur lors de la tentative de réexécution :', error);
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
            console.warn('Impossible de réexécuter l\'interaction : données manquantes.');
        }
    } else {
        console.error('Erreur non liée à une interaction inconnue :', reason);
    }
});

client.on('error', (error) => {
    console.error('Erreur de WebSocket détectée :', error);
});
client.on('shardError', (error) => {
    console.error('Erreur de shard détectée :', error);
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
            console.error('Erreur lors du traitement de threadUpdate (fermeture de thread) :', error);
        }
    }
});
async function loadGuildData(guildPath) {
    try {
        const data = await fs.readFile(guildPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement des données de la guilde:', error);
        return {};
    }
}
const loadWhitelist = (guildPath) => {
    try {
        const data = fs.readFileSync(guildPath, 'utf-8');
        const parsedData = JSON.parse(data);
        return parsedData.whitelist || [];
    } catch (error) {
        console.error('Erreur lors du chargement de la whitelist:', error);
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