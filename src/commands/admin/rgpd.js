const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
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
        name: 'rgpd',
        description: 'Explique les principes du RGPD et fournit les données sauvegardées pour cette guilde.',
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        if (guildData.admin_role && guildData.ownerId) {
            const isAdmin = interaction.member.roles.cache.has(guildData.admin_role);
            const isOwner = guildData.ownerId === interaction.user.id;
            if (!isAdmin && !isOwner) {
                return interaction.reply({ content: 'Vous n\'avez pas la permission de consulter ceci.', ephemeral: true });
            }
        } else {
            return interaction.reply({ content: '**Rôle administrateur non configurée ->** ``/config-general``', ephemeral: true });
        }
        if (Object.keys(guildData).length === 0) {
            return interaction.reply({ content: 'Aucune donnée enregistrée pour cette guilde.', ephemeral: true });
        }

        try {
            // Crée un fichier temporaire contenant les données
            const tempFilePath = path.join(__dirname, `${guildId}_data.json`);
            fs.writeFileSync(tempFilePath, JSON.stringify(guildData, null, 2));

            // Prépare le fichier en pièce jointe
            const attachment = new AttachmentBuilder(tempFilePath);

            // Crée l'embed d'explication RGPD
            const rgpdEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('🔒 Règlement Général sur la Protection des Données (RGPD)')
                .setDescription(
                    "**Conformément au RGPD,** *vous avez un droit d'accès aux données enregistrées vous concernant.* " +
                    "*Ces données incluent* **des informations liées à la configuration du serveur**. *Vous pouvez demander* " +
                    "*à tout moment* **la suppression ou la modification** *de ces informations.*"
                )
                .addFields(
                    { name: '📜 Vos droits', value: '1. Accès aux données\n2. Rectification des données\n3. Suppression des données\n4. Portabilité des données' },
                    { name: '🔍 Détails des données', value: 'Les données spécifiques à ce serveur sont jointes à ce message.' }
                )
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            // Envoie la réponse avec l'embed et le fichier joint
            await interaction.reply({ embeds: [rgpdEmbed] });
            await interaction.channel.send({content: '## Voici toutes les données enregistrer à propos de votre serveur Discord:', files: [attachment]});

            // Supprime le fichier temporaire après envoi
            fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error('Erreur lors de la génération du fichier RGPD:', error);
            return interaction.reply({ content: 'Une erreur est survenue lors de la génération des données RGPD.', ephemeral: true });
        }
    },
};
