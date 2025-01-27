const { Client, GatewayIntentBits, AuditLogEvent, Events, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

class AntiRaidSystem {
    constructor() {
        this.spamMap = new Map();
        this.joinedMembers = new Map();
        this.channelUpdateMap = new Map();
        this.roleUpdateMap = new Map();
        this.webhookMap = new Map();
        this.inviteMap = new Map();
        this.guildConfigs = new Map();
        this.linkRegex = /(https?:\/\/[^\s]+)/gi;
    }

    loadBannedWords() {
        try {
            const wordsPath = path.resolve(__dirname, 'word.json'); // Chemin absolu basé sur le fichier actuel
            if (fs.existsSync(wordsPath)) {
                const fileContent = fs.readFileSync(wordsPath, 'utf8');
                const word = JSON.parse(fileContent);
                const BannedWord = word.word;
                return BannedWord || [];
            } else {
                console.error('Le fichier word.json est introuvable.');
                return [];
            }
        } catch (error) {
            console.error('Erreur lors du chargement des mots interdits:', error);
            return [];
        }
    }

    loadGuildConfig(guildId) {
        try {
            const configPath = `./guilds-data/${guildId}.json`;
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.guildConfigs.set(guildId, config);
                return config;
            }
            return null;
        } catch (error) {
            console.error(`Erreur lors du chargement de la config pour la guild ${guildId}:`, error);
            return null;
        }
    }

    isWhitelisted(guildId, userId) {
        const config = this.loadGuildConfig(guildId);
        return config?.whitelist?.includes(userId) || false;
    }
    
    isAntiRaidEnabled(guildId) {
        const config = this.loadGuildConfig(guildId);
        return config?.antiRaid === "Actif";
    }

    async sendLog(guild, type, content, severity = 'raid') {
        const config = this.guildConfigs.get(guild.id) || this.loadGuildConfig(guild.id);
        if (!config) return;
    
        let channelId;
        switch (type) {
            case 'member': channelId = config.logs_member_channel; break;
            case 'server': channelId = config.logs_server_channel; break;
            case 'raid': channelId = config.logs_raid_channel; break;
            default: channelId = config.logs_raid_channel;
        }
    
        if (!channelId) return;
    
        const logChannel = await guild.channels.fetch(channelId).catch(() => null);
        if (!logChannel) return;
    
        const colors = {
            info: 0x3498db,
            warning: 0xf1c40f,
            danger: 0xFF0000
        };
    
        await logChannel.send({
            embeds: [{
                title: `🛡️ ${type.toUpperCase()} - ${content.title || 'Alerte'}`,
                description: content.description || content,
                color: colors[severity] || colors.danger,
                fields: content.fields || [],
                timestamp: new Date()
            }]
        }).catch(console.error);
    }

    hashLink(link) {
        return crypto.createHash('md5').update(link).digest('hex').substring(0, 8);
    }

    async handleLink(message) {
        if (!this.isAntiRaidEnabled(message.guild.id)) return false;
        if (this.isWhitelisted(message.guild.id, message.author.id)) return false;

        const links = message.content.match(this.linkRegex);
        if (!links) return false;
        const hashedContent = message.content.replace(this.linkRegex, (link) => {
            const hash = this.hashLink(link);
            return `[Lien Sécurisé: ${hash}]`;
        });

        try {
            await message.delete();
            await message.channel.send({
                embeds: [{
                    description: `## Message de ${message.author} modifié par sécurité !\n\`\`${hashedContent}\`\`\n### Les liens sont interdits.🚫`,
                    color: 0xFF0000
                }]
            });

            this.sendLog(message.guild, 'raid', {
                title: 'Lien Détecté et Modifié',
                description: `### Un message contenant des liens a été modifié.`,
                fields: [
                    { name: 'Auteur', value: `<@${message.author.id}> \`${message.author.id}\``, inline: true },
                    { name: 'Canal', value: `<#${message.channel.id}>`, inline: false },
                    { name: 'Message Original', value: message.content.substring(0, 1024) },
                    { name: 'Message Modifié', value: hashedContent.substring(0, 1024) }
                ]
            }, 'danger');

            return true;
        } catch (error) {
            console.error('Erreur lors du traitement du lien:', error);
            return false;
        }
    }

    async handleBannedWords(message) {
        this.bannedWords = this.loadBannedWords();
        if (!this.isAntiRaidEnabled(message.guild.id)) return false;
        if (this.isWhitelisted(message.guild.id, message.author.id)) return false;

        const content = message.content.toLowerCase();
        const foundBannedWords = this.bannedWords.filter(word => 
            content.includes(word.toLowerCase())
        );

        if (foundBannedWords.length > 0) {
            try {
                await message.delete();
                await message.author.send({
                    embeds: [{
                        title: "⚠️ Message Supprimé",
                        description: "# Votre message a été supprimé car il contenait du contenu interdit.",
                        color: 0xFF0000
                    }]
                }).catch(() => {});

                this.sendLog(message.guild, 'raid', {
                    title: 'Mots Interdits Détectés',
                    description: `### Un message contenant des mots interdits a été supprimé.`,
                    fields: [
                        { name: 'Auteur', value: `<@${message.author.id}> \`${message.author.id}\``, inline: false },
                        { name: 'Canal', value: `<#${message.channel.id}>`, inline: false },
                        { name: 'Mots Détectés', value: foundBannedWords.join(', ') },
                        { name: 'Message', value: message.content.substring(0, 1024) }
                    ]
                }, 'danger');

                return true;
            } catch (error) {
                console.error('Erreur lors du traitement des mots interdits:', error);
                return false;
            }
        }

        return false;
    }

    async handleMessage(message) {
        if (message.author.bot) return;
        if (!this.isAntiRaidEnabled(message.guild.id)) return;
        if (this.isWhitelisted(message.guild.id, message.author.id)) return;

        const hasBannedWords = await this.handleBannedWords(message);
        if (hasBannedWords) return;

        const hasLinks = await this.handleLink(message);
        if (hasLinks) return;

        const key = `${message.author.id}-${message.guild.id}`;
        const userMessages = this.spamMap.get(key) || [];
        const now = Date.now();
        const recentMessages = userMessages.filter(({ timestamp }) => now - timestamp < 5000);

        if (recentMessages.length >= 5) {
            message.member.send({
                embeds: [{
                    title: "⚠️ Avertissement Anti-Raid",
                    description: `# <@${message.author.id}>, \n **Vous êtes en train de spammer. Votre message a été supprimé.**`,
                    color: 0xff0004,
                }]
            });

            message.member.timeout(86400000, "Anti-Raid: SPAM detection ⚠️").catch(console.error);
            message.channel.bulkDelete(recentMessages.length).catch(console.error);

            this.sendLog(message.guild, 'raid', {
                title: 'Spam détecté',
                description: `### Utilisateur <@${message.author.id}> a été sanctionné pour spam.`,
                fields: [
                    { name: 'Utilisateur', value: `<@${message.author.id}> \`\`${message.author.id}\`\``, inline: false },
                    { name: 'Nombre de messages', value: recentMessages.length.toString(), inline: false },
                    { name: 'Type de sanction', value: '**Timeout de 24 Heures**', inline: false },
                    { name: 'Raison', value: '*5 messages envoyés en moins de 5 secondes ou contenu similaire détecté.*' }
                ]
            }, 'danger');

            this.spamMap.delete(key);
        } else {
            userMessages.push({ timestamp: now, content: message.content });
            this.spamMap.set(key, userMessages);
        }
    }

    async handleMemberJoin(member) {
        if (!this.isAntiRaidEnabled(member.guild.id)) return;
    
        const now = Date.now();
        const recentJoins = this.joinedMembers.get(member.guild.id) || [];
        recentJoins.push({ id: member.id, timestamp: now });
    
        const recentJoinsFiltered = recentJoins.filter(join => now - join.timestamp < 10000);
        this.joinedMembers.set(member.guild.id, recentJoinsFiltered);
    
        const accountAge = now - member.user.createdTimestamp;
        const suspiciousAccount = accountAge < 7 * 24 * 60 * 60 * 1000;
        const suspiciousFrenchCorp = accountAge < 60 * 24 * 60 * 60 * 1000;
    
        const frenchCorpGuildId = '1212777500565045258';
    
        if (recentJoinsFiltered.length >= 5 || suspiciousAccount || 
            (member.guild.id === frenchCorpGuildId && suspiciousFrenchCorp)) {
            
            if (!this.isWhitelisted(member.guild.id, member.id)) {
                member.guild.members.fetch()
                    .then(members => {
                        recentJoinsFiltered.forEach(join => {
                            const joinedMember = members.get(join.id);
                            if (joinedMember && !this.isWhitelisted(member.guild.id, joinedMember.id)) {
                                joinedMember.send({
                                    embeds: [{
                                        title: "⚠️ Alerts Anti-Raid",
                                        description: `# Vous êtes suspecté de RAID !!! Vous venez d'être expulsé de ce serveur.`,
                                        color: 0xff0004,
                                    }]
                                });
                                joinedMember.kick('Compte créé récemment (moins de 60 jours). La protection du serveur est en mode strict.');
                            }
                        });
                    });
    
                this.sendLog(member.guild, 'raid', {
                    title: 'Raid Détecté ⚠️',
                    description: 
                        member.guild.id === frenchCorpGuildId && suspiciousFrenchCorp 
                        ? '### Un compte suspect (moins de 60 jours) a été exclue automatiquement.'
                        : '### Une activité suspecte a été détectée.',
                    fields: [
                        { name: 'Nombre de joins', value: recentJoinsFiltered.length.toString() },
                        { name: 'Âge du compte', value: `${Math.floor(accountAge / (24 * 60 * 60 * 1000))} jours` },
                        { name: 'Membre', value: `${member.user.tag} \`${member.user.id}\``, inline: true },
                        { name: 'Compte créé le', value: member.user.createdAt.toLocaleDateString(), inline: true },
                        { name: 'Raison', value: 
                            member.guild.id === frenchCorpGuildId && suspiciousFrenchCorp 
                            ? 'Compte créé récemment, moins de 60 jours (Restriction LSPDFR French Corporation).' 
                            : suspiciousAccount 
                            ? 'Compte créé récemment, moins de 7 jours.' 
                            : 'Plus de 5 joins rapides détectés.'
                        }
                    ]
                }, 'danger');
            }
        }
    }

    async handleBotAdd(guild, member) {
        if (!this.isAntiRaidEnabled(guild.id)) return;
        if (!member.user.bot) return;
    
        await member.kick('Bot non autorisé détecté. ⛔').catch((error) => {
            console.error('Erreur lors de l\'expulsion du bot :', error);
        });

        this.sendLog(guild, 'raid', {
            title: 'Bot Non Autorisé Détecté',
            description: `### Le bot <@${member.user.id}> a été ajouté mais il n\'est pas autorisé.`,
            fields: [
                { name: 'Bot ajouté', value: member.user.tag, inline: true },
                { name: 'ID du Bot', value: member.user.id, inline: true },
                { name: 'Action', value: 'Bot expulsé' }
            ]
        }, 'danger');
    
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.BotAdd,
            limit: 1
        }).catch((err) => {
            console.error('Erreur lors de la récupération des logs d\'audit:', err);
            return null;
        });
    
        if (!auditLogs) return;
    
        const botLog = auditLogs.entries.first();
        if (!botLog) return;
    
        const executor = await guild.members.fetch(botLog.executor.id).catch(() => null);
        if (!executor) return;
    
        if (!executor.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !this.isWhitelisted(guild.id, executor.id)) {
    
            this.sendLog(guild, 'raid', {
                title: 'Bot Non Autorisé Détecté',
                description: `### Le bot ${member.user.tag} a été ajouté par ${botLog.executor.tag}, mais il n\'est pas autorisé.`,
                fields: [
                    { name: 'Bot ajouté', value: member.user.tag, inline: true },
                    { name: 'ID du Bot', value: member.user.id, inline: true },
                    { name: 'Ajouté par', value: botLog.executor.tag, inline: true },
                    { name: 'ID de l\'ajouteur', value: botLog.executor.id, inline: true },
                    { name: 'Permissions de l\'ajouteur', value: executor.permissions.has(PermissionsBitField.Flags.Administrator) ? 'Administrateur' : 'Non Administrateur', inline: true },
                    { name: 'Action', value: 'Bot expulsé' }
                ]
            }, 'danger');
        }
    }

    async handleChannelCreate(channel) {
        if (!this.isAntiRaidEnabled(channel.guild.id)) return;

        const now = Date.now();
        const recentChannels = this.channelUpdateMap.get(channel.guild.id) || [];
        recentChannels.push(now);

        const recentChannelsFiltered = recentChannels.filter(timestamp => now - timestamp < 10000);
        this.channelUpdateMap.set(channel.guild.id, recentChannelsFiltered);

        const auditLogs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 1
        });
        const executor = auditLogs.entries.first()?.executor;

        if (recentChannelsFiltered.length >= 3) {
            if (executor && !this.isWhitelisted(channel.guild.id, executor.id)) {
                const member = await channel.guild.members.fetch(executor.id).catch(() => null);
                
                try {
                    await member.roles.set([]);
                } catch (error) {
                    console.error("Erreur lors du retrait des rôles :", error);
                }

                channel.delete().catch(console.error);
                
                executor.send({
                    embeds: [{
                        title: "⚠️ Alerts création massive de canaux détectée",
                        description: `## Vous avez créer des salons trop rapidement.`,
                        color: 0xff0004,
                    }]
                });

                this.sendLog(channel.guild, 'raid', {
                    title: 'Création massive de canaux détectée',
                    description: `## <@${executor.id}> a créé trop de canaux rapidement.`,
                    fields: [
                        { name: 'Action', value: 'Rôles retirés et canal supprimé' },
                        { name: 'Canal', value: channel.name, inline: true },
                        { name: 'Créé par', value: `<@${executor.id}> \`\`${executor.id}\`\``, inline: true }
                    ]
                }, 'danger');
            }
        }
    }

    async handleGuildBanAdd(ban) {
        if (!this.isAntiRaidEnabled(ban.guild.id)) return;

        const auditLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 5
        });

        const recentBans = auditLogs.entries.filter(entry => 
            Date.now() - entry.createdTimestamp < 10000
        );

        if (recentBans.size >= 2) {
            const executor = recentBans.first().executor;
            if (!this.isWhitelisted(ban.guild.id, executor.id)) {
                const member = await ban.guild.members.fetch(executor.id).catch(() => null);
                member.roles.set([]).catch(console.error);
                
                recentBans.forEach(banEntry => {
                    ban.guild.members.unban(banEntry.target.id, 'Annulation de mass ban')
                        .catch(console.error);
                });

                member.send({
                    embeds: [{
                        title: "⛔ Trop de ban détecté.",
                        description: `## Vous avez banni trop de membres rapidement.`,
                        color: 0xff0004,
                    }]
                });

                this.sendLog(ban.guild, 'raid', {
                    title: 'Mass Ban Détecté',
                    description: `### <@${executor.id}> a banni trop de membres rapidement.`,
                    fields: [
                        { name: 'Nombre de bans', value: recentBans.size.toString() },
                        { name: 'Action', value: 'Rôles retirés et bans annulés' }
                    ]
                }, 'danger');
            }
        }
    }

    async handleWebhookUpdate(channel) {
        if (!this.isAntiRaidEnabled(channel.guild.id)) return;

        const now = Date.now();
        const recentWebhooks = this.webhookMap.get(channel.guild.id) || [];
        recentWebhooks.push(now);

        const recentWebhooksFiltered = recentWebhooks.filter(timestamp => now - timestamp < 10000);
        this.webhookMap.set(channel.guild.id, recentWebhooksFiltered);

        if (recentWebhooksFiltered.length >= 3) {
            const webhooks = await channel.fetchWebhooks();
            const auditLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.WebhookCreate,
                limit: 1
            });
            const executor = auditLogs.entries.first()?.executor;

            if (executor && !this.isWhitelisted(channel.guild.id, executor.id)) {
                webhooks.forEach(webhook => webhook.delete('Protection anti-raid').catch(console.error));
                
                const member = await channel.guild.members.fetch(executor.id).catch(() => null);
                member.roles.set([]).catch(console.error);

                member.send({
                    embeds: [{
                        title: "Anti-Raid - Création massive de webhooks détectée. ⛔",
                        description: `## Vous avez créé trop de webhooks rapidement.`,
                        color: 0xff0004,
                    }]
                });

                this.sendLog(channel.guild, 'raid', {
                    title: 'Anti-Raid - Création massive de webhooks détectée. ⛔',
                    description: `### <@${executor.id}> a créé trop de webhooks rapidement.`,
                    fields: [
                        { name: 'Action', value: 'Webhooks supprimés et rôles retirés' }
                    ]
                }, 'danger');
            }
        }
    }

    async handleInviteCreate(invite) {
        if (!this.isAntiRaidEnabled(invite.guild.id)) return;

        const now = Date.now();
        const recentInvites = this.inviteMap.get(invite.guild.id) || [];
        recentInvites.push({ timestamp: now, code: invite.code });

        const recentInvitesFiltered = recentInvites.filter(inv => now - inv.timestamp < 10000);
        this.inviteMap.set(invite.guild.id, recentInvitesFiltered);

        if (recentInvitesFiltered.length >= 5) {
            const member = await invite.guild.members.fetch(invite.inviter.id).catch(() => null);
            
            if (member && !this.isWhitelisted(invite.guild.id, member.id) && 
                !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                
                recentInvitesFiltered.forEach(inv => {
                    invite.guild.invites.delete(inv.code).catch(console.error);
                });

                member.roles.set([]).catch(console.error);

                member.send({
                    embeds: [{
                        title: "Anti-Raid - Création massive d'invitations détectée. ⛔",
                        description: `## Vous avez créé trop d'invitations rapidement.`,
                        color: 0xff0004,
                    }]
                });

                this.sendLog(invite.guild, 'raid', {
                    title: 'Création massive d\'invitations détectée',
                    description: `### <@${member.user.id}> a créé trop d'invitations rapidement.`,
                    fields: [
                        { name: 'Nombre d\'invitations', value: recentInvitesFiltered.length.toString() },
                        { name: 'Action', value: 'Invitations supprimées et rôles retirés' }
                    ]
                }, 'warning');
            }
        }
    }

    async handleGuildUpdate(oldGuild, newGuild) {
        if (!this.isAntiRaidEnabled(newGuild.id)) return;

        const auditLogs = await newGuild.fetchAuditLogs({
            type: AuditLogEvent.GuildUpdate,
            limit: 1
        }).catch(() => null);

        if (!auditLogs) return;
        const updateLog = auditLogs.entries.first();
        if (!updateLog) return;

        const changes = [];
        let criticalChange = false;
        
        if (oldGuild.name !== newGuild.name) {
            changes.push({ name: 'Nom du serveur', old: oldGuild.name, new: newGuild.name });
            criticalChange = true;
        }
        if (oldGuild.iconURL() !== newGuild.iconURL()) {
            changes.push({ name: 'Icône du serveur', old: 'Ancienne icône', new: 'Nouvelle icône' });
        }
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
            changes.push({ name: 'Niveau de vérification', old: oldGuild.verificationLevel, new: newGuild.verificationLevel });
            criticalChange = true;
        }
        if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
            changes.push({ name: 'Filtre de contenu', old: oldGuild.explicitContentFilter, new: newGuild.explicitContentFilter });
            criticalChange = true;
        }

        if (changes.length > 0) {
            const executor = updateLog.executor;
            if (!this.isWhitelisted(newGuild.id, executor.id)) {
                if (criticalChange) {
                    const member = await newGuild.members.fetch(executor.id).catch(() => null);
                    member.roles.set([]).catch(console.error);
                    
                    if (oldGuild.name !== newGuild.name) {
                        newGuild.setName(oldGuild.name).catch(console.error);
                    }
                    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                        newGuild.setVerificationLevel(oldGuild.verificationLevel).catch(console.error);
                    }
                    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                        newGuild.setExplicitContentFilter(oldGuild.explicitContentFilter).catch(console.error);
                    }
                }
    
                this.sendLog(newGuild, 'server', {
                    title: 'Modifications du Serveur',
                    description: `### Modifications effectuées par <@${executor.tag}>`,
                    fields: [
                        ...changes.map(change => ({
                            name: change.name,
                            value: `${change.old} → ${change.new}`
                        })),
                        { name: 'Whitelisté', value: 'Non' }
                    ]
                }, criticalChange ? 'danger' : 'warning');
            }
        }
    }

    initialize(client) {
        client.on(Events.MessageCreate, (message) => {
            this.handleMessage(message);
            this.handleLink(message);
            this.handleBannedWords(message);
        });

        client.on(Events.GuildMemberAdd, (member) => {
            this.handleMemberJoin(member);
            if (member.user.bot) {
                this.handleBotAdd(member.guild, member);
            }
        });

        client.on(Events.ChannelCreate, (channel) => {
            this.handleChannelCreate(channel);
        });

        client.on(Events.GuildBanAdd, (ban) => {
            this.handleGuildBanAdd(ban);
        });

        client.on(Events.WebhooksUpdate, (channel) => {
            this.handleWebhookUpdate(channel);
        });

        client.on(Events.InviteCreate, (invite) => {
            this.handleInviteCreate(invite);
        });

        client.on(Events.GuildUpdate, (oldGuild, newGuild) => {
            this.handleGuildUpdate(oldGuild, newGuild);
        });
    }
}

module.exports = AntiRaidSystem;