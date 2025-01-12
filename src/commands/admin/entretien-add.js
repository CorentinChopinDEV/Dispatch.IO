const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
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
    data: new SlashCommandBuilder()
        .setName('ajout-entretien')
        .setDescription('Permet d\'ajouter un utilisateur au salon vocal entretien.')
        .addUserOption(option =>
            option
                .setName('utilisateur')
                .setDescription("L'utilisateur à qui attribuer le rôle entretien.")
                .setRequired(true)
        ),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission d\'utiliser cette commande.',
                    ephemeral: true
                });
            }
        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true
            });
        }

        if (interaction.guild.id !== '1212777500565045258') {
            return interaction.reply({
                content: 'Cette commande n\'est pas activée sur ce serveur !',
                ephemeral: true
            });
        }

        const utilisateur = interaction.options.getUser('utilisateur');
        const predefinedRoleId = '1327699482866880684';
        const role = interaction.guild.roles.cache.get(predefinedRoleId);
        const member = interaction.guild.members.cache.get(utilisateur.id);

        if (!member) {
            return interaction.reply({
                content: "L'utilisateur mentionné n'est pas présent sur le serveur.",
                ephemeral: true
            });
        }

        try {
            await member.roles.add(role);

            const confirmationEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Rôle attribué avec succès')
                .setDescription(`L'utilisateur <@${utilisateur.id}> à étais ajouté au salon <#1327698169290821723>.`)
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmationEmbed],
                ephemeral: true
            });

            // Envoyer un message privé à l'utilisateur
            const dmEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Vous avez étais ajouté au salon vocal entretien.')
                .setDescription(
                    "# L'entretien va commencé ! \nVous avez été ajouté au **salon** \n<#1327698169290821723>.\nMerci de le rejoindre dès que possible."
                )
                .setFooter({ text: 'Message automatique', iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await utilisateur.send({ embeds: [dmEmbed] }).catch(() => {
                console.error(`Impossible d'envoyer un DM à ${utilisateur.tag}.`);
            });

        } catch (error) {
            console.error('Erreur lors de l\'attribution du rôle:', error);
            return interaction.reply({
                content: "Une erreur est survenue lors de l'attribution du rôle. Veuillez vérifier mes permissions.",
                ephemeral: true
            });
        }
    },
};
