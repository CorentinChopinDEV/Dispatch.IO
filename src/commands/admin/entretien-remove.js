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
        .setName('retrait-entretien')
        .setDescription('Retire un rôle spécifique à un utilisateur mentionné.')
        .addUserOption(option =>
            option
                .setName('utilisateur')
                .setDescription("L'utilisateur à qui retirer le rôle.")
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
            await member.roles.remove(role);

            const confirmationEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('Rôle retirer avec succès')
                .setDescription(`L'utilisateur <@${utilisateur.id}> à étais retiré.`)
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmationEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Erreur lors du retrait du rôle:', error);
            return interaction.reply({
                content: "Une erreur est survenue lors du retrait du rôle. Veuillez vérifier mes permissions.",
                ephemeral: true
            });
        }
    },
};
