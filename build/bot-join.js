const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

async function handleBotJoin(guild) {
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
            antiRaid: 'Actif',
            welcomeIMG: 'https://i.ibb.co/gJk80Sq/image-base.png'
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

        // Attendre que les salons soient chargés avant d'envoyer l'embed
        await guild.channels.fetch(); // Ceci s'assure que tous les salons sont récupérés

        const defaultChannel = guild.channels.cache.find(channel => 
            channel.type === 0 && channel.permissionsFor(guild.client.user).has('SendMessages')
        );

        if (defaultChannel) {
            await defaultChannel.send({ embeds: [embed] });
        }

        // const dispatchIOSupport = '1332089005876969524';  // ID du salon où envoyer l'embed
        // const targetGuildId = '1322898318233178122';  // ID de la guilde où tu veux envoyer l'embed
        // const targetGuild = await client.guilds.fetch(targetGuildId); // Récupérer la guilde cible

        // if (targetGuild) {
        //     const dispatchChannel = await targetGuild.channels.fetch(dispatchIOSupport); // Récupérer le salon de la guilde cible
        //     const owner = await guild.fetchOwner();
        //     const botAddingEmbed = new EmbedBuilder()
        //         .setTitle('Je viens de rejoindre un nouveau serveur ! ❤️')
        //         .setDescription(`J'ai été invité par **${owner.user.tag}** !`)
        //         .addFields(
        //             { name: 'Nom du serveur', value: guild.name, inline: false },
        //             { name: 'Membres du serveur', value: `${guild.memberCount}`, inline: false },
        //             { name: 'Serveurs où je suis', value: `${client.guilds.cache.size}`, inline: false },
        //             { name: 'Lien vers le serveur', value: `[Cliquez ici pour rejoindre le serveur](https://discord.gg/${guild.id})`, inline: false }
        //         )
        //         .setColor('#f40076')
        //         .setThumbnail(guild.iconURL())
        //         .setTimestamp();

        //     await dispatchChannel.send({ embeds: [botAddingEmbed] });
        // } else {
        //     console.log('Guilde cible introuvable');
        // }
    } else {
        console.log('Error');
    }
}

module.exports = handleBotJoin;
