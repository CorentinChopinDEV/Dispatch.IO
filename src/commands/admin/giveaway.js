const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

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

function saveGuildData(guildPath, data) {
    try {
        fs.writeFileSync(guildPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erreur lors de la sauvegarde des données de la guilde:', err);
    }
}

function formatTimeLeft(endTime) {
    const timeLeft = endTime - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `${hoursLeft}h ${minutesLeft}m`;
}

function createGiveawayEmbed(guildDataColor, prize, winners, giveaway, author, participants = 0) {
    const timeLeft = formatTimeLeft(giveaway.endsAt);

    const embed = new EmbedBuilder()
        .setTitle(`🎉 Giveaway: ${prize}`)
        .setDescription(`Réagissez avec 🎉 pour participer!\n\n**Prix:** ${prize}\n**Gagnants:** ${winners}\n\n**Participants:** ${participants}`)
        .setColor(guildDataColor.botColor || '#f40076')
        .setTimestamp()
        .addFields(
            { name: '⏰ Temps restant', value: timeLeft, inline: true },
            { name: '👥 Participants', value: `${participants}`, inline: true }
        )
        .setImage('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDY5Y2JqZnBxbWJyZnBnNmRyOWJyNmRzNmRzOWJyZnBxbWJyZnBnNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26tOZ42Mg6pbTUPHW/giphy.gif')
        .setFooter({ text: `Giveaway créé par ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) });

    return embed;
}

async function setupGiveawayCollector(client, guildId, giveawayId, giveaway, message) {
    const filter = (reaction, user) => {
        return reaction.emoji.name === '🎉';
    };

    const collector = message.createReactionCollector({ filter, time: giveaway.endsAt - Date.now() });

    collector.on('collect', async (reaction, user) => {
        if (user.bot) return;
        
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildDataColor = loadGuildData(filePath);
        const guildPath = path.join(__dirname, '..', 'data', `${guildId}.json`);
        const currentGuildData = loadGuildData(guildPath);
        const currentGiveaway = currentGuildData.giveaways[giveawayId];
        
        if (!currentGiveaway) return;

        if (!currentGiveaway.participants.includes(user.id)) {
            currentGiveaway.participants.push(user.id);
        }

        const author = await client.users.fetch(currentGiveaway.authorId);
        const updatedEmbed = createGiveawayEmbed(
            guildDataColor,
            currentGiveaway.prize,
            currentGiveaway.winners,
            currentGiveaway,
            author,
            currentGiveaway.participants.length
        );
        
        await message.edit({ embeds: [updatedEmbed] });
        saveGuildData(guildPath, currentGuildData);
    });

    collector.on('remove', async (reaction, user) => {
        if (user.bot) return;
        
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildDataColor = loadGuildData(filePath);
        const guildPath = path.join(__dirname, '..', 'data', `${guildId}.json`);
        const currentGuildData = loadGuildData(guildPath);
        const currentGiveaway = currentGuildData.giveaways[giveawayId];
        
        if (!currentGiveaway) return;

        const participantIndex = currentGiveaway.participants.indexOf(user.id);
        if (participantIndex > -1) {
            currentGiveaway.participants.splice(participantIndex, 1);
        }

        const author = await client.users.fetch(currentGiveaway.authorId);
        const updatedEmbed = createGiveawayEmbed(
            guildDataColor,
            currentGiveaway.prize,
            currentGiveaway.winners,
            currentGiveaway,
            author,
            currentGiveaway.participants.length
        );
        
        await message.edit({ embeds: [updatedEmbed] });
        saveGuildData(guildPath, currentGuildData);
    });

    collector.on('end', async () => {
        const guildPath = path.join(__dirname, '..', 'data', `${guildId}.json`);
        const updatedGuildData = loadGuildData(guildPath);
        const finalGiveaway = updatedGuildData.giveaways[giveawayId];

        if (!finalGiveaway) return;

        const participants = [...finalGiveaway.participants]; // Create a copy of the array
        const winners = [];
        const numWinners = Math.min(finalGiveaway.winners, participants.length);

        for (let i = 0; i < numWinners; i++) {
            const winnerIndex = Math.floor(Math.random() * participants.length);
            const winnerId = participants.splice(winnerIndex, 1)[0];
            winners.push(winnerId);
        }

        const author = await client.users.fetch(finalGiveaway.authorId);
        const winnerMentions = await Promise.all(winners.map(async (id) => {
            const user = await client.users.fetch(id);
            return `<@${user.id}>`;
        }));

        const resultEmbed = new EmbedBuilder()
            .setTitle(`🎉 Giveaway Terminé: ${finalGiveaway.prize}`)
            .setDescription(winners.length > 0
                ? `🎊 Félicitations aux gagnants:\n${winnerMentions.join('\n')}`
                : "Aucun participant n'a participé au giveaway.")
            .setColor('#f40076')
            .addFields(
                { name: '📊 Participants', value: `${finalGiveaway.participants.length}`, inline: true }
            )
            .setFooter({ text: 'Giveaway terminé', iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await message.reply({ 
            content: winners.length > 0 ? `🎉 Félicitations ${winnerMentions.join(', ')} ! Vous avez gagné **${finalGiveaway.prize}** !` : "Personne n'a gagné le giveaway.",
            embeds: [resultEmbed] 
        });
        
        delete updatedGuildData.giveaways[giveawayId];
        saveGuildData(guildPath, updatedGuildData);
    });
}

async function restoreGiveaways(client) {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        return;
    }

    const guildFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

    for (const file of guildFiles) {
        const guildId = file.replace('.json', '');
        const guildPath = path.join(dataDir, file);
        const guildData = loadGuildData(guildPath);

        if (!guildData.giveaways) continue;

        for (const [giveawayId, giveaway] of Object.entries(guildData.giveaways)) {
            try {
                const guild = await client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(giveaway.channelId);
                const message = await channel.messages.fetch(giveaway.messageId);

                if (giveaway.endsAt <= Date.now()) {
                    // Si le giveaway est terminé, déclencher manuellement l'événement end
                    const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
                    const guildDataColor = loadGuildData(filePath);
                    
                    const participants = [...giveaway.participants];
                    const winners = [];
                    const numWinners = Math.min(giveaway.winners, participants.length);

                    for (let i = 0; i < numWinners; i++) {
                        const winnerIndex = Math.floor(Math.random() * participants.length);
                        const winnerId = participants.splice(winnerIndex, 1)[0];
                        winners.push(winnerId);
                    }

                    const author = await client.users.fetch(giveaway.authorId);
                    const winnerMentions = await Promise.all(winners.map(async (id) => {
                        const user = await client.users.fetch(id);
                        return `<@${user.id}>`;
                    }));

                    const resultEmbed = new EmbedBuilder()
                        .setTitle(`🎉 Giveaway Terminé: ${giveaway.prize}`)
                        .setDescription(winners.length > 0
                            ? `🎊 Félicitations aux gagnants:\n${winnerMentions.join('\n')}`
                            : "Aucun participant n'a participé au giveaway.")
                        .setColor('#f40076')
                        .addFields(
                            { name: '📊 Participants', value: `${giveaway.participants.length}`, inline: true }
                        )
                        .setFooter({ text: 'Giveaway terminé', iconURL: author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();

                    await message.reply({ 
                        content: winners.length > 0 ? `🎉 Félicitations ${winnerMentions.join(', ')} ! Vous avez gagné **${giveaway.prize}** !` : "Personne n'a gagné le giveaway.",
                        embeds: [resultEmbed] 
                    });

                    delete guildData.giveaways[giveawayId];
                    continue;
                }

                await setupGiveawayCollector(client, guildId, giveawayId, giveaway, message);
            } catch (err) {
                console.error(`Erreur lors de la restauration du giveaway ${giveawayId}:`, err);
                delete guildData.giveaways[giveawayId];
            }
        }

        saveGuildData(guildPath, guildData);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Créer un nouveau giveaway')
        .addStringOption(option =>
            option.setName('prix')
                .setDescription('Le prix à gagner')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('gagnants')
                .setDescription('Nombre de gagnants')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en heures')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(168)), // Maximum 1 semaine

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildDataColor = loadGuildData(filePath);
        
        const prize = interaction.options.getString('prix');
        const winners = interaction.options.getInteger('gagnants');
        const duration = interaction.options.getInteger('duree');

        const guildPath = path.join(__dirname, '..', 'data', `${interaction.guildId}.json`);
        const guildData = loadGuildData(guildPath);

        const giveawayId = Date.now().toString();
        const giveaway = {
            prize,
            winners,
            participants: [],
            createdAt: Date.now(),
            endsAt: Date.now() + (duration * 60 * 60 * 1000),
            authorId: interaction.user.id,
            messageId: null,
            channelId: interaction.channelId
        };

        if (!guildData.giveaways) guildData.giveaways = {};
        guildData.giveaways[giveawayId] = giveaway;

        const embed = createGiveawayEmbed(guildDataColor, prize, winners, giveaway, interaction.user, 0);
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        giveaway.messageId = message.id;
        
        await message.react('🎉');

        saveGuildData(guildPath, guildData);

        await setupGiveawayCollector(interaction.client, interaction.guildId, giveawayId, giveaway, message);
    },

    restoreGiveaways
};