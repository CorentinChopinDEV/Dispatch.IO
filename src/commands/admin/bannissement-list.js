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

module.exports = {
    data: {
        name: 'bannissements-liste',
        description: 'Affiche tous les bannissements effectués sur le serveur avec pagination.',
    },
    async execute(interaction) {
        const client = this.client;
        const guild = interaction.guild;
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.editReply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.editReply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }

        try {
            // Récupérer la liste des bannissements
            const bans = await guild.bans.fetch();

            // Vérifier s'il y a des bannissements
            if (bans.size === 0) {
                return interaction.reply({
                    content: 'Aucun utilisateur n\'a été banni sur ce serveur.',
                    ephemeral: true,
                });
            }

            // Convertir la collection en tableau
            const banArray = Array.from(bans.values());

            // Fonction pour créer un embed avec une page de bannissements
            const createEmbed = (startIndex) => {
                const embed = new EmbedBuilder()
                    .setColor(guildData.botColor || '#f40076')
                    .setTitle('📜 Liste des Bannissements')
                    .setDescription('Voici la liste des utilisateurs bannis sur le serveur :')
                    .setThumbnail(guild.iconURL({ dynamic: true })) // Logo du serveur
                    .setFooter({
                        text: `Page ${Math.ceil((startIndex + 1) / 10)} - Nombre total de bannissements : ${bans.size}`,
                        iconURL: client.user.displayAvatarURL({ dynamic: true }), // Logo du bot dans le footer
                    })
                    .setTimestamp();

                // Ajouter les informations sur chaque bannissement pour la page actuelle
                banArray.slice(startIndex, startIndex + 10).forEach((ban, index) => {
                    embed.addFields({
                        name: `Bannissement #${startIndex + index + 1}`,
                        value: `**Utilisateur**: <@${ban.user.id}> \`\`${ban.user.id}\`\`\n**Raison**: ${ban.reason || 'Aucune raison spécifiée'}`,
                        inline: false,
                    });
                });

                return embed;
            };

            let pageIndex = 0;

            // Créer l'embed initial
            let embed = createEmbed(pageIndex);

            // Créer les boutons de pagination
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Suivant')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pageIndex + 10 >= banArray.length),
                new ButtonBuilder()
                    .setCustomId('endRead')
                    .setLabel('Mettre fin à la lecture')
                    .setStyle(ButtonStyle.Danger)
            );

            // Envoyer l'embed avec les boutons
            await interaction.reply({
                embeds: [embed],
                components: [row],
            });

            // Attendre une interaction utilisateur sur les boutons
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 500000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'previous') {
                    pageIndex -= 10;
                } else if (i.customId === 'next') {
                    pageIndex += 10;
                } else if (i.customId === 'endRead'){
                    collector.stop();
                }

                // Mettre à jour l'embed avec la nouvelle page
                embed = createEmbed(pageIndex);

                // Mettre à jour les boutons pour la nouvelle page
                row.components[0].setDisabled(pageIndex === 0);
                row.components[1].setDisabled(pageIndex + 10 >= banArray.length);

                // Réagir à l'interaction
                await i.update({
                    embeds: [embed],
                    components: [row],
                });
            });

            collector.on('end', async () => {
                await interaction.deleteReply();
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des bannissements :', error);
            return interaction.reply({
                content: 'Une erreur est survenue lors de la récupération des bannissements.',
                ephemeral: true,
            });
        }
    },
};
