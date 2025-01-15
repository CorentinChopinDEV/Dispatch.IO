import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);;
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
export default (client) => {
    client.on('messageReactionAdd', async (reaction, user) => {
        if (user.bot) return;
        const guildId = reaction.message.guild.id;
        const filePath = path.join(__dirname, '../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        let roleReactions;
        try {
            const data = fs.readFileSync(`./guilds-data/${guildId}.json`);
            roleReactions = JSON.parse(data).roleReactions;
        } catch (error) {
            console.error('Erreur de lecture du fichier JSON:', error);
            return;
        }
        let reactionConfig = null;
        if(roleReactions){
            reactionConfig = roleReactions.find(config =>
                config.emoji === reaction.emoji.name &&
                config.messageId === reaction.message.id &&
                config.channelId === reaction.message.channel.id
            );
        }else{
            return console.log('N\'est pas un rôle react !');
        }
        if (!reactionConfig) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            if (!member) return;

            const role = reaction.message.guild.roles.cache.get(reactionConfig.roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Rôle ${role.name} ajouté à ${user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('Rôle ajouté 🚀')
                    .setDescription(`Le rôle **${role.name}** a été ajouté avec succès !`)
                    .setTimestamp();

                // Envoi de l'embed en message privé (DM)
                const dmChannel = await user.createDM();
                await dmChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du rôle:', error);
        }
    });

    client.on('messageReactionRemove', async (reaction, user) => {
        if (user.bot) return;
        const guildId = reaction.message.guild.id;
        const filePath = path.join(__dirname, '../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        let roleReactions;
        try {
            const data = fs.readFileSync(`./guilds-data/${guildId}.json`);
            roleReactions = JSON.parse(data).roleReactions;
        } catch (error) {
            console.error('Erreur de lecture du fichier JSON:', error);
            return;
        }
        let reactionConfig = null;
        if(roleReactions){
            reactionConfig = roleReactions.find(config =>
                config.emoji === reaction.emoji.name &&
                config.messageId === reaction.message.id &&
                config.channelId === reaction.message.channel.id
            );
        }else{
            return console.log('N\'est pas un rôle react !');
        }

        if (!reactionConfig) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            if (!member) return;

            const role = reaction.message.guild.roles.cache.get(reactionConfig.roleId);
            if (role) {
                await member.roles.remove(role);
                console.log(`Rôle ${role.name} retiré à ${user.tag}`);

                const embed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('Rôle retiré 🚀')
                    .setDescription(`le rôle **${role.name}** a été retiré avec succès !`)
                    .setTimestamp();

                // Envoi de l'embed en message privé (DM)
                const dmChannel = await user.createDM();
                await dmChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Erreur lors du retrait du rôle:', error);
        }
    });
};
