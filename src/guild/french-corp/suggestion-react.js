import { EmbedBuilder } from 'discord.js';
import fs from 'fs'; // Syntaxe correcte pour importer fs.promises
import path from 'path';

async function loadGuildData(guildPath) {
    try {
        const data = await fs.readFile(guildPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement des données de la guilde:', error);
        return {}; // Retourne un objet vide en cas d'erreur
    }
}

async function suggestionReact (reaction, user) {
    const { message } = reaction;
    const guildId = message.guild.id;
    const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
    const rawData = fs.readFileSync(guildPath);
    const guildData = JSON.parse(rawData);
    const suggestion_fr = guildData.suggestion_fr;
    const suggestion_us = guildData.suggestion_us;
    const gestion_suggestion_fr = guildData.gestion_suggestion_fr;
    const gestion_suggestion_us = guildData.gestion_suggestion_us;
    if (message.channel.id === suggestion_fr) {
        if (reaction.emoji.name === '🙋') return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();
        if (user.bot) return;
        const member = message.guild.members.cache.get(user.id);
        if (!member.roles.cache.has(gestion_suggestion_fr)) {
            await user.send(`Vous n'avez pas la permission de gérer cette suggestion.`).catch(err => {
                console.error('Failed to send DM:', err);
            });
            await reaction.users.remove(user.id).catch(err => console.error('Failed to remove reaction:', err));
            return;
        }
        let newEmbed;
        if (reaction.emoji.name === '✅') {
            newEmbed = new EmbedBuilder()
                .setColor('#00FF00') // Vert
                .setTitle(`✅ - Suggestion validée par ${user.tag}`)
                .setDescription(message.embeds[0].description)
                .setFooter(message.embeds[0].footer)
                .setTimestamp();
        } else if (reaction.emoji.name === '❌') {
            newEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Rouge
                .setTitle(`❌ - Suggestion refusée par ${user.tag}`)
                .setDescription(message.embeds[0].description)
                .setTimestamp();
        } else if (reaction.emoji.name === '🗑️') {
            if (message.deletable) {
                await message.delete().catch(err => console.error('Failed to delete message:', err));
            }
            return;
        }
        await message.delete();
        await message.channel.send({ embeds: [newEmbed] });
    }
    if (message.channel.id === suggestion_us) {
        if (reaction.emoji.name === '🙋') return;
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();
        if (user.bot) return;
        const member = message.guild.members.cache.get(user.id);
        if (!member.roles.cache.has(gestion_suggestion_us)) {
            await user.send(`Vous n'avez pas la permission de gérer cette suggestion.`).catch(err => {
                console.error('Failed to send DM:', err);
            });
            await reaction.users.remove(user.id).catch(err => console.error('Failed to remove reaction:', err));
            return;
        }
        let newEmbed;
        if (reaction.emoji.name === '✅') {
            newEmbed = new EmbedBuilder()
                .setColor('#00FF00') // Vert
                .setTitle(`✅ - Suggestion validée par ${user.tag}`)
                .setDescription(message.embeds[0].description)
                .setFooter(message.embeds[0].footer)
                .setTimestamp();
        } else if (reaction.emoji.name === '❌') {
            newEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Rouge
                .setTitle(`❌ - Suggestion refusée par ${user.tag}`)
                .setDescription(message.embeds[0].description)
                .setTimestamp();
        } else if (reaction.emoji.name === '🗑️') {
            if (message.deletable) {
                await message.delete().catch(err => console.error('Failed to delete message:', err));
            }
            return;
        }
        await message.delete();
        await message.channel.send({ embeds: [newEmbed] });
    }
}
export default suggestionReact