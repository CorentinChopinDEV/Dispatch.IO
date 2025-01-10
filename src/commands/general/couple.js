const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
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
    data: {
        name: 'couple',
        description: 'Crée un couple en mentionnant deux utilisateurs et affiche leurs photos de profil.',
        options: [
            {
                type: 6, // Type 6 pour une option d'utilisateur
                name: 'utilisateur1',
                description: 'Le premier utilisateur du couple',
                required: true,
            },
            {
                type: 6, // Type 6 pour une option d'utilisateur
                name: 'utilisateur2',
                description: 'Le deuxième utilisateur du couple',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const user1 = interaction.options.getUser('utilisateur1');
        const user2 = interaction.options.getUser('utilisateur2');

        // Générer un nom de couple
        const halfLength1 = Math.floor(user1.username.length / 2);
        const halfLength2 = Math.floor(user2.username.length / 2);
        const coupleName = user1.username.slice(0, halfLength1) + user2.username.slice(halfLength2);

        // Créer un canvas
        const canvas = createCanvas(700, 300);
        const ctx = canvas.getContext('2d');

        // Charger l'image de fond
        const backgroundImageURL = guildData.welcomeIMG || 'https://example.com/default-background.png';
        let background;
        try {
            background = await loadImage(backgroundImageURL);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'image de fond:', error);
            background = await loadImage('https://example.com/default-background.png'); // Fond par défaut
        }
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Ajouter une couche noire semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Charger les avatars des utilisateurs
        let avatar1, avatar2;
        try {
            avatar1 = await loadImage(user1.displayAvatarURL({ extension: 'png', size: 512 }));
        } catch (error) {
            console.error(`Erreur lors du chargement de l'avatar de ${user1.username} :`, error);
            avatar1 = await loadImage('https://example.com/default-avatar.png'); // Avatar par défaut
        }
        try {
            avatar2 = await loadImage(user2.displayAvatarURL({ extension: 'png', size: 512 }));
        } catch (error) {
            console.error(`Erreur lors du chargement de l'avatar de ${user2.username} :`, error);
            avatar2 = await loadImage('https://example.com/default-avatar.png'); // Avatar par défaut
        }

        // Dessiner les avatars (cercle à gauche et à droite)
        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 150, 70, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar2, 30, 80, 140, 140);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(600, 150, 70, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar1, 530, 80, 140, 140);
        ctx.restore();

        // Ajouter les pseudos des utilisateurs (nom visible)
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(user2.displayName, 100, 250);  // Afficher le nom visible
        ctx.fillText(user1.displayName, 600, 250);  // Afficher le nom visible

        ctx.fillStyle = '#FF0000';
        ctx.beginPath();

        // Partie gauche du cœur (ajuster les courbes pour rétrécir)
        ctx.moveTo(350, 150); // Point central inférieur
        ctx.bezierCurveTo(320, 120, 290, 120, 290, 150); // Courbe supérieure gauche
        ctx.bezierCurveTo(290, 180, 330, 210, 350, 230); // Courbe vers le bas gauche

        // Partie droite du cœur (ajuster les courbes pour rétrécir)
        ctx.bezierCurveTo(370, 210, 410, 180, 410, 150); // Courbe vers le haut droit
        ctx.bezierCurveTo(410, 120, 380, 120, 350, 150); // Courbe supérieure droite

        ctx.closePath();
        ctx.fill();


        // Convertir le canvas en buffer
        let imageBuffer;
        try {
            imageBuffer = canvas.toBuffer();
        } catch (error) {
            console.error('Erreur lors de la conversion du canvas en buffer:', error);
            return interaction.reply({
                content: 'Une erreur est survenue lors de la génération de l\'image.',
                ephemeral: true,
            });
        }

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setTitle(`❤️ Amour entre ${user1.username} et ${user2.username}`)
            .setDescription('*Qu\'ils sont migon tout les deux !*\n*Leur enfant s\'appellera sûrement* **' + coupleName + '** 👶')
            .setImage('attachment://couple-image.png')
            .setColor(guildData.botColor || '#f40076')

        // Envoyer la réponse
        await interaction.reply({
            embeds: [embed],
            files: [{ attachment: imageBuffer, name: 'couple-image.png' }],
        });

        const reactLove = await interaction.fetchReply();
        await reactLove.react('❤️');
    },
};
