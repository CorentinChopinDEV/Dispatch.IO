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
        name: 'image-titre',
        description: 'Affiche une image avec un titre défini.',
        options: [
            {
                type: 3, // Type 3 pour une option de chaîne de texte
                name: 'titre',
                description: 'Le titre à afficher sur l\'image',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, '../../../guilds-data', `${guildId}.json`);
        const guildData = loadGuildData(filePath);
        const title = interaction.options.getString('titre');

        // Vérifier que le titre ne dépasse pas 10 caractères
        if (title.length > 10) {
            return interaction.reply({
                content: 'Le titre ne peut pas dépasser 10 caractères.',
                ephemeral: true,
            });
        }

        // Créer un canvas
        const canvas = createCanvas(400, 170);
        const ctx = canvas.getContext('2d');

        // Définir les propriétés du contour
        const borderThickness = 5; // Épaisseur du contour (environ 5 mm)
        const borderColor = guildData.botColor ? guildData.botColor : '#f40076'; // Couleur du contour

        // Dessiner le contour
        ctx.fillStyle = borderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Charger l'image de fond (image téléchargée)
        const backgroundImagePath = guildData.welcomeIMG; // Chemin de l'image téléchargée
        let background;
        try {
            background = await loadImage(backgroundImagePath);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'image de fond:', error);
            return interaction.reply({
                content: 'Impossible de charger l\'image de fond.',
                ephemeral: true,
            });
        }

        // Dessiner l'image de fond à l'intérieur du contour
        ctx.drawImage(
            background,
            borderThickness,
            borderThickness,
            canvas.width - borderThickness * 2,
            canvas.height - borderThickness * 2
        );

        // Ajouter une couche noire semi-transparente à l'intérieur
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
            borderThickness,
            borderThickness,
            canvas.width - borderThickness * 2,
            canvas.height - borderThickness * 2
        );

        // Ajuster la taille du texte
        let fontSize = 70;
        if (title.length <= 5) {
            fontSize = 80;
        } else if (title.length <= 8) {
            fontSize = 70;
        }

        // Configurer la police du texte
        ctx.font = `italic ${fontSize}px 'Pacifico', sans-serif`;
        ctx.textAlign = 'center';

        // Ajouter l'effet 3D
        const depth = 5; // Profondeur de l'effet
        const offset = 2; // Décalage entre les couches
        const shadowColor = guildData.botColor ? guildData.botColor : '#f40076'; // Couleur des ombres
        const textColor = '#FFFFFF'; // Couleur principale du texte

        // Dessiner les couches d'ombre
        for (let i = depth; i > 0; i--) {
            ctx.fillStyle = shadowColor;
            ctx.fillText(
                title,
                canvas.width / 2.05,
                canvas.height / 2 + fontSize / 3 + i * offset
            );
        }

        // Dessiner le texte principal
        ctx.fillStyle = textColor;
        ctx.fillText(title, canvas.width / 2.05, canvas.height / 2 + fontSize / 3);

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

        await interaction.reply({
            content: 'Image générée avec succès ! 🪅',
            ephemeral: true,
        });

        // Envoyer l'image directement dans le salon
        await interaction.channel.send({
            files: [{ attachment: imageBuffer, name: 'image-avec-titre.png' }],
        });
    },
};
