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

async function suggestion (message) {
    if (message.author.bot) return;
    const guildId = message.guild.id;
    const guildPath = path.resolve(`./guilds-data/${guildId}.json`);
    const rawData = fs.readFileSync(guildPath);
    const guildData = JSON.parse(rawData);
    let lastEmbedTime = 0;
    if(guildId === '1212777500565045258'){
        const suggestion_film = '1325453657239719957';
        if(message.channel.id === suggestion_film && !message.author.bot){
            try {
                // Créer l'embed avec EmbedBuilder
                const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                    .setTitle('Proposition de film 🎞️')
                    .setDescription(message.content)
                    .setFooter({
                        text: message.author.tag,  // Le nom de l'utilisateur
                        iconURL: message.author.avatarURL(),  // L'icône de l'utilisateur
                    })
                    .setTimestamp();
            
                // Envoyer l'embed dans le même salon
                const embedMessage = await message.channel.send({ embeds: [embed] });
                await embedMessage.react('🟢');
                await embedMessage.react('🔴');
                await message.delete();
            } catch (error) {
                console.error('Erreur lors de la gestion du message :', error);
            }
        }
        const suggestion_fr = guildData.suggestion_fr;
        if (message.channel.id === suggestion_fr && !message.author.bot) {
            const linkRegex = /(https?:\/\/[^\s]+)/g;
            if (linkRegex.test(message.content) && !message.author.bot) {
                await message.delete();
                await message.author.send(`Les liens ne sont pas autorisés dans ce canal. Votre message a été supprimé.`).catch(err => {
                    console.error('Impossible d\'envoyer le DM:', err);
                });
                return;
            }
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`Suggestion pour le pack FR`)
                .setDescription(message.content)
                .setFooter({ text: `Suggestion de ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();
            message.delete();
            const suggestionMessage = await message.channel.send({ embeds: [embed] });
            suggestionMessage.react('🙋');
            await suggestionMessage.react('✅');
            await suggestionMessage.react('❌');
            await suggestionMessage.react('🗑️');
        }
        const suggestion_us = guildData.suggestion_us;
        if (message.channel.id === suggestion_us && !message.author.bot) {
            const linkRegex = /(https?:\/\/[^\s]+)/g;
            if (linkRegex.test(message.content) && !message.author.bot) {
                await message.delete();
                await message.author.send(`Les liens ne sont pas autorisés dans ce canal. Votre message a été supprimé.`).catch(err => {
                    console.error('Impossible d\'envoyer le DM:', err);
                });
                return;
            }
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`Suggestion pour le pack US`)
                .setDescription(message.content)
                .setFooter({ text: `Suggestion de ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();
            message.delete();
            const suggestionMessage = await message.channel.send({ embeds: [embed] });
            suggestionMessage.react('🙋');
            await suggestionMessage.react('✅');
            await suggestionMessage.react('❌');
            await suggestionMessage.react('🗑️');
       }
        const regex = /\bpack(s)?\b/i;
        if (regex.test(message.content)) {
            // Vérification du rôle
            const excludedRoleId = [guildData.admin_role, guildData.dev_role, guildData.mod_role, '1213149235965595688'];
            if (excludedRoleId.some(roleId => message.member.roles.cache.has(roleId))) {
                return;  // Ne rien faire si le membre a un rôle exclus
            }

            // Vérification du temps d'attente avant d'envoyer un nouvel embed
            const currentTime = Date.now();
            if (currentTime - lastEmbedTime < 10 * 60 * 1000) {
                return;
            }

            // Création et envoi de l'embed
            const embed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle(`👮 Informations concernant les packs:`)
                .setFooter({ text: 'LSPDFR French Corporation', iconURL: 'https://cdn.discordapp.com/attachments/1294470373903175743/1294470447714533397/profile_photo-190x190.png' })
                .setDescription(`
                    **\nBonjour ${message.author},**\n
                    *Vous êtes à la recherche des packs ?*
                    **Les packs suivants ne sont pas disponibles :**
                    \`\`- Pack US (États-Unis)\`\`\n\`\`- Pack FR (France)\`\`

                    **Nous n'avons pas plus d'informations concernant la date de mise en ligne !**
                    *En vous remerciant,*
                    *L'administration de ce serveur !*
                `)
                .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2V0OHJyZjNscTBoNHk0ZG82OGxzeHkyNTNuNGhmbnZ1bWJ1dHVmdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/lKXEBR8m1jWso/giphy.gif')
                .setTimestamp();
                message.channel.send({ embeds: [embed] });
                lastEmbedTime = currentTime;
        }
    }
}
export default suggestion