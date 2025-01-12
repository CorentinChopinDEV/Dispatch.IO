const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

function loadGuildData(guildPath) {
    try {
        if (fs.existsSync(guildPath)) {
            const data = fs.readFileSync(guildPath, 'utf-8');
            return JSON.parse(data);
        } else {
            return {};
        }
    } catch (err) {
        console.error('Erreur lors du chargement des données de la guilde :', err);
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('signalement')
        .setDescription('Envoyer un signalement aux administrateurs.')
        .addStringOption(option =>
            option
                .setName('contenu')
                .setDescription('Décrivez votre problème ou signalement.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);

        const content = interaction.options.getString('contenu');
        const logsChannelId = guildData.logs_member_channel;
        const owner = await interaction.guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('📣 Nouveau Signalement')
            .setDescription(content)
            .addFields(
                { name: 'Auteur', value: `<@${interaction.user.id}>`, inline: false },
                { name: 'ID Auteur', value: `\`\`\`${interaction.user.id}\`\`\``, inline: false },
                { name: 'Salon d\'origine', value: `<#${interaction.channel.id}>`, inline: false }
            )
            .setFooter({ 
                text: `Signalement envoyé par ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        try {
            if (logsChannelId) {
                const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
                if (logsChannel) {
                    await logsChannel.send({ embeds: [embed] });
                    await interaction.reply({
                        content: '✅ Votre signalement a été envoyé aux administrateurs.',
                        ephemeral: true
                    });
                } else {
                    throw new Error('Le salon de logs est introuvable.');
                }
            } else {
                await owner.send({ embeds: [embed] });
                await interaction.reply({
                    content: '✅ Votre signalement a été envoyé au propriétaire du serveur.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Erreur lors de l\'envoi du signalement :', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'envoi de votre signalement. Veuillez réessayer plus tard.',
                ephemeral: true
            });
        }
    },
};
