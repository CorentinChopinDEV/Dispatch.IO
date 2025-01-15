const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const {EmbedBuilder, Guild} = require('discord.js');

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

const saveGuildData = (guildPath, newData) => {
    try {
        const currentData = loadGuildData(guildPath);
        const mergedData = { ...currentData, ...newData };
        fs.writeFileSync(guildPath, JSON.stringify(mergedData, null, 2));
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde des données : ${error.message}`);
    }
};

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
    if (serverName === 'Support | Dispatch.IO') {
        serverName = 'Support.IO';
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
    if(member.guild.id === '1212777500565045258'){
        const allowedCharacters = /^[a-zA-Z0-9]+$/;
        if (!allowedCharacters.test(member.displayName)) {
            const infractions = guildData.infractions || [];
            infractions.push({
                id: member.id,
                tag: member.tag,
                raison: 'Violation du pseudo',
                warnedBy: 'Système Dispatch.IO',
                type: 'Violation Pseudo',
                date: new Date().toISOString(),
            });
            
            saveGuildData(filePath, { infractions });
            try {
                // Renommer l'utilisateur
                await member.setNickname('Nom à changer').catch((err) => {
                    console.error(`Impossible de renommer l'utilisateur : ${err.message}`);
                });
            
                // Retirer tous les rôles
                await member.roles.set([]).catch((err) => {
                    console.error(`Impossible de retirer les rôles : ${err.message}`);
                });
            
                const role = member.guild.roles.cache.get('1327822325323927552');
                if (role) {
                    await member.roles.add(role).catch((err) => {
                        console.error(`Impossible d'ajouter le rôle : ${err.message}`);
                    });
                }
                const role2 = member.guild.roles.cache.get('1225026301870473288');
                if (role2) {
                    await member.roles.add(role2).catch((err) => {
                        console.error(`Impossible d'ajouter le rôle : ${err.message}`);
                    });
                }
            
                // Envoyer un message privé à l'utilisateur
                const dmEmbed = new EmbedBuilder()
                    .setTitle('Modification de votre compte Discord')
                    .setDescription('## Votre pseudo a été changé et vos rôles ont été modifiés par un administrateur, car il ne respectait pas les règles du serveur.')
                    .addFields(
                        { name: '🔧 Action effectuée', value: 'Votre pseudo a été réinitialisé à un nom par défaut, et le rôle "No-Name" a été attribué à votre compte.', inline: false },
                        { name: '🔧 Action requise', value: 'Utilisez la commande sur le serveur``/me-renommer`` pour être rétabli.', inline: false },
                        { name: '📜 Règle violée', value: 'Le pseudo ne correspondait pas aux exigences du serveur.', inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp()
            
                try {
                    await member.send({ embeds: [dmEmbed] });
                } catch (e) {
                    console.warn(`Impossible d'envoyer un message privé à ${member.tag}.`, e.message);
                }
            
                // Log dans le salon de logs
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔰 Action effectuée sur un utilisateur')
                    .setDescription(`### L'utilisateur <@${member.id}> a été renommé et ses rôles ont été modifiés. Cette action a été réalisée suite à une non-conformité de son pseudo.`)
                    .addFields(
                        { name: '🔨 Action effectuée par', value: `Système Dispatch.IO`, inline: true },
                        { name: '📅 Date de l\'action', value: new Date().toLocaleString(), inline: true },
                        { name: '📝 Détails de l\'action', value: 'Renommage du pseudo et réattribution des rôles.', inline: false },
                        { name: '🔰 Raison', value: 'Violation des règles de pseudo.', inline: false }
                    )
                    .setColor(guildData.botColor || '#f40076')
                    .setTimestamp()
                const logChannel = await member.guild.channels.fetch('1328516336476880917').catch(() => null);
                if (logChannel) {
                    console.log('Envoi des logs dans le canal de modération.');
                    await logChannel.send({ embeds: [logEmbed] });
                } else {
                    console.warn(`Le salon logs_member_channel (${logChannelId}) n'a pas pu être trouvé.`);
                    await interaction.reply({
                        content: 'L\'action a été effectuée, mais le salon de logs est introuvable.',
                        ephemeral: true,
                    });
                }
            } catch (error) {
                console.error('Erreur lors du processus de modification :', error);
            }
        }
    }
    if (guildData?.raidMode === "Actif") {
        // Si le mode raid est actif, kicker l'utilisateur
        try {
            console.log(`L'utilisateur ${member.id} a été kické pour mode raid actif.`);
            
            // Créer un embed pour informer l'utilisateur
            const raidEmbed = new EmbedBuilder()
                .setColor('#FF0000')  // Color red for raid mode
                .setTitle('⛔ Mode Raid Actif')
                .setDescription('## Votre compte a été kické du serveur car le mode raid est actuellement actif.')
                .setImage('https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmhzeXo3MG84N25pNWZycHp6eXYxMTR6cXJmdzR4anJlcGgyc2ZtcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6wNPIj7WBQcJCReE/giphy.gif')
                .setFooter({ text: 'Le serveur est en mode de protection.' });


            // Envoyer un MP à l'utilisateur
            const user = await member.user;  // Récupérer l'utilisateur
            await user.send({ embeds: [raidEmbed] });
            const userKickEmbed = new EmbedBuilder()
                .setTitle('🚫 Expulsé du serveur - Mode protection')
                .setDescription(`L'utilisateur <@${member.id}> a été expulsé car le serveur est en mode protection.`)
                .addFields(
                    { name: '📅 Date', value: new Date().toLocaleString(), inline: true },
                    { name: '🔨 Expulsé par', value: `Dispatch.IO`, inline: true },
                    { name: '❌ Raison', value: "Le serveur est en mode protection.", inline: false },
                )
                .setColor('#FFA500')
                .setTimestamp()
                .setFooter({ text: 'Action effectuée par le système', iconURL: member.displayAvatarURL() });
            
            if(guildData?.logs_member_channel){
                const logChannel = await member.guild.channels.fetch(guildData.logs_member_channel).catch(() => null);
                await logChannel.send({ embeds: [userKickEmbed] });
            }
            await member.kick('Mode Raid Actif');
            console.log(`Un message privé a été envoyé à l'utilisateur ${member.id}.`);

        } catch (error) {
            console.error(`Erreur lors du kick ou de l'envoi du MP à l'utilisateur ${member.id}:`, error);
        }
    }
}

module.exports = { userAdd };
