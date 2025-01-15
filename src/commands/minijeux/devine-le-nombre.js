const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('devine')
        .setDescription('Mini-jeu : Devine le nombre !')
        .addSubcommand(subcommand =>
            subcommand
                .setName('le_nombre')
                .setDescription('Démarrer une partie de devine le nombre.')
        ),
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'le_nombre') {
            // Générer un nombre aléatoire entre 1 et 100
            const numberToGuess = Math.floor(Math.random() * 1000) + 1;
            const maxAttempts = 20; // Optionnel : Limiter le nombre d'essais
            let attempts = 0;

            // Créer un embed pour démarrer le jeu
            const startEmbed = new EmbedBuilder()
                .setColor(guildData.botColor || '#f40076')
                .setTitle('🎮 **Devine le Nombre** 🎮')
                .setDescription(
                    'Un **nombre mystère** entre **1** et **1000** a été choisi !\n' +
                    '### **Règles du jeu :**\n' +
                    '✅ Envoyez un nombre dans ce salon pour tenter votre chance.\n\n' +
                    '🏆 Le **premier** à deviner le bon nombre gagne la partie !\n\n' +
                    '*Qui sera le plus rapide et perspicace ? Bonne chance à tous !*\n\n' +
                    '``stop`` pour arrêter la partie.'
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 })) // Icône du serveur
                .setImage('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGp4bmM1M2kwZHV2Yml2Ym85YXpjeTA3bTNmM3BnMmUxZWxoeTVqcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0EoBNcAQAKi9hV7y/giphy.gif')
                .setFooter({
                    text: 'Bonne chance ! • Devine le Nombre',
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true, size: 512 }) // Icône du bot
                });



            await interaction.reply({ embeds: [startEmbed] });

            const filter = (message) => !message.author.bot; // Ignorer les messages des bots
            const collector = interaction.channel.createMessageCollector({ filter });

            collector.on('collect', (message) => {
                if(message.content === 'stop'){
                    collector.stop();
                    return interaction.channel.send('Le jeu est terminé ! Merci d’avoir participé. 💟');
                }
                const guess = parseInt(message.content, 10);

                if (isNaN(guess)) {
                    message.reply('Veuillez entrer un nombre valide.');
                }

                attempts++;

                if (guess === numberToGuess) {
                    collector.stop(); // Arrêter le jeu
                    interaction.channel.send(
                        `🎉 ${message.author} a trouvé le nombre ! C'était **${numberToGuess}**.\nNombre d'essais : ${attempts}`
                    );
                } else if (guess < numberToGuess) {
                    message.reply('Trop bas ! Essayez encore.');
                } else {
                    message.reply('Trop haut ! Essayez encore.');
                }

                // Si le nombre maximal d'essais est atteint
                if (maxAttempts && attempts >= maxAttempts) {
                    collector.stop();
                    interaction.channel.send(
                        `😔 Jeu terminé ! Personne n'a trouvé le nombre.\nC'était **${numberToGuess}**.`
                    );
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason !== 'user') {
                    interaction.channel.send('Le jeu est terminé ! Merci d’avoir participé.');
                }
            });
        }
    },
};
