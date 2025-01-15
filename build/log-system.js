const { Events, AuditLogEvent , PermissionsBitField } = require('discord.js');
const fs = require('fs');

class LogSystem {
    constructor() {
        this.guildConfigs = new Map();
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

    async sendLog(guild, content, type = 'edit') {
        const config = this.guildConfigs.get(guild.id) || this.loadGuildConfig(guild.id);
        if (!config) return;
    
        const channelId = type === 'edit' ? config.logs_edit_channel : config.logs_server_channel;
        if (!channelId) return;
    
        const logChannel = await guild.channels.fetch(channelId).catch(() => null);
        if (!logChannel) return;
    
        await logChannel.send({
            embeds: [{
                title: content.title,
                description: content.description,
                color: content.color || 0x3498db,
                fields: content.fields || [],
                timestamp: new Date(),
                thumbnail: {
                    url: content.thumbnail || guild.iconURL({ dynamic: true }) // Utilise content.thumbnail ou l'icône du serveur par défaut
                }
            }]            
        }).catch(console.error);
    }

    // Gestion des membres
    async handleMemberJoin(member) {
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        
        await this.sendLog(member.guild, {
            title: '👋 Nouveau membre',
            description: `### ${member.user.tag} a rejoint le serveur`,
            color: 0x2ecc71,
            fields: [
                { name: 'ID', value: `\`\`${member.id}\`\``, inline: false },
                { name: 'Compte créé il y a', value: `${accountAge} jours`, inline: false },
                { name: 'Bot', value: member.user.bot ? 'Oui' : 'Non', inline: false },
            ],
            thumbnail: member.user.displayAvatarURL({ dynamic: true })
        }, 'server');
    }

    async handleMemberLeave(member) {
        const roles = member.roles.cache
            .filter(role => role.id !== member.guild.id)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'Aucun rôle';

        await this.sendLog(member.guild, {
            title: '👋 Membre parti',
            description: `### ${member.user.tag} a quitté le serveur`,
            color: 0xe74c3c,
            fields: [
                { name: 'ID', value: `\`\`${member.id}\`\``, inline: false },
                { name: 'A rejoint le', value: member.joinedAt?.toLocaleDateString() || 'Inconnu', inline: false },
                { name: 'Compte créé le', value: member.user.createdAt.toLocaleDateString(), inline: false },
                { name: 'Rôles', value: roles, inline: false },
                { name: 'Surnom', value: member.nickname || 'Aucun', inline: false }
            ],
            thumbnail: member.user.displayAvatarURL({ dynamic: true })
        }, 'server');
    }

    // Gestion des salons
    async handleChannelEvents(channel, action, oldChannel = null) {
        const actionTypes = {
            create: { title: '📝 Création de salon', color: 0x2ecc71 },
            delete: { title: '🗑️ Suppression de salon', color: 0xe74c3c },
            update: { title: '✏️ Modification de salon', color: 0xf1c40f }
        };

        const auditLogs = await channel.guild.fetchAuditLogs({
            type: action === 'create' ? AuditLogEvent.ChannelCreate :
                  action === 'delete' ? AuditLogEvent.ChannelDelete :
                  AuditLogEvent.ChannelUpdate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;
        const changes = [];

        if (action === 'update' && oldChannel) {
            if (oldChannel.name !== channel.name) {
                changes.push({ name: 'Nom', value: `${oldChannel.name} → ${channel.name}` });
            }
            if (oldChannel.type !== channel.type) {
                changes.push({ name: 'Type', value: `${oldChannel.type} → ${channel.type}` });
            }
            if (oldChannel.topic !== channel.topic) {
                changes.push({ name: 'Sujet', value: `${oldChannel.topic || 'Aucun'} → ${channel.topic || 'Aucun'}` });
            }
            if (oldChannel.nsfw !== channel.nsfw) {
                changes.push({ name: 'NSFW', value: `${oldChannel.nsfw} → ${channel.nsfw}` });
            }
            if (oldChannel.rateLimitPerUser !== channel.rateLimitPerUser) {
                changes.push({ name: 'Mode lent', value: `${oldChannel.rateLimitPerUser}s → ${channel.rateLimitPerUser}s` });
            }
        }

        await this.sendLog(channel.guild, {
            title: actionTypes[action].title,
            description: `### Salon ${action === 'delete' ? 'supprimé' : `<#${channel.id}>`}`,
            color: actionTypes[action].color,
            fields: [
                { name: 'Nom', value: channel.name, inline: true },
                { name: 'Type', value: channel.type, inline: true },
                { name: 'ID', value: `\`\`${channel.id}\`\``, inline: true },
                { name: 'Exécuté par', value: executor ? `<@${executor.id}> \`\`${executor.id}\`\`` : 'Inconnu', inline: false },
                ...(changes.length > 0 ? changes : [])
            ]
        }, 'edit');
    }

    // Gestion des rôles
    async handleRoleEvents(role, action, oldRole = null) {
        const actionTypes = {
            create: { title: '👑 Création de rôle', color: 0x2ecc71 },
            delete: { title: '🗑️ Suppression de rôle', color: 0xe74c3c },
            update: { title: '✏️ Modification de rôle', color: 0xf1c40f }
        };

        const auditLogs = await role.guild.fetchAuditLogs({
            type: action === 'create' ? AuditLogEvent.RoleCreate :
                  action === 'delete' ? AuditLogEvent.RoleDelete :
                  AuditLogEvent.RoleUpdate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;
        const changes = [];

        if (action === 'update' && oldRole) {
            if (oldRole.name !== role.name) {
                changes.push({ name: 'Nom', value: `${oldRole.name} → ${role.name}` });
            }
            if (oldRole.color !== role.color) {
                changes.push({ name: 'Couleur', value: `${oldRole.color.toString(16)} → ${role.color.toString(16)}` });
            }
            if (oldRole.hoist !== role.hoist) {
                changes.push({ name: 'Affiché séparément', value: `${oldRole.hoist} → ${role.hoist}` });
            }
            if (oldRole.mentionable !== role.mentionable) {
                changes.push({ name: 'Mentionnable', value: `${oldRole.mentionable} → ${role.mentionable}` });
            }
        }

        await this.sendLog(role.guild, {
            title: actionTypes[action].title,
            description: `### Rôle ${action === 'delete' ? role.name : `<@&${role.id}>`}`,
            color: actionTypes[action].color,
            fields: [
                { name: 'Nom', value: role.name, inline: true },
                { name: 'ID', value: `\`\`${role.id}\`\``, inline: true },
                { name: 'Couleur', value: `#${role.color.toString(16).padStart(6, '0')}`, inline: true },
                { name: 'Exécuté par', value: executor ? `<@${executor.id}> \`\`${executor.id}\`\`` : 'Inconnu', inline: false },
                ...(changes.length > 0 ? changes : [])
            ]
        }, 'edit');
    }

    // Gestion des modifications de permissions
    async handlePermissionUpdate(target, action, oldPermissions, newPermissions) {
        const changes = [];
        const isChannel = 'parent' in target;
    
        if (oldPermissions && newPermissions) {
            // Pour les permissions de salon
            if (isChannel) {
                // Récupérer toutes les overwrites
                const oldOverwrites = Array.from(oldPermissions.cache.values());
                const newOverwrites = Array.from(newPermissions.cache.values());
    
                // Comparer chaque overwrite
                for (const newOverwrite of newOverwrites) {
                    const oldOverwrite = oldOverwrites.find(o => o.id === newOverwrite.id);
                    if (!oldOverwrite) continue;
    
                    const oldAllow = oldOverwrite.allow;
                    const oldDeny = oldOverwrite.deny;
                    const newAllow = newOverwrite.allow;
                    const newDeny = newOverwrite.deny;
    
                    // Vérifier les changements de permissions
                    Object.keys(PermissionsBitField.Flags).forEach(perm => {
                        const flag = PermissionsBitField.Flags[perm];
                        const oldValue = oldAllow.has(flag) ? '✅' : (oldDeny.has(flag) ? '❌' : '➖');
                        const newValue = newAllow.has(flag) ? '✅' : (newDeny.has(flag) ? '❌' : '➖');
    
                        if (oldValue !== newValue) {
                            changes.push({
                                name: `${perm}`,
                                value: `${oldValue} → ${newValue}`,
                                inline: false
                            });
                        }
                    });
                }
            } 
            // Pour les permissions de rôle
            else {
                const oldPerms = oldPermissions;
                const newPerms = newPermissions;
    
                Object.keys(PermissionsBitField.Flags).forEach(perm => {
                    const flag = PermissionsBitField.Flags[perm];
                    if (oldPerms.has(flag) !== newPerms.has(flag)) {
                        changes.push({
                            name: perm,
                            value: `${oldPerms.has(flag) ? '✅' : '❌'} → ${newPerms.has(flag) ? '✅' : '❌'}`,
                            inline: false
                        });
                    }
                });
            }
        }
    
        if (changes.length > 0) {
            const auditLogs = await target.guild.fetchAuditLogs({
                type: isChannel ? AuditLogEvent.ChannelOverwriteUpdate : AuditLogEvent.RoleUpdate,
                limit: 1
            }).catch(() => null);
    
            const executor = auditLogs?.entries.first()?.executor;
    
            await this.sendLog(target.guild, {
                title: `🔒 Modifications des permissions ${isChannel ? 'du salon' : 'du rôle'}`,
                description: `### Modifications des permissions pour ${isChannel ? `<#${target.id}>` : `<@&${target.id}>`}`,
                color: 0xf1c40f,
                fields: [
                    { name: 'Nom', value: target.name, inline: false },
                    { name: 'ID', value: `\`\`${target.id}\`\``, inline: false },
                    { name: 'Modifié par', value: executor ? `<@${executor.id}> \`\`${executor.id}\`\`` : 'Inconnu', inline: false },
                    { name: '⎯'.repeat(20), value: '**Modifications des permissions**', inline: false },
                    ...changes
                ]
            }, 'edit');
        }
    }

    // Gestion des modifications du serveur
    async handleGuildUpdate(oldGuild, newGuild) {
        const changes = [];

        if (oldGuild.name !== newGuild.name) {
            changes.push({ name: 'Nom', value: `${oldGuild.name} → ${newGuild.name}` });
        }
        if (oldGuild.iconURL() !== newGuild.iconURL()) {
            changes.push({ name: 'Icône', value: 'L\'icône du serveur a été modifiée' });
        }
        if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
            changes.push({ name: 'Bannière', value: 'La bannière du serveur a été modifiée' });
        }
        if (oldGuild.description !== newGuild.description) {
            changes.push({ name: 'Description', value: `${oldGuild.description || 'Aucune'} → ${newGuild.description || 'Aucune'}` });
        }
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
            changes.push({ name: 'Niveau de vérification', value: `${oldGuild.verificationLevel} → ${newGuild.verificationLevel}` });
        }
        if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
            changes.push({ name: 'Filtre de contenu', value: `${oldGuild.explicitContentFilter} → ${newGuild.explicitContentFilter}` });
        }
        if (oldGuild.systemChannel !== newGuild.systemChannel) {
            changes.push({ name: 'Salon système', value: `${oldGuild.systemChannel || 'Aucun'} → ${newGuild.systemChannel || 'Aucun'}` });
        }
        if (oldGuild.afkChannel !== newGuild.afkChannel) {
            changes.push({ name: 'Salon AFK', value: `${oldGuild.afkChannel || 'Aucun'} → ${newGuild.afkChannel || 'Aucun'}` });
        }
        if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
            changes.push({ name: 'Délai AFK', value: `${oldGuild.afkTimeout}s → ${newGuild.afkTimeout}s` });
        }
        if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
            changes.push({ name: 'Langue', value: `${oldGuild.preferredLocale} → ${newGuild.preferredLocale}` });
        }
        if (oldGuild.premiumTier !== newGuild.premiumTier) {
            changes.push({ name: 'Niveau de boost', value: `${oldGuild.premiumTier} → ${newGuild.premiumTier}` });
        }

        if (changes.length > 0) {
            const auditLogs = await newGuild.fetchAuditLogs({
                type: AuditLogEvent.GuildUpdate,
                limit: 1
            }).catch(() => null);

            const executor = auditLogs?.entries.first()?.executor;

            await this.sendLog(newGuild, {
                title: '⚙️ Modifications du serveur',
                description: '### Le serveur a été modifié',
                color: 0xf1c40f,
                fields: [
                    ...changes,
                    { name: 'Modifié par', value: executor ? `<@${executor.id}> \`\`${executor.id}\`\`` : 'Inconnu', inline: false }
                ]
            }, 'server');
        }
    }

