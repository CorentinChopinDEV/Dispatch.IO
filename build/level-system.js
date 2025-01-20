const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

class LevelingSystem {
    constructor(client) {
        this.client = client;
        this.cache = new Map();
        this.voiceStates = new Map();
        this.cooldowns = new Map();
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        const dir = path.join(process.cwd(), 'guilds-data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    getGuildDataPath(guildId) {
        return path.join(process.cwd(), 'guilds-data', `${guildId}.json`);
    }

    loadGuildData(guildId) {
        if (!guildId) {
            console.error('GuildId is undefined in loadGuildData');
            return { users: {}, level_channel: null };
        }

        try {
            if (this.cache.has(guildId)) {
                return this.cache.get(guildId);
            }

            const filePath = this.getGuildDataPath(guildId);
            let data = { users: {}, level_channel: null };

            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                data = JSON.parse(fileContent);
                
                if (!data.users) data.users = {};
                if (!data.level_channel) data.level_channel = null;
            }

            this.cache.set(guildId, data);
            return data;
        } catch (error) {
            console.error(`Error loading guild data for ${guildId}:`, error);
            return { users: {}, level_channel: null };
        }
    }

    saveGuildData(guildId, data) {
        if (!guildId || !data) {
            console.error('Missing guildId or data in saveGuildData');
            return;
        }

        try {
            const filePath = this.getGuildDataPath(guildId);
            
            if (!data.users) data.users = {};
            if (!data.level_channel) data.level_channel = null;
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            this.cache.set(guildId, data);
        } catch (error) {
            console.error(`Error saving guild data for ${guildId}:`, error);
        }
    }

    calculateLevel(xp) {
        return Math.floor(Math.sqrt(xp / 100));  // On utilise la racine carrée pour rendre la montée en niveau moins linéaire
    }
    
    // Fonction pour calculer l'XP nécessaire pour atteindre le prochain niveau
    calculateXpForNextLevel(level) {
        // Chaque niveau suivant nécessite 100 * (niveau + 1) d'XP supplémentaires
        return Math.floor((Math.pow(level + 1, 2)) * 100);  // Formule exponentielle pour un défi croissant
    }

    async addXP(guildId, userId, xpToAdd) {
        if (!guildId || !userId) {
            console.error('Missing guildId or userId in addXP');
            return null;
        }

        try {
            const data = this.loadGuildData(guildId);
            if (!data.users[userId]) {
                data.users[userId] = {
                    xp: 0,
                    level: 0,
                    lastMessage: Date.now()
                };
            }

            const user = data.users[userId];
            const oldLevel = this.calculateLevel(user.xp);
            user.xp += xpToAdd;
            const newLevel = this.calculateLevel(user.xp);

            this.saveGuildData(guildId, data);
            return { leveledUp: newLevel > oldLevel, newLevel, oldLevel };
        } catch (error) {
            console.error('Error in addXP:', error);
            return null;
        }
    }

    async handleMessage(message) {
        if (!message?.guild?.id || !message?.author?.id || message.author.bot) return;

        const now = Date.now();
        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const cooldown = this.cooldowns.get(cooldownKey) || 0;

        if (now - cooldown < 2000) return;

        try {
            this.cooldowns.set(cooldownKey, now);
            const xpGained = Math.floor(Math.random() * 11) + 15; // 15-25 XP
            
            const result = await this.addXP(message.guild.id, message.author.id, xpGained);
            
            if (result?.leveledUp) {
                try {
                    const data = this.loadGuildData(message.guild.id);
                    const guildData = this.loadGuildData(message.guild.id);
                    if (!data.level_channel) return;

                    const levelChannel = await message.guild.channels.fetch(data.level_channel);
                    if (!levelChannel) return;

                    const canvas = await this.createLevelUpCanvas(message.author, result.newLevel, guildData);
                    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
                    const levelUpEmbed = new EmbedBuilder()
                        .setTitle(`🎉 Félicitations !`)
                        .setDescription(`*Tu as atteint le niveau ${result.newLevel} !*`)
                        .setColor(guildData.botColor || '#f40076')
                        .setTimestamp()
                        .setImage('attachment://rank.png'); // Lien vers l'image attachée
                
                    // Envoyer l'embed avec l'image
                    await levelChannel.send({
                        content: `### <@${message.author.id}>\n`,
                        embeds: [levelUpEmbed],
                        files: [attachment]
                    });
                } catch (error) {
                    console.error('Error sending level up message:', error);
                }
            }
        } catch (error) {
            console.error('Error in handleMessage:', error);
        }
    }

    startVoiceTimer(member) {
        if (!member?.guild?.id || !member?.id || member.user.bot) return;
    
        this.voiceStates.set(member.id, {
            startTime: Date.now(),
            interval: setInterval(async () => {
                const result = await this.addXP(member.guild.id, member.id, 20);
    
                if (result?.leveledUp) {
                    try {
                        const data = this.loadGuildData(member.guild.id);
                        const guildData = this.loadGuildData(member.guild.id);
                        if (!data.level_channel) return;
    
                        const levelChannel = await member.guild.channels.fetch(data.level_channel);
                        if (!levelChannel) return;
    
                        const canvas = await this.createLevelUpCanvas(member.user, result.newLevel, guildData);
                        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
                        const levelUpEmbed = new EmbedBuilder()
                            .setTitle(`🎉 Félicitations !`)
                            .setDescription(`*Tu as atteint le niveau ${result.newLevel} !*`)
                            .setColor(guildData.botColor || '#f40076')
                            .setTimestamp()
                            .setImage('attachment://rank.png'); // Lien vers l'image attachée
                        
                        // Envoyer l'embed avec l'image
                        await levelChannel.send({
                            content: `### <@${member.id}>\n`,
                            embeds: [levelUpEmbed],
                            files: [attachment]
                        });
                    } catch (error) {
                        console.error('Erreur lors de l\'envoi du message de montée de niveau :', error);
                    }
                }
            }, 60000) // Ajouter de l'XP toutes les 60 secondes
        });
    }    

