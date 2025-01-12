import { Client, GatewayIntentBits, Collection, Partials, ActivityType } from 'discord.js';
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
import suggestionReact from './src/guild/french-corp/suggestion-react.js';
import suggestion from './src/guild/french-corp/suggestion.js';
import protectionBOTCheck from './src/guild/french-corp/douanier.js';
import AntiRaidSystem from './build/anti-raid.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Client Instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.Channel]
});
const antiRaid = new AntiRaidSystem();
client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
loadCommands(commandsPath, client, commands);

// Client on Ready
client.once('ready', async () => {
    await antiRaid.initialize(client);
    await client.application.commands.set([]);
    const commands = [];
    await loadCommands(commandsPath, client, commands);
    await refreshCommands(client, commands);
    console.log('Bot is ready and commands are available !');
    const updatePresence = () => {
        client.user.setPresence({         
            activities: [{             
                name: `${client.guilds.cache.size} serveurs | 📂: /help`,             
                type: ActivityType.Streaming,            
                url: "https://www.twitch.tv/codanotw",
            }],         
            status: 'online'     
        });
        setTimeout(updatePresence, 30000);  // Met à jour la présence toutes les 30 secondes
    };
    setTimeout(updatePresence, 100);  // Met à jour la présence toutes les 30 secondes
    setInterval(() => protectionBOTCheck(client), 30000);
    console.log('Bot is ready and commands are available !');
    console.log('Anti-Raid actif !')
});

// Role Reaction
roleReactionHandler(client);

// Client on Interaction Create
client.on('interactionCreate', async interaction => {
    interactionCREATE(interaction, client, loadGuildData);
});

client.on('messageCreate', async (message) => {
    suggestion(message);
});
client.on('messageReactionAdd', async (reaction, user) => {
    suggestionReact(reaction, user);
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

// Client on Guild Create
client.on('guildCreate', async (guild) => {
    handleBotJoin(guild);
    await client.application.commands.set([]);
    const commands = [];
    await loadCommands(commandsPath, client, commands);
    await refreshCommands(client, commands);
});

// Client on Guild Delete
client.on('guildDelete', guild => {
    handleBotLeave(guild);
});

// Anti-Crash Module
process.on('uncaughtException', (error) => {
    console.error('Une erreur non interceptée a été détectée :', error);
});
process.on('unhandledRejection', async (reason, promise) => {
    console.error('Une promesse rejetée sans gestionnaire a été détectée :', reason);

    // Vérifier si l'erreur provient d'une interaction inconnue
    if (reason?.code === 10062) {

        console.warn('Erreur liée à une interaction inconnue détectée. Tentative de réexécution...');

        const interaction = reason?.interaction; // Supposons que l'objet interaction soit dans l'erreur
        if (interaction && interaction.commandName) {
            try {
                const command = interaction.client.commands.get(interaction.commandName);
                if (!command) throw new Error('Commande introuvable.');

                // Réexécuter la commande
                await command.execute(interaction);
                console.log(`Commande "${interaction.commandName}" réexécutée avec succès.`);
            } catch (error) {
                console.error('Erreur lors de la tentative de réexécution :', error);

                // Envoyer un message d'erreur
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

//Guild Member Add
client.on('guildMemberAdd', async (member) => {
    userAdd(client, member);
});

client.on('threadCreate', async (thread) => {
    const guildId = thread.guild.id;
    console.log('pass here')
    premiumPing(thread, guildId);
});

async function loadGuildData(guildPath) {
    try {
        const data = await fs.readFile(guildPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement des données de la guilde:', error);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

const loadWhitelist = (guildPath) => {
    try {
        const data = fs.readFileSync(guildPath, 'utf-8');
        const parsedData = JSON.parse(data);
        return parsedData.whitelist || []; // Retourne le tableau 'whitelist' ou un tableau vide si absent
    } catch (error) {
        console.error('Erreur lors du chargement de la whitelist:', error);
        return []; // Retourne une liste vide en cas d'erreur
    }
};

async function sendLog(title, description, color) {
    try {
        const logChannel = client.channels.cache.get('1301991104983597056');
        
        if (!logChannel) {
            console.error(`Le salon avec l'ID ${logChannelId} n'a pas été trouvé.`);
            return;
        }

        // Créer l'embed pour le log
        const logEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        // Envoyer l'embed dans le salon
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du log :', error);
    }
}

client.login(process.env.TOKEN);
