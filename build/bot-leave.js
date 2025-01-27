const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

async function handleBotLeave(guild) {
    if (guild.client && guild.client.user && guild.client.user.bot) {
        const guildId = guild.id;
        const filePath = path.join(__dirname, `../guilds-data/${guildId}.json`);
        if (fs.existsSync(filePath)) {
            const guildData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const ownerId = guildData.ownerId;
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🤖 Le bot a quitté le serveur !')
                .setDescription(
                    `**Le bot a quitté le serveur !** 😢\n\n`
                    + `Merci d'avoir utilisé le bot. Si vous souhaitez le réinstaller, vous pouvez l'inviter à nouveau en utilisant \`/invitation\`.`
                )
                .setThumbnail(guild.iconURL({ dynamic: true }) || null)
                .setFooter({ text: 'Nous espérons vous revoir bientôt !' });

            try {
                const owner = guild.available ? await guild.members.fetch(ownerId) : null;
                if (owner && owner.user && owner.user.dmChannel) {
                    await owner.user.send({ embeds: [embed] });
                    console.log(`Embed envoyé en MP au propriétaire du serveur ${ownerId}`);
                } else {
                    console.log(`Les MP du propriétaire ${ownerId} sont fermés.`);
                }
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'embed en MP au propriétaire du serveur:', error);
            }
            fs.unlinkSync(filePath);
            console.log(`Fichier JSON pour la guilde ${guildId} supprimé.`);
            // const dispatchIOSupport = '1332089005876969524';  // ID du salon où envoyer l'embed
            // const targetGuildId = '1322898318233178122';  // ID de la guilde où tu veux envoyer l'embed
            // const targetGuild = await client.guilds.fetch(targetGuildId); // Récupérer la guilde cible
    
            // if (targetGuild) {
            //     const dispatchChannel = await targetGuild.channels.fetch(dispatchIOSupport); // Récupérer le salon de la guilde cible
            //     const owner = await guild.fetchOwner();
            //     const botAddingEmbed = new EmbedBuilder()
            //         .setTitle('Je viens de quitter un serveur ! 😣')
            //         .setDescription(`J'avais été invité par **${owner.user.tag}** !`)
            //         .addFields(
            //             { name: 'Nom du serveur', value: guild.name, inline: false },
            //             { name: 'Membres du serveur', value: `${guild.memberCount}`, inline: false },
            //             { name: 'Serveurs où je suis', value: `${client.guilds.cache.size}`, inline: false }
            //         )
            //         .setColor('#000000')
            //         .setThumbnail(guild.iconURL())
            //         .setTimestamp();
    
            //     await dispatchChannel.send({ embeds: [botAddingEmbed] });
            // } else {
            //     console.log('Guilde cible introuvable');
            // }
        } else {
            console.log(`Aucun fichier JSON trouvé pour la guilde ${guildId}.`);
        }
    } else {
        console.log('Error');
    }
}

module.exports = handleBotLeave;