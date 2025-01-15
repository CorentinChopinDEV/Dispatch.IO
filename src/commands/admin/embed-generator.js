const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');
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
        .setName('creation-embed')
        .setDescription('Créer un embed avec une prévisualisation.'),

    async execute(interaction, existingEmbed = null) {
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

        const modal = new ModalBuilder()
            .setCustomId(existingEmbed ? 'editEmbedModal' : 'createEmbedModal')
            .setTitle('Création d\'un Embed');

        const titleInput = new TextInputBuilder()
            .setCustomId('embedTitle')
            .setLabel('Titre de l\'embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Entrez le titre de l\'embed')
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embedDescription')
            .setLabel('Description de l\'embed')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Entrez la description de l\'embed')
            .setRequired(false);

        const imageInput = new TextInputBuilder()
            .setCustomId('embedImage')
            .setLabel('URL de l\'image (facultatif)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false);

        if (existingEmbed) {
            if (existingEmbed.title) titleInput.setValue(existingEmbed.title);
            if (existingEmbed.description) descriptionInput.setValue(existingEmbed.description);
            if (existingEmbed.image && existingEmbed.image.url) imageInput.setValue(existingEmbed.image.url);
        }

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        const isEdit = interaction.customId === 'editEmbedModal';
        if (!isEdit && interaction.customId !== 'createEmbedModal') return;

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const title = interaction.fields.getTextInputValue('embedTitle') || null;
        const description = interaction.fields.getTextInputValue('embedDescription') || null;
        const image = interaction.fields.getTextInputValue('embedImage') || null;

        const embed = new EmbedBuilder();
        if (title) embed.setTitle(title);
        if (description) embed.setDescription(`${description}`);
        if (image) embed.setImage(image);
        embed.setColor(guildData.botColor || '#f40076');

        const previewEmbed = new EmbedBuilder()
            .setColor(guildData.botColor || '#f40076')
            .setTitle('Prévisualisation')
            .setDescription('Voici une prévisualisation de votre embed. Utilisez les boutons ci-dessous pour modifier ou envoyer l\'embed.');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('editEmbed')
                .setLabel('Modifier')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('sendEmbed')
                .setLabel('Envoyer')
                .setStyle(ButtonStyle.Success)
        );

        if (isEdit) {
            await interaction.update({
                embeds: [previewEmbed, embed],
                components: [buttons]
            });
        } else {
            await interaction.reply({
                embeds: [previewEmbed, embed],
                components: [buttons],
                ephemeral: true
            });
        }
    }
};

module.exports.handleButtonInteraction = async function (interaction) {
    if (interaction.customId === 'editEmbed') {
        const existingEmbed = interaction.message.embeds[1];
        const command = interaction.client.commands.get('creation-embed');
        if (command && command.execute) {
            await command.execute(interaction, existingEmbed);
        }
    } else if (interaction.customId === 'sendEmbed') {
        const embed = interaction.message.embeds[1];
        if (!embed) {
            return interaction.reply({
                content: '❌ Une erreur est survenue. L\'embed est introuvable.',
                ephemeral: true
            });
        }

        await interaction.channel.send({ embeds: [embed] });
        await interaction.update({
            content: '✅ Embed envoyé avec succès !',
            embeds: [],
            components: []
        });
    }
};