import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

// Constants pour les IDs personnalisés
const CUSTOM_IDS = {
    APPROVE: 'approve_react',
    DENY: 'deny_react',
    DELETE: 'delete_react',
    APPROVE_RESPONSE: 'approve_react_response',
    DENY_RESPONSE: 'deny_react_response'
};

// Constants pour les statuts
const STATUS = {
    APPROVE: {
        text: 'validée',
        color: '#00FF00',
        emoji: '✅'
    },
    DENY: {
        text: 'refusée',
        color: '#FF0000',
        emoji: '❌'
    }
};

async function loadGuildData(guildPath) {
    try {
        const data = await fs.readFile(guildPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur de chargement des données de la guilde:', error);
        return {};
    }
}

function createSuggestionEmbed(message, channelType) {
    return new EmbedBuilder()
        .setColor('#f40076')
        .setTitle(`Suggestion pour le pack ${channelType}`)
        .setDescription(message.content)
        .setFooter({ 
            text: `Suggestion de ${message.author.tag} | ID: ${message.author.id}`, 
            iconURL: message.author.displayAvatarURL() 
        })
        .setTimestamp();
}

function createActionButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.APPROVE)
                .setLabel('Approuver')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.DENY)
                .setLabel('Refuser')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(CUSTOM_IDS.DELETE)
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Secondary)
        );
}

function createResponseModal(customId, title) {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('response')
                    .setLabel('Votre réponse')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(1)
                    .setMaxLength(1000)
                    .setPlaceholder('Expliquez pourquoi vous avez pris cette décision...')
                    .setRequired(true)
            )
        );
}

async function handleSuggestion(message, channelType, guildData) {
    // Vérification des liens
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    if (linkRegex.test(message.content) && !message.author.bot) {
        await message.delete();
        await message.author.send(`Les liens ne sont pas autorisés dans ce canal. Votre message a été supprimé.`)
            .catch(err => console.error('Impossible d\'envoyer le DM:', err));
        return;
    }

    const embed = createSuggestionEmbed(message, channelType);
    const buttons = createActionButtons();

    await message.delete();
    return message.channel.send({ 
        embeds: [embed],
        components: [buttons]
    });
}

async function checkPermissions(interaction, guildData) {
    const channelType = interaction.channel.id === guildData.suggestion_fr ? 'FR' : 'US';
    const gestionRole = channelType === 'FR' ? guildData.gestion_suggestion_fr : guildData.gestion_suggestion_us;

    if (!interaction.member.roles.cache.has(gestionRole)) {
        await interaction.reply({ 
            content: `Vous n'avez pas la permission de gérer cette suggestion.`,
            ephemeral: true 
        });
        return false;
    }
    return true;
}

async function handleSuggestionResponse(interaction, guildData) {
    if (!await checkPermissions(interaction, guildData)) return;

    const embed = interaction.message.embeds[0];
    const userId = embed.footer.text.split('ID: ')[1];
    await interaction.client.users.fetch(userId);

    switch (interaction.customId) {
        case CUSTOM_IDS.APPROVE: {
            const modal = createResponseModal(
                CUSTOM_IDS.APPROVE_RESPONSE,
                'Valider la suggestion'
            );
            await interaction.showModal(modal);
            break;
        }
        case CUSTOM_IDS.DENY: {
            const modal = createResponseModal(
                CUSTOM_IDS.DENY_RESPONSE,
                'Refuser la suggestion'
            );
            await interaction.showModal(modal);
            break;
        }
        case CUSTOM_IDS.DELETE: {
            await interaction.message.delete();
            await interaction.reply({ 
                content: 'Suggestion supprimée avec succès.',
                ephemeral: true 
            });
            break;
        }
    }
}

async function createResponseEmbed(interaction, embed, status, response) {
    const responseEmbed = new EmbedBuilder()
        .setColor(status.color)
        .setTitle(`${status.emoji} Réponse à votre suggestion`)
        .setDescription(`**Suggestion originale:**\n${embed.description}\n\n**Statut:** ${status.text}\n**Réponse:**\n${response}`)
        .setFooter({ 
            text: `Réponse de ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    const updatedEmbed = new EmbedBuilder()
        .setColor(status.color)
        .setTitle(`${status.emoji} - Suggestion ${status.text} par ${interaction.user.tag}`)
        .setDescription(`${embed.description}\n\n**Réponse:**\n${response}`)
        .setFooter(embed.footer)
        .setTimestamp();

    return { responseEmbed, updatedEmbed };
}

async function handleModalResponse(interaction, guildData) {
    const embed = interaction.message.embeds[0];
    const userId = embed.footer.text.split('ID: ')[1];
    const user = await interaction.client.users.fetch(userId);
    const response = interaction.fields.getTextInputValue('response');

    if (interaction.customId === CUSTOM_IDS.APPROVE_RESPONSE || interaction.customId === CUSTOM_IDS.DENY_RESPONSE) {
        const status = interaction.customId === CUSTOM_IDS.APPROVE_RESPONSE ? STATUS.APPROVE : STATUS.DENY;
        const { responseEmbed, updatedEmbed } = await createResponseEmbed(interaction, embed, status, response);

        try {
            await user.send({ embeds: [responseEmbed] });
            await interaction.message.edit({
                embeds: [updatedEmbed],
                components: []
            });
            await interaction.reply({ 
                content: `Suggestion ${status.text} avec succès et réponse envoyée.`,
                ephemeral: true 
            });
        } catch (err) {
            console.error('Impossible d\'envoyer le DM:', err);
            await interaction.reply({ 
                content: 'Impossible d\'envoyer la réponse en MP à l\'utilisateur.',
                ephemeral: true 
            });
        }
    }
}

async function handleMessageEvent(message) {
    if (message.author.bot) return;

    const guildPath = path.resolve(`./guilds-data/${message.guild.id}.json`);
    const guildData = await loadGuildData(guildPath);

    if (message.channel.id === guildData.suggestion_fr) {
        await handleSuggestion(message, 'FR', guildData);
    } else if (message.channel.id === guildData.suggestion_us) {
        await handleSuggestion(message, 'US', guildData);
    }
}

async function handleInteractionEvent(interaction) {
    if (!interaction.guild) return;

    const guildPath = path.resolve(`./guilds-data/${interaction.guild.id}.json`);
    const guildData = await loadGuildData(guildPath);

    if (interaction.isButton()) {
        const validButtons = [CUSTOM_IDS.APPROVE, CUSTOM_IDS.DENY, CUSTOM_IDS.DELETE];
        if (validButtons.includes(interaction.customId)) {
            await handleSuggestionResponse(interaction, guildData);
        }
    } else if (interaction.isModalSubmit()) {
        const validModals = [CUSTOM_IDS.APPROVE_RESPONSE, CUSTOM_IDS.DENY_RESPONSE];
        if (validModals.includes(interaction.customId)) {
            await handleModalResponse(interaction, guildData);
        }
    }
}

export { handleMessageEvent, handleInteractionEvent };