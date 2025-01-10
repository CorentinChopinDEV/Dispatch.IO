const { MessageEmbed } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

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

async function userAdd(client, member) {
    const guildId = member.guild.id;
    const filePath = path.join(__dirname, '../guilds-data', `${guildId}.json`);
    const guildData = loadGuildData(filePath);

    // Créer un canvas pour la bienvenue
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Charger l'image de fond
    const backgroundImageURL = guildData.welcomeIMG || 'https://example.com/default-welcome.png';
    let background;
    try {
        background = await loadImage(backgroundImageURL);
    } catch (error) {
        console.error('Erreur lors du chargement de l’image de fond, utilisation d’un fond par défaut.');
        background = await loadImage('https://example.com/default-background.png'); // Fond par défaut
    }
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Ajouter une couche noire semi-transparente
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Charger l'avatar de l'utilisateur
    let avatar;
    try {
        avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
    } catch (error) {
        console.error(`Erreur lors du chargement de l'avatar de ${member.user.username} :`, error);
        avatar = await loadImage('https://example.com/default-avatar.png'); // Avatar par défaut
    }

    // Dessiner l'avatar en cercle avec un contour blanc (plus grand)
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 125, 70, 0, Math.PI * 2, false); // Position ajustée et rayon agrandi
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 80, 55, 140, 140); // Position ajustée et taille agrandie
    ctx.restore();

    // Ajouter un contour autour de l'avatar (plus grand)
    ctx.beginPath();
    ctx.arc(150, 125, 72, 0, Math.PI * 2, false); // Ajuster le rayon du contour
    ctx.lineWidth = 5; // Épaissir légèrement le contour
    ctx.strokeStyle = guildData.botColor || '#f40076'; // Couleur blanche pour le contour
    ctx.stroke();
    ctx.closePath();

    let serverName = member.guild.name;
    if (serverName === 'LSPDFR French Corporation') {
        serverName = 'French Corp';
    }

    // Ajouter le texte de bienvenue
    ctx.font = 'bold 50px Poppins'; // Police moderne pour "Bienvenue"
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('Bienvenue', 470, 95);

    ctx.font = 'italic 28px Poppins'; // Texte secondaire
    ctx.fillText('sur le serveur Discord', 470, 135);

    ctx.font = 'bold 40px Poppins'; // Nom du serveur en gras
    ctx.fillText(serverName, 470, 185);

    // Convertir le canvas en buffer
    let imageBuffer;
    try {
        imageBuffer = canvas.toBuffer();
    } catch (error) {
        console.error('Erreur lors de la conversion du canvas en buffer:', error);
        return;
    }
    if (guildData.welcomeRoles && Array.isArray(guildData.welcomeRoles)) {
        for (const roleId of guildData.welcomeRoles) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
                try {
                    await member.roles.add(role);
                    console.log(`Rôle ${role.name} ajouté à ${member.user.username}.`);
                } catch (error) {
                    console.error(`Erreur lors de l'ajout du rôle ${role.name} à ${member.user.username}:`, error);
                }
            } else {
                console.warn(`Rôle avec l'ID ${roleId} introuvable dans la guilde.`);
            }
        }
    }
    // Envoyer l'image et un message de bienvenue
    const customMessage = `Bienvenue ${member.user.username} sur le serveur ! 🚀`;
    if (guildData.welcome_channel) {
        const welcomeChannelId = guildData.welcome_channel;
        let channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) {
            channel = member.guild.channels.cache.find(
                ch =>
                    ch.type === 'GUILD_TEXT' &&
                    ch.permissionsFor(member.guild.me).has('SEND_MESSAGES')
            );
            await channel.send(customMessage);
        } else {
            const welcomeEmbed = new EmbedBuilder()
                .setTitle('Ho ! Un nouveau membre !')
                .setDescription(`Bienvenue sur ce serveur, ${member} ! 👐`)
                .setColor(guildData.botColor || '#f40076')
                .setImage('attachment://welcome-image.png');
                await channel.send({
                    embeds: [welcomeEmbed],
                    files: [{ attachment: imageBuffer, name: 'welcome-image.png' }] // L'image attachée
                });
        }
    }
}

module.exports = { userAdd };