    stopVoiceTimer(member) {
        if (!member?.id) return;
        
        const state = this.voiceStates.get(member.id);
        if (state) {
            clearInterval(state.interval);
            this.voiceStates.delete(member.id);
        }
    }

    async createLevelUpCanvas(user, level, guildData, xpSee) {
        if (!user) throw new Error('User is required for canvas generation');
    
        const canvas = createCanvas(700, 250);
        const ctx = canvas.getContext('2d');
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
            avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
        } catch (error) {
            console.error(`Erreur lors du chargement de l'avatar de ${user.username} :`, error);
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
        ctx.strokeStyle = guildData.botColor || '#f40076'; // Couleur de contour
        ctx.stroke();
        ctx.closePath();
    
        // Ajouter le texte de niveau
        ctx.font = 'bold 40px Poppins'; // Police moderne pour le niveau
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`Niveau ${level}!`, 470, 90);

        ctx.font = 'bold 40px Poppins'; // Nom du serveur en gras
        ctx.fillText(user.tag, 470, 185);
    
        let xpSee2 = xpSee;
        if(!xpSee){
            xpSee2 = 'Félicitations ! 😎'
        }
        // Ajouter le texte secondaire pour le tag de l'utilisateur
        ctx.font = 'italic 28px Poppins'; // Texte secondaire
        ctx.fillText(xpSee2, 470, 137);
    
        return canvas;
    }    

    async getRank(interaction, guildData) {
        if (!interaction?.guildId || !interaction?.user) {
            return interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        }

        const data = this.loadGuildData(interaction.guildId);
        const userData = data.users[interaction.user.id] || { xp: 0, level: 0 };
        const currentLevel = this.calculateLevel(userData.xp);
        const nextLevelXP = this.calculateXpForNextLevel(currentLevel);
        const xpSee = `XP: ${userData.xp}/${nextLevelXP}`;
        
        try {
            const canvas = await this.createLevelUpCanvas(interaction.user, currentLevel, guildData, xpSee);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        
            // Créer l'embed avec les informations de niveau
            const levelUpEmbed = new EmbedBuilder()
                .setTitle('Votre niveau actuelle ! 🌐')
                .setDescription(`**Niveau:** ${currentLevel}\n**XP:** ${userData.xp}/${nextLevelXP}`)
                .setColor(guildData.botColor || '#f40076')
                .setTimestamp()
                .setImage('attachment://rank.png'); // Lien vers l'image attachée
        
            // Envoyer l'embed avec l'image
            await interaction.reply({
                content: `<@${interaction.user.id}>`,
                embeds: [levelUpEmbed],
                files: [attachment] // L'image attachée
            });
        } catch (error) {
            console.error('Error generating rank:', error);
            // Si une erreur se produit, envoi d'une réponse simple
            await interaction.reply({
                content: `Niveau: ${currentLevel}\nXP: ${userData.xp}/${nextLevelXP}`,
                ephemeral: true
            });
        }
    }

    async getLeaderboard(interaction) {
        if (!interaction?.guildId) {
            return interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true });
        }

        const data = this.loadGuildData(interaction.guildId);
        const sortedUsers = Object.entries(data.users)
            .sort(([, a], [, b]) => b.xp - a.xp)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 Classement')
            .setColor('#0099ff');

        try {
            let description = '';
            for (const [userId, userData] of sortedUsers) {
                try {
                    const user = await interaction.client.users.fetch(userId);
                    const level = this.calculateLevel(userData.xp);
                    const nextLevelXP = this.calculateXpForNextLevel(level);
                    description += `${user.tag} - Niveau ${level} (${userData.xp}/${nextLevelXP} XP)\n`;
                } catch (error) {
                    console.error(`Error fetching user ${userId}:`, error);
                    description += `Utilisateur inconnu - Niveau ${this.calculateLevel(userData.xp)} (${userData.xp} XP)\n`;
                }
            }

            embed.setDescription(description || 'Aucune donnée disponible');
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error generating leaderboard:', error);
            await interaction.reply({ 
                content: 'Une erreur est survenue lors de la génération du classement.', 
                ephemeral: true 
            });
        }
    }

    async resetLevels(interaction) {
        if (!interaction?.guildId || !interaction?.member?.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'Vous n\'avez pas la permission de faire cela.', 
                ephemeral: true 
            });
        }

        const data = this.loadGuildData(interaction.guildId);
        data.users = {};
        this.saveGuildData(interaction.guildId, data);
        await interaction.reply('Les niveaux ont été réinitialisés.');
    }

    async modifyXP(interaction, targetUser, amount, operation = 'add') {
        if (!interaction?.guildId || !interaction?.member?.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: 'Vous n\'avez pas la permission de faire cela.', 
                ephemeral: true 
            });
        }

        if (!targetUser || typeof amount !== 'number') {
            return interaction.reply({ 
                content: 'Utilisateur ou montant invalide.', 
                ephemeral: true 
            });
        }

        const data = this.loadGuildData(interaction.guildId);
        if (!data.users[targetUser.id]) {
            data.users[targetUser.id] = { xp: 0, level: 0 };
        }

        if (operation === 'add') {
            data.users[targetUser.id].xp += amount;
        } else {
            data.users[targetUser.id].xp = Math.max(0, data.users[targetUser.id].xp - amount);
        }

        this.saveGuildData(interaction.guildId, data);
        await interaction.reply(`XP ${operation === 'add' ? 'ajouté' : 'retiré'} avec succès.`);
    }
}

module.exports = LevelingSystem;