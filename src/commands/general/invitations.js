const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { env } = require('process');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitation')
        .setDescription(`Génère un lien d'invitation ou permet d'inviter le bot sur un autre serveur.`),

    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
            const guildData = loadGuildData(filePath);
            const query = 'cartoon';

            // Appel à l'API Giphy pour un GIF aléatoire
            const giphyResponse = await axios.get('https://api.giphy.com/v1/gifs/random', {
                params: {
                    api_key: env.GIPHY_API_KEY,
                    tag: query,
                    rating: 'pg',
                },
            });

            const gifUrl = giphyResponse.data.data.images.original.url;

            // Création de l'embed
            const inviteEmbed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('🔗 **Gestion des Invitations**')
            .setDescription(
                `Bienvenue dans la gestion des invitations ! Choisissez une option ci-dessous :\n\n` +
                `🔗 **Créer un lien d'invitation.**\n` +
                `🤖 **Inviter le bot** sur un autre serveur en un clic.\n\n` +
                `Si tu as des questions, n'hésite pas à rejoindre le [serveur de support](https://discord.gg/n5JsF9er5E).`
            )                
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 128, dynamic: true }))
            .setImage(gifUrl)
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp()
            .addFields(
                { name: 'Informations supplémentaires', value: 'N’oublie pas de vérifier que tu as les permissions nécessaires pour créer des liens d\'invitation.' },
            )
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            // Création des boutons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_invite')
                        .setLabel(`Invite un ami sur ce serveur 👐`)
                        .setStyle(ButtonStyle.Primary),

                    new ButtonBuilder()
                        .setURL(`https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                        .setLabel('Inviter le bot 🩵')
                        .setStyle(ButtonStyle.Link)
                );

            // Envoie de l'embed et des boutons
            await interaction.reply({ embeds: [inviteEmbed], components: [actionRow], ephemeral: true });

            // Gestion des interactions des boutons
            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.customId === 'create_invite' && i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async i => {
                if (i.customId === 'create_invite') {
                    try {
                        const invite = await interaction.channel.createInvite({
                            maxAge: 3600,
                            maxUses: 1,
                            unique: true,
                            reason: `Lien d'invitation créé par ${interaction.user.tag}`,
                        });
                        await i.reply({
                            content: `🎉 **Voici votre lien d'invitation unique :** *(Expire dans 1h / Valable une fois)* \`\`\`${invite.url}\`\`\``,
                            ephemeral: true,
                        });
                    } catch (error) {
                        console.error(error);
                        await i.reply({
                            content: '⚠️ Une erreur est survenue lors de la création du lien d\'invitation.',
                            ephemeral: true,
                        });
                    }
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({
                        components: [],
                    });
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '⚠️ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true,
            });
        }
    },
};
