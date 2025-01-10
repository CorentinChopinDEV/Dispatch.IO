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
        } else {
            console.log(`Aucun fichier JSON trouvé pour la guilde ${guildId}.`);
        }
    } else {
        console.log('Error');
    }
}

module.exports = handleBotLeave;