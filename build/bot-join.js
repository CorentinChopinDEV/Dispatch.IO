const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

async function handleBotJoin(guild, client) {
    if (guild.client && guild.client.user && guild.client.user.bot) {
        const guildId = guild.id;
        const ownerId = guild.ownerId;

        // Définir le chemin et les données par défaut pour le JSON
        const filePath = path.join(__dirname, `../guilds-data/${guildId}.json`);
        const defaultData = {
            guildId: guildId,
            ownerId: ownerId,
            joinedAt: Date.now(),
            serveurCount: guild.client.guilds.cache.size,
            whitelist: `"${ownerId}"`,
            antiRaid: 'Actif'
        };

        // Vérifier si le répertoire existe, sinon le créer
        if (!fs.existsSync(path.join(__dirname, '../guilds-data'))) {
            fs.mkdirSync(path.join(__dirname, '../guilds-data'), { recursive: true });
        }

        // Sauvegarder les données dans le fichier JSON
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
        let logoURL = 'https://i.ibb.co/TcdznPc/IO-2.png';
        let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
        // Créer un embed de présentation
        const embed = new EmbedBuilder()
            .setColor('#f40076')
            .setTitle('🤖 Bienvenue à votre nouveau bot Discord !')
            .setDescription(
                `**Un nouveau compagnon vient d'arriver sur le serveur !** 🎉\n\n`
                + `Explorez un ensemble complet de fonctionnalités pour une gestion optimale de votre communauté. `
                + `Configurez et utilisez le bot avec facilité grâce à ses commandes intuitives !`
            )
            .addFields(
                {
                    name: '👤 Propriétaire du serveur',
                    value: `<@${ownerId}>`,
                    inline: false
                },
                {
                    name: '🆕 Commencez dès maintenant',
                    value:
                        `• Configurez le bot avec \`/config\`.\n`
                        + `• Essayez \`/help\` pour une liste des commandes.\n`
                        + `• Invitez vos amis avec \`/invitation\`.`,
                    inline: false
                }
            )
            .setThumbnail(logoURL)
            .setImage(bannerURL)
            .setFooter({ text: 'Votre bot, vos règles. Configurez-le pour qu\'il vous ressemble !' });
        const defaultChannel = guild.channels.cache.find(channel => 
            channel.type === 0 && channel.permissionsFor(guild.client.user).has('SendMessages')
        );

        if (defaultChannel) {
            await defaultChannel.send({ embeds: [embed] });
        }
    }else{
        console.log('Error');
    }
}

module.exports = handleBotJoin;