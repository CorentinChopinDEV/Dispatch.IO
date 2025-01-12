const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me-renommer')
        .setDescription('Permet de changer votre pseudo sur le serveur')
        .addStringOption(option =>
            option.setName('pseudo')
                .setDescription('Nouveau pseudo que vous voulez définir')
                .setRequired(true)),

    async execute(interaction) {
        const newName = interaction.options.getString('pseudo'); // Nouveau pseudo
        try {
            // Modifie le pseudo de l'utilisateur
            await interaction.member.setNickname(newName);
            await interaction.reply({
                content: `Votre pseudo a été modifié en **${newName}** !`,
                ephemeral: true, // Message visible uniquement pour l'utilisateur
            });
            await interaction.channel.send(`### Le pseudo de <@${interaction.user.id}> viens d'être modifié ! 📨`);
        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de la tentative de changement de votre pseudo.',
                ephemeral: true,
            });
        }
    },
};
