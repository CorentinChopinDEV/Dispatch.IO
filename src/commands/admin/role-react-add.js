const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

async function addReactionToMessage(message, emoji) {
    try {
        await message.react(emoji);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réaction:', error);
    }
}

async function saveRoleReactionConfig(guildId, emoji, roleId, messageId, channelId) {
    const guildDataPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);
    const guildData = loadGuildData(guildDataPath);

    // Ajouter le rôle de réaction dans le fichier JSON
    if (!guildData.roleReactions) {
        guildData.roleReactions = [];
    }

    guildData.roleReactions.push({
        emoji,
        roleId,
        messageId,
        channelId
    });

    // Sauvegarder les données dans le fichier JSON
    try {
        fs.writeFileSync(guildDataPath, JSON.stringify(guildData, null, 2));
        console.log('Configuration du rôle réaction sauvegardée avec succès.');
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données du rôle réaction:', err);
    }
}

module.exports = {
    data: {
        name: 'role-react-add',
        description: 'Ajout d\'une nouvelle réaction à un message pour obtenir un rôle !',
        options: [
            {
                name: 'emoji',
                type: 3, // STRING
                description: 'Emoji pour la réaction',
                required: true,
            },
            {
                name: 'role',
                type: 8, // ROLE
                description: 'Rôle à attribuer',
                required: true,
            },
            {
                name: 'message_id',
                type: 3, // STRING
                description: 'ID du message',
                required: true,
            },
            {
                name: 'channel',
                type: 7, // CHANNEL
                description: 'Salon où se trouve le message',
                required: true,
            },
        ],
    },

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildDataPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);
        const guildData = loadGuildData(guildDataPath);
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if(guildData.dev_role){
                const isDev = interaction.member.roles.cache.has(guildData.dev_role);
                if (!isAdmin && !isOwner && !isDev) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
                }
            }else{
                if (!isAdmin && !isOwner) {
                    return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
                }
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }
        const emoji = interaction.options.getString('emoji');
        const role = interaction.options.getRole('role');
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel');
        let logoURL = 'https://i.ibb.co/TcdznPc/IO-2.png';
        let bannerURL = 'https://i.ibb.co/HPrWVPP/Moderation-Anti-Raid.png';
        // Embed de confirmation
        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Confirmation 👑')
            .setImage(bannerURL)
            .setThumbnail(logoURL)
            .setDescription(`Êtes-vous sûr de vouloir ajouter le rôle \`${role.name}\` à ce message \`${messageId}\` avec l'emoji \`${emoji}\` dans le salon \`${channel.name}\` ?`)
            .setFooter({ text: 'Cliquez sur le bouton pour confirmer' });

        // Création du bouton de confirmation
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_role_reaction')
                .setLabel('Confirmer')
                .setStyle(ButtonStyle.Primary)
        );

        // Envoi de l'embed avec le bouton
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });

        // Interaction pour confirmer le rôle réaction
        const filter = (i) => i.customId === 'confirm_role_reaction' && i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'confirm_role_reaction') {
                // Enregistrer la configuration dans le fichier JSON
                await saveRoleReactionConfig(interaction.guild.id, emoji, role.id, messageId, channel.id);

                // Ajouter la réaction au message
                try {
                    const message = await channel.messages.fetch(messageId);
                    await addReactionToMessage(message, emoji);
                    await interaction.deleteReply();
                } catch (error) {
                    console.error('Erreur lors de la récupération du message:', error);
                    return i.update({ content: 'Le message n\'a pas pu être trouvé.', components: [] });
                }

                await i.update({
                    content: 'Rôle réaction ajouté avec succès !',
                    components: [],
                });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: 'Temps écoulé pour confirmer.', components: [] });
            }
        });
    },
};