    // Gestion des messages
    async handleMessageDelete(message) {
        const auditLogs = await message.guild.fetchAuditLogs({
            type: AuditLogEvent.MessageDelete,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;
        let deletedBy = 'Supprimé par: BOT'
        if (executor && executor?.id && message.author?.id) {
            const deletedBy = executor && executor.id !== message.author.id ? 
            `\nSupprimé par: <@${executor.id}> \`\`${executor.id}\`\`` : '';
        }
        let userIdentifiant = 'Surement un BOT...';
        if(message.author?.id){
            userIdentifiant = `<@${message.author.id}>`;
        }

        await this.sendLog(message.guild, {
            title: '🗑️ Message supprimé',
            description: `### Message de ${userIdentifiant} supprimé dans <#${message.channel.id}>${deletedBy}`,
            color: 0xe74c3c,
            fields: [
                { name: 'Contenu', value: message.content || 'Aucun contenu texte', inline: false },
                { name: 'Auteur', value: `${userIdentifiant} \`\`${userIdentifiant}\`\``, inline: true },
                { name: 'Canal', value: `<#${message.channel.id}> \`\`${message.channel.id}\`\``, inline: true }
            ]
        }, 'edit');
    }

    async handleMessageUpdate(oldMessage, newMessage) {
        if (newMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        await this.sendLog(newMessage.guild, {
            title: '✏️ Message modifié',
            description: `### Message modifié dans <#${newMessage.channel.id}>`,
            color: 0xf1c40f,
            fields: [
                { name: 'Avant', value: oldMessage.content || 'Aucun contenu', inline: false },
                { name: 'Après', value: newMessage.content || 'Aucun contenu', inline: false },
                { name: 'Auteur', value: `<@${newMessage.author.id}> \`\`${newMessage.author.id}\`\``, inline: true },
                { name: 'Canal', value: `<#${newMessage.channel.id}> \`\`${newMessage.channel.id}\`\``, inline: true },
                { name: 'Lien', value: `[Aller au message](${newMessage.url})`, inline: false }
            ]
        }, 'edit');
    }

    // Initialisation des événements
    initialize(client) {
        // Événements des membres
        client.on(Events.GuildMemberAdd, member => this.handleMemberJoin(member));
        client.on('guildMemberRemove', async member => {
            console.log('leave guild')
            await this.handleMemberLeave(member);
        });

        // Événements des salons
        client.on(Events.ChannelCreate, channel => this.handleChannelEvents(channel, 'create'));
        client.on(Events.ChannelDelete, channel => this.handleChannelEvents(channel, 'delete'));
        client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
            this.handleChannelEvents(newChannel, 'update', oldChannel);
            if (oldChannel.permissionOverwrites !== newChannel.permissionOverwrites) {
                this.handlePermissionUpdate(newChannel, 'update', oldChannel.permissionOverwrites, newChannel.permissionOverwrites);
            }
        });

        // Événements des rôles
        client.on(Events.RoleCreate, role => this.handleRoleEvents(role, 'create'));
        client.on(Events.RoleDelete, role => this.handleRoleEvents(role, 'delete'));
        client.on(Events.RoleUpdate, (oldRole, newRole) => {
            this.handleRoleEvents(newRole, 'update', oldRole);
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                this.handlePermissionUpdate(newRole, 'update', oldRole.permissions, newRole.permissions);
            }
        });

        // Événements des messages
        client.on(Events.MessageDelete, message => this.handleMessageDelete(message));
        client.on(Events.MessageUpdate, (oldMessage, newMessage) => 
            this.handleMessageUpdate(oldMessage, newMessage));

        // Modifications du serveur
        client.on(Events.GuildUpdate, (oldGuild, newGuild) => 
            this.handleGuildUpdate(oldGuild, newGuild));
    }
}

module.exports = LogSystem;