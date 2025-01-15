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

const REACTION_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function formatTimeLeft(endTime) {
    const timeLeft = endTime - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `${hoursLeft}h ${minutesLeft}m`;
}

function createPollEmbed(guildDataColor, question, options, poll, author, totalVotes = 0) {
    const description = options.map((opt, i) => {
        const votes = poll?.options[i]?.votes || 0;
        const percentage = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : 0;
        return `${REACTION_NUMBERS[i]} **${opt}**\n┗ \`${votes} votes\` (${percentage}%)`;
    }).join('\n\n');

    const timeLeft = formatTimeLeft(poll.endsAt);

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${question}`)
        .setDescription(description)
        .setColor(guildDataColor.botColor || '#f40076')
        .setTimestamp()
        .addFields(
            { name: '⏰ Temps restant', value: timeLeft, inline: true },
            { name: '👥 Participation', value: `${totalVotes} vote${totalVotes > 1 ? 's' : ''}`, inline: true }
        )
        .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExemI3YWxheDcwcW84ano0OTFwejJibGlkMzhkams2aXhqODR2aW1haiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/u5BzptR1OTZ04/giphy.gif')
        .setFooter({ text: `Sondage créé par ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) });

    return embed;
}

async function setupPollCollector(client, guildId, pollId, poll, message) {
    const filter = (reaction, user) => {
        return REACTION_NUMBERS.slice(0, poll.options.length).includes(reaction.emoji.name) && !user.bot;
    };

    const collector = message.createReactionCollector({ filter, time: poll.endsAt - Date.now() });

    collector.on('collect', async (reaction, user) => {
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildDataColor = loadGuildData(filePath);
        const guildPath = path.join(__dirname, '..', 'data', `${guildId}.json`);
        const currentGuildData = loadGuildData(guildPath);
        const currentPoll = currentGuildData.polls[pollId];
        
        if (!currentPoll) return;

        const optionIndex = REACTION_NUMBERS.indexOf(reaction.emoji.name);
        const userId = user.id;

        // Retirer les votes précédents
        currentPoll.options.forEach((opt, index) => {
            const voterIndex = opt.voters.indexOf(userId);
            if (voterIndex !== -1) {
                opt.voters.splice(voterIndex, 1);
                opt.votes--;
                // Retirer la réaction de l'autre option si elle existe
                if (index !== optionIndex) {
                    const oldReaction = message.reactions.cache.get(REACTION_NUMBERS[index]);
                    if (oldReaction) {
                        oldReaction.users.remove(user);
                    }
                }
            }
        });

        // Ajouter le nouveau vote
        currentPoll.options[optionIndex].voters.push(userId);
        currentPoll.options[optionIndex].votes++;

        const totalVotes = currentPoll.options.reduce((acc, opt) => acc + opt.votes, 0);
        const author = await client.users.fetch(currentPoll.authorId);
        const updatedEmbed = createPollEmbed(guildDataColor, currentPoll.question, currentPoll.options.map(o => o.text), currentPoll, author, totalVotes);
        
        await message.edit({ embeds: [updatedEmbed] });
        saveGuildData(guildPath, currentGuildData);
    });

    collector.on('end', async () => {
        const guildPath = path.join(__dirname, '..', 'data', `${guildId}.json`);
        const updatedGuildData = loadGuildData(guildPath);
        const finalPoll = updatedGuildData.polls[pollId];

        if (!finalPoll) return;

        const totalVotes = finalPoll.options.reduce((acc, opt) => acc + opt.votes, 0);
        const winner = finalPoll.options.reduce((prev, curr) => 
            (curr.votes > prev.votes) ? curr : prev
        );

        const author = await client.users.fetch(finalPoll.authorId);
        const resultEmbed = new EmbedBuilder()
            .setTitle(`📊 Résultats: ${finalPoll.question}`)
            .setDescription(finalPoll.options.map((opt, i) => {
                const percentage = totalVotes > 0 ? (opt.votes / totalVotes * 100).toFixed(1) : 0;
                const isWinner = opt === winner && opt.votes > 0;
                return `${REACTION_NUMBERS[i]} **${opt.text}**\n┗ \`${opt.votes} votes\` (${percentage}%)${isWinner ? ' 👑' : ''}`;
            }).join('\n\n'))
            .setColor('#f40076')
            .addFields(
                { name: '📈 Total des votes', value: `${totalVotes} vote${totalVotes > 1 ? 's' : ''}`, inline: true }
            )
            .setFooter({ text: 'Sondage terminé', iconURL: author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        await message.reply({ embeds: [resultEmbed] });
        
        // Supprimer le sondage des données
        delete updatedGuildData.polls[pollId];
        saveGuildData(guildPath, updatedGuildData);
    });
}

async function restorePolls(client) {
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

        if (!guildData.polls) continue;

        for (const [pollId, poll] of Object.entries(guildData.polls)) {
            if (poll.endsAt <= Date.now()) {
                delete guildData.polls[pollId];
                continue;
            }

            try {
                const guild = await client.guilds.fetch(guildId);
                const channel = await guild.channels.fetch(poll.channelId);
                const message = await channel.messages.fetch(poll.messageId);

                // Recréer le collector pour ce sondage
                await setupPollCollector(client, guildId, pollId, poll, message);
            } catch (err) {
                console.error(`Erreur lors de la restauration du sondage ${pollId}:`, err);
                delete guildData.polls[pollId];
            }
        }

        saveGuildData(guildPath, guildData);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sondage')
        .setDescription('Créer un nouveau sondage')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('La question du sondage')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Les options du sondage (séparées par des virgules)')
                .setRequired(true)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildDataColor = loadGuildData(filePath);
        
        const question = interaction.options.getString('question');
        const options = interaction.options.getString('options').split(',').map(opt => opt.trim());

        if (options.length < 2) {
            return await interaction.reply({
                content: 'Vous devez fournir au moins 2 options pour le sondage!',
                ephemeral: true
            });
        }

        if (options.length > 5) {
            return await interaction.reply({
                content: 'Vous ne pouvez pas avoir plus de 5 options!',
                ephemeral: true
            });
        }

        const guildPath = path.join(__dirname, '..', 'data', `${interaction.guildId}.json`);
        const guildData = loadGuildData(guildPath);

        const pollId = Date.now().toString();
        const poll = {
            question,
            options: options.map((opt) => ({
                text: opt,
                votes: 0,
                voters: []
            })),
            createdAt: Date.now(),
            endsAt: Date.now() + 24 * 60 * 60 * 1000,
            authorId: interaction.user.id,
            messageId: null,
            channelId: interaction.channelId
        };

        if (!guildData.polls) guildData.polls = {};
        guildData.polls[pollId] = poll;

        const embed = createPollEmbed(guildDataColor, question, options, poll, interaction.user);
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        poll.messageId = message.id;
        
        // Ajouter les réactions
        for (let i = 0; i < options.length; i++) {
            await message.react(REACTION_NUMBERS[i]);
        }

        saveGuildData(guildPath, guildData);

        // Configurer le collector pour ce sondage
        await setupPollCollector(interaction.client, interaction.guildId, pollId, poll, message);
    },

    // Ajouter la fonction de restauration des sondages
    restorePolls
};