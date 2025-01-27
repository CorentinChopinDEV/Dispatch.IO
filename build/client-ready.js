import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { SingleBar, Presets } from 'cli-progress';
import { EmbedBuilder } from 'discord.js';
import _ from 'lodash';

/**
 * Crée une barre de progression pour la console
 */
function createProgressBar(totalCommands) {
    return new SingleBar({
        format: 'Progression : [{bar}] {percentage}% | {value}/{total} commandes',
        barCompleteChar: '█',
        barIncompleteChar: '░',
    }, Presets.shades_classic);
}

/**
 * Crée un embed de progression
 */
function createProgressEmbed(progress, total, currentCommand = '', context = '') {
    const percentage = Math.round((progress / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    
    const description = [
        '```',
        progressBar,
        `${progress}/${total} (${percentage}%)`,
        '```'
    ];

    if (currentCommand) {
        description.push(`\n📝 Commande en cours : \`${currentCommand}\``);
    }
    
    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('<a:28213ttsloading:1328488543726866553> Mise à jour des commandes')
        .setDescription(description.join('\n'))
        .setTimestamp();
}

/**
 * Met à jour l'embed de progression
 */
async function updateProgressEmbed(channel, message, progress, total, currentCommand, context) {
    const embed = createProgressEmbed(progress, total, currentCommand, context);
    await message.edit({ embeds: [embed] });
}

async function refreshGlobalCommands(client, commands) {
    const rest = new REST({ version: '10' }).setToken(client.token);
    const guildId = '1322898318233178122';
    const channelId = '1332742764487770266';
    
    try {
        // Récupération du salon
        const channel = await client.channels.fetch(channelId);
        if (!channel) throw new Error('Canal introuvable');

        // Création de l'embed initial
        const initialEmbed = createProgressEmbed(0, commands.length);
        const progressMessage = await channel.send({ embeds: [initialEmbed] });

        console.log('🔄 Début de la mise à jour des commandes...');
        
        // Vérification des prérequis
        if (!client.token) throw new Error('Token du bot manquant');
        if (!client.user?.id) throw new Error('Client Discord mal initialisé');

        // Configuration des endpoints
        const globalEndpoint = Routes.applicationCommands(client.user.id);
        const guildEndpoint = Routes.applicationGuildCommands(client.user.id, guildId);

        // Récupération des commandes existantes (global et guild)
        const [existingGlobalCommands, existingGuildCommands] = await Promise.all([
            rest.get(globalEndpoint),
            rest.get(guildEndpoint)
        ]);

        const progressBar = createProgressBar(commands.length);
        let progress = 0;

        // Traitement des commandes
        for (const command of commands) {
            // Mise à jour globale
            const existingGlobal = existingGlobalCommands.find(c => c.name === command.name);
            if (!existingGlobal || !_.isEqual(_.omit(existingGlobal, ['id', 'application_id', 'version']), command)) {
                await rest.post(globalEndpoint, { body: command });
                console.log(`✅ [GLOBAL] Commande enregistrée : ${command.name}`);
                await updateProgressEmbed(channel, progressMessage, progress, commands.length, command.name, "Global");
            } else {
                console.log(`⏭️ [GLOBAL] Commande inchangée : ${command.name}`);
            }

            progress++;
            progressBar.update(progress);
        }

        progressBar.stop();

        // Mise à jour finale de l'embed
        const finalEmbed = new EmbedBuilder()
            .setColor('#f40076')
            .setTitle('✅ Mise à jour terminée')
            .setDescription('Toutes les commandes ont été mises à jour avec succès !')
            .setTimestamp();
        
        await progressMessage.edit({ embeds: [finalEmbed] });
        
        console.log('✅ Mise à jour des commandes terminée avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour des commandes:', error);
        
        // Notification d'erreur dans Discord
        if (channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription(`Une erreur est survenue:\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();
            
            await channel.send({ embeds: [errorEmbed] });
        }
    }
}

export default refreshGlobalCommands;