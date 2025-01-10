const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Fonction de chargement des données (assurez-vous que cette fonction existe déjà dans votre projet)
function loadGuildData(guildPath) {
    const fs = require('fs');
    try {
        if (fs.existsSync(guildPath)) {
            return JSON.parse(fs.readFileSync(guildPath, 'utf8'));
        }
    } catch (error) {
        console.error(`Erreur lors du chargement des données : ${error.message}`);
        return {};
    }
}


module.exports = {
    data: {
        name: 'mp-utilisateur',
        description: 'Envoyer un message privé à un utilisateur.',
        options: [
            {
                name: 'utilisateur',
                type: 6, // USER
                description: "L'utilisateur à qui envoyer le message",
                required: true,
            },
            {
                name: 'message',
                type: 3, // STRING
                description: 'Le message à envoyer',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildPath = path.join(__dirname, `../../../guilds-data/${guildId}.json`);

        // Charger les données de la guilde
        const guildData = loadGuildData(guildPath);
        if (guildData.ownerId) {
            const isOwner = guildData.ownerId === interaction.user.id;
            const modRoleId = guildData.mod_role;
            const hasmodRole = interaction.member.roles.cache.has(modRoleId);
            const adminRoleId = guildData.admin_role;
            const hasadminRole = interaction.member.roles.cache.has(adminRoleId);
        
            // Autoriser seulement si l'utilisateur est soit ownerId, soit possède le rôle Dev
            if (!isOwner && !hasadminRole && !hasmodRole) {
                return interaction.reply({
                    content: 'Vous n\'avez pas la permission de consulter ceci. 🔴',
                    ephemeral: true,
                });
                
            }
        } else {
            return interaction.reply({
                content: '**Rôle administrateur non configuré ->** `/config-general`',
                ephemeral: true,
            });
        }

        const utilisateur = interaction.options.getUser('utilisateur');
        const message = interaction.options.getString('message');

        if (!utilisateur) {
            return interaction.reply({
                content: 'Veuillez spécifier un utilisateur valide.',
                ephemeral: true,
            });
        }

        try {
            // Envoi du message privé
            const embed = new EmbedBuilder()
                .setTitle('📬 Nouveau message reçu')
                .setDescription(message)
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setFooter({ text: `Envoyé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await utilisateur.send({ embeds: [embed] });

            await interaction.reply({
                content: `Le message a été envoyé avec succès à **${utilisateur.tag}**. ✅`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`Erreur lors de l'envoi du message privé : ${error.message}`);

            await interaction.reply({
                content: `Impossible d'envoyer un message privé à **${utilisateur.tag}**. Assurez-vous que l'utilisateur accepte les messages privés. ❌`,
                ephemeral: true,
            });
        }
    },
};
