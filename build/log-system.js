const { Events, AuditLogEvent, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const PERMISSIONS_TRANSLATIONS = {
    CreateInstantInvite: "Créer une invitation instantanée",
    ManageChannels: "Gérer les salons",
    AddReactions: "Ajouter des réactions",
    ViewChannel: "Voir le salon",
    SendMessages: "Envoyer des messages",
    SendTTSMessages: "Envoyer des messages TTS",
    ManageMessages: "Gérer les messages",
    EmbedLinks: "Intégrer des liens",
    AttachFiles: "Joindre des fichiers",
    ReadMessageHistory: "Voir l'historique des messages",
    MentionEveryone: "Mentionner tout le monde",
    UseExternalEmojis: "Utiliser des émojis externes",
    ManageRoles: "Gérer les rôles",
    ManageWebhooks: "Gérer les webhooks",
    UseApplicationCommands: "Utiliser des commandes d'application",
    ManageThreads: "Gérer les fils",
    CreatePublicThreads: "Créer des fils publics",
    CreatePrivateThreads: "Créer des fils privés",
    UseExternalStickers: "Utiliser des stickers externes",
    SendMessagesInThreads: "Envoyer des messages dans les fils",
    UseEmbeddedActivities: "Utiliser les activités intégrées",
    SendVoiceMessages: "Envoyer des messages vocaux",
    SendPolls: "Envoyer des sondages",
    UseExternalApps: "Utiliser des applications externes",
};

function translatePermission(permission) {
    return PERMISSIONS_TRANSLATIONS[permission] || permission;
}
class LogSystem {
    constructor() {
        this.guildConfigs = new Map();
        this.voiceStates = new Map();
        this.messageCache = new Map();
        console.log('LogSystem initialized');
    }

    loadGuildConfig(guildId) {
        try {
            const configPath = path.join(process.cwd(), 'guilds-data', `${guildId}.json`);
            console.log(`Attempting to load config from: ${configPath}`);

            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.guildConfigs.set(guildId, config);
                console.log(`Successfully loaded config for guild: ${guildId}`);
                return config;
            }
            console.log(`No config file found for guild: ${guildId}`);
            return null;
        } catch (error) {
            console.error(`Error loading config for guild ${guildId}:`, error);
            return null;
        }
    }
    
    // Fonction pour traduire les permissions

    getLogColor(guild, type) {
        const config = this.guildConfigs.get(guild.id) || this.loadGuildConfig(guild.id);
        if (!config?.colors?.[type]) {
            const defaultColors = {
                create: 0xf40076,
                delete: 0xff0000,
                update: 0xf40076,
                voice: 0xf40076,
                thread: 0xf40076,
                emoji: 0xf40076,
                message: 0xf40076,
                member: 0xf40076,
                role: 0xff0000,
                channel: 0xff0000
            };
            return defaultColors[type] || 0x7289da;
        }
        return parseInt(config.colors[type], 16);
    }

    createBaseEmbed(guild, type) {
        return new EmbedBuilder()
            .setColor(this.getLogColor(guild, type))
            .setTimestamp()
            .setFooter({ 
                text: guild.name, 
                iconURL: guild.iconURL({ dynamic: true }) 
            });
    }

    async sendLog(guild, options, type = 'edit') {
        console.log(`Attempting to send log for guild: ${guild.id}, type: ${type}`);
        
        const config = this.guildConfigs.get(guild.id) || this.loadGuildConfig(guild.id);
        if (!config) {
            console.log(`No config found for guild ${guild.id}`);
            return;
        }

        const channelId = type === 'edit' ? config.logs_edit_channel : config.logs_server_channel;
        if (!channelId) {
            console.log(`No log channel configured for type ${type} in guild ${guild.id}`);
            return;
        }

        try {
            const logChannel = await guild.channels.fetch(channelId);
            if (!logChannel) {
                console.log(`Could not fetch log channel ${channelId}`);
                return;
            }

            console.log(`Creating embed for log in guild ${guild.id}`);
            const embed = this.createBaseEmbed(guild, options.logType)
                .setTitle(options.title)
                .setDescription(options.description);

            if (options.fields?.length > 0) {
                embed.addFields(options.fields);
            }

            if (options.thumbnail) {
                embed.setThumbnail(options.thumbnail);
            }

            if (options.image) {
                embed.setImage(options.image);
            }

            if (options.author) {
                embed.setAuthor(options.author);
            }

            await logChannel.send({ embeds: [embed] });
            console.log(`Successfully sent log to channel ${channelId}`);
        } catch (error) {
            console.error(`Error sending log to guild ${guild.id}:`, error);
        }
    }

    // Messages
    async handleMessageDelete(message) {
        // if (!message.guild || message.author?.bot) return;
        console.log(`Message delete event triggered in guild: ${message.guild.id}`);

        try {
            const auditLogs = await message.guild.fetchAuditLogs({
                type: AuditLogEvent.MessageDelete,
                limit: 1
            });

            const deleteLog = auditLogs.entries.first();
            const deletedBy = `\n📝 __**Supprimé par:**__\n<@${deleteLog.executorId}> (\`${deleteLog.executorId}\`)`

            const attachments = message.attachments.size > 0
                ? message.attachments.map(a => `[${a.name}](${a.url})`).join('\n')
                : null;
            const authorId = message.author?.id || 'bot';

            const fields = [
                { 
                    name: '👤 Auteur', 
                    value: authorId === 'bot' ? 'Bot' : `<@${authorId}> (\`${authorId}\`)`, 
                    inline: false 
                },
                { 
                    name: '📍 Canal', 
                    value: `<#${message.channel.id}> (\`${message.channel.id}\`)`, 
                    inline: false 
                }
];

            if (message.content) {
                fields.push({ name: '📄 Contenu', value: message.content.slice(0, 1024), inline: false });
            }

            if (attachments) {
                fields.push({ name: '📎 Pièces jointes', value: attachments, inline: false });
            }

            await this.sendLog(message.guild, {
                title: '🗑️ Message supprimé',
                description: `## Un message a été supprimé 🗑️\n\n${deletedBy}`,
                logType: 'message',
                fields,
            }, 'edit');
        } catch (error) {
            console.error('Error handling message delete:', error);
        }
    }

    async handleMessageUpdate(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
        console.log(`Message update event triggered in guild: ${newMessage.guild.id}`);

        try {
            const fields = [
                { name: '👤 Auteur', value: `<@${newMessage.author.id}> \n(\`${newMessage.author.id}\`)`, inline: true },
                { name: '📍 Canal', value: `<#${newMessage.channel.id}> \n(\`${newMessage.channel.id}\`)`, inline: true },
                { name: '🔗 Message', value: `[Voir le message](${newMessage.url})`, inline: true },
                { name: '📝 Avant', value: oldMessage.content || '*Aucun contenu*', inline: false },
                { name: '📝 Après', value: newMessage.content || '*Aucun contenu*', inline: false }
            ];

            await this.sendLog(newMessage.guild, {
                title: '✏️ Message modifié',
                description: `## Un message a été modifié ✏️`,
                logType: 'message',
                fields,
                author: {
                    name: newMessage.author.tag,
                    iconURL: newMessage.author.displayAvatarURL({ dynamic: true })
                }
            }, 'edit');
        } catch (error) {
            console.error('Error handling message update:', error);
        }
    }

    // Membres
    async handleMemberJoin(member) {
        console.log(`Member join event triggered in guild: ${member.guild.id}`);
        try { 
            const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
            const accountCreated = new Date(member.user.createdTimestamp).toLocaleString();
            
            const fields = [
                { name: '👤 Membre', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                { name: '🎂 Compte créé', value: `${accountCreated}\n(il y a ${accountAge} jours)`, inline: true },
                { name: '🤖 Bot', value: member.user.bot ? 'Oui' : 'Non', inline: true }
            ];

            await this.sendLog(member.guild, {
                title: '📥 Nouveau membre',
                description: `### ${member.user.tag} a rejoint le serveur`,
                logType: 'member',
                fields,
                thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 })
            }, 'server');
        } catch (error) {
            console.error('Error handling member join:', error);
        }
    }

    async handleMemberLeave(member) {
        console.log(`Member leave event triggered in guild: ${member.guild.id}`);
        try {
            const roles = member.roles.cache
                .filter(role => role.id !== member.guild.id)
                .map(role => `<@&${role.id}>`)
                .join(', ') || '*Aucun rôle*';

            const joinedAt = member.joinedAt?.toLocaleString() || 'Date inconnue';
            const timeOnServer = member.joinedAt
                ? Math.floor((Date.now() - member.joinedAt) / (1000 * 60 * 60 * 24))
                : 'Inconnu';

            const fields = [
                { name: '👤 Membre', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                { name: '📅 A rejoint le', value: joinedAt, inline: true },
                { name: '⏱️ Durée sur le serveur', value: `${timeOnServer} jours`, inline: true },
                { name: '👑 Rôles', value: roles, inline: false }
            ];

            if (member.nickname) {
                fields.push({ name: '📝 Surnom', value: member.nickname, inline: true });
            }

            await this.sendLog(member.guild, {
                title: '📤 Membre parti',
                description: `### ${member.user.tag} a quitté le serveur`,
                logType: 'member',
                fields,
                thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 })
            }, 'server');
        } catch (error) {
            console.error('Error handling member leave:', error);
        }
    }

    // Vocaux
    handleVoiceStateUpdate(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member) return;
        console.log(`Voice state update event triggered for member: ${member.id}`);

        const timestamp = Date.now();

        // Rejoindre un salon vocal
        if (!oldState.channelId && newState.channelId) {
            this.voiceStates.set(member.id, {
                channelId: newState.channelId,
                joinTime: timestamp
            });

            this.sendLog(member.guild, {
                title: '🎙️ Connexion vocale',
                description: `## ${member.user.tag} a rejoint un salon vocal 🎙️`,
                logType: 'voice',
                fields: [
                    { name: '👤 Membre', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                    { name: '🔊 Salon', value: `<#${newState.channelId}> (\`${newState.channelId}\`)`, inline: true },
                    { name: '⏰ Heure de connexion', value: new Date(timestamp).toLocaleString(), inline: false }
                ],
                author: {
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL({ dynamic: true })
                }
            }, 'server');
        }
        // Quitter un salon vocal
        else if (oldState.channelId && !newState.channelId) {
            const voiceState = this.voiceStates.get(member.id);
            if (voiceState) {
                const duration = timestamp - voiceState.joinTime;
                const hours = Math.floor(duration / 3600000);
                const minutes = Math.floor((duration % 3600000) / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                const durationStr = `${hours}h ${minutes}m ${seconds}s`;

                this.sendLog(member.guild, {
                    title: '🎙️ Déconnexion vocale',
                    description: `## ${member.user.tag} a quitté un salon vocal 🎙️`,
                    logType: 'voice',
                    fields: [
                        { name: '👤 Membre', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                        { name: '🔊 Salon quitté', value: `<#${oldState.channelId}> (\`${oldState.channelId}\`)`, inline: true },
                        { name: '⏱️ Durée de connexion', value: durationStr, inline: false },
                        { name: '⏰ Heure de déconnexion', value: new Date(timestamp).toLocaleString(), inline: false }
                    ],
                    author: {
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL({ dynamic: true })
                    }
                }, 'server');

                this.voiceStates.delete(member.id);
            }
        }
        // Changement de salon vocal
        else if (oldState.channelId !== newState.channelId) {
            this.sendLog(member.guild, {
                title: '🎙️ Changement de salon vocal',
                description: `## ${member.user.tag} a changé de salon vocal 🎙️`,
                logType: 'voice',
                fields: [
                    { name: '👤 Membre', value: `<@${member.id}> (\`${member.id}\`)`, inline: true },
                    { name: '📤 Ancien salon', value: `<#${oldState.channelId}> (\`${oldState.channelId}\`)`, inline: true },
                    { name: '📥 Nouveau salon', value: `<#${newState.channelId}> (\`${newState.channelId}\`)`, inline: true },
                    { name: '⏰ Heure du changement', value: new Date(timestamp).toLocaleString(), inline: false }
                ],
                author: {
                    name: member.user.tag,
                    iconURL: member.user.displayAvatarURL({ dynamic: true })
                }
            }, 'server');

            this.voiceStates.set(member.id, {
                channelId: newState.channelId,
                joinTime: timestamp
            });
        }
    }

    // Threads
    async handleThreadCreate(thread) {
        console.log(`Thread create event triggered for thread: ${thread.id}`);
        const auditLogs = await thread.guild.fetchAuditLogs({
            type: AuditLogEvent.ThreadCreate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        await this.sendLog(thread.guild, {
            title: '🧵 Nouveau thread créé',
            description: `## Un nouveau thread a été créé dans <#${thread.parentId}>`,
            logType: 'thread',
            fields: [
                { name: '📝 Nom', value: thread.name, inline: true },
                { name: '🔑 ID', value: `\`${thread.id}\``, inline: true },
                { name: '👤 Créé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: true },
                { name: '📂 Canal parent', value: `<#${thread.parentId}>`, inline: true },
                { name: '⏰ Auto-archive', value: `${thread.autoArchiveDuration} minutes`, inline: true },
                { name: '🔒 Privé', value: thread.type === 12 ? 'Oui' : 'Non', inline: true }
            ]
        }, 'server');
    }

    async handleThreadDelete(thread) {
        console.log(`Thread delete event triggered for thread: ${thread.id}`);
        const auditLogs = await thread.guild.fetchAuditLogs({
            type: AuditLogEvent.ThreadDelete,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        await this.sendLog(thread.guild, {
            title: '🗑️ Thread supprimé',
            description: `## Un thread a été supprimé dans <#${thread.parentId}>`,
            logType: 'thread',
            fields: [
                { name: '📝 Nom', value: thread.name, inline: true },
                { name: '🔑 ID', value: `\`${thread.id}\``, inline: true },
                { name: '👤 Supprimé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false },
                { name: '📂 Canal parent', value: `<#${thread.parentId}>`, inline: true }
            ]
        }, 'server');
    }

    async handleThreadUpdate(oldThread, newThread) {
        console.log(`Thread update event triggered for thread: ${newThread.id}`);
        const changes = [];
        const auditLogs = await newThread.guild.fetchAuditLogs({
            type: AuditLogEvent.ThreadUpdate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        if (oldThread.name !== newThread.name) {
            changes.push({ name: '📝 Nom', value: `\`${oldThread.name}\` → \`${newThread.name}\`` });
        }
        if (oldThread.archived !== newThread.archived) {
            changes.push({ name: '📦 État', value: newThread.archived ? '`Archivé`' : '`Désarchivé`' });
        }
        if (oldThread.locked !== newThread.locked) {
            changes.push({ name: '🔒 Verrouillage', value: newThread.locked ? '`Verrouillé`' : '`Déverrouillé`' });
        }
        if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
            changes.push({ name: '⏰ Auto-archive', value: `\`${oldThread.autoArchiveDuration}\` → \`${newThread.autoArchiveDuration}\` minutes` });
        }

        if (changes.length > 0) {
            await this.sendLog(newThread.guild, {
                title: '✏️ Thread modifié',
                description: `## Un thread a été modifié dans <#${newThread.parentId}>`,
                logType: 'thread',
                fields: [
                    { name: '🧵 Thread', value: `<#${newThread.id}>`, inline: true },
                    { name: '🔑 ID', value: `\`${newThread.id}\``, inline: true },
                    { name: '👤 Modifié par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false },
                    ...changes
                ]
            }, 'server');
        }
    }

    // Salons
    async handleChannelCreate(channel) {
        if (!channel.guild) return;
        console.log(`Channel create event triggered for channel: ${channel.id}`);

        const auditLogs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        const fields = [
            { name: '📝 Nom', value: channel.name, inline: true },
            { name: '🔑 ID', value: `\`${channel.id}\``, inline: true },
            { name: '📁 Type', value: channel.type.toString(), inline: true },
            { name: '👤 Créé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false }
        ];

        if (channel.parent) {
            fields.push({ name: '📂 Catégorie', value: `${channel.parent.name} (\`${channel.parent.id}\`)`, inline: false });
        }

        if (channel.topic) {
            fields.push({ name: '📋 Description', value: channel.topic, inline: false });
        }

        await this.sendLog(channel.guild, {
            title: '📝 Nouveau salon créé',
            description: `## Un nouveau salon a été créé : <#${channel.id}>`,
            logType: 'channel',
            fields
        }, 'server');
    }

    async handleChannelDelete(channel) {
        if (!channel.guild) return;
        console.log(`Channel delete event triggered for channel: ${channel.id}`);

        const auditLogs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelDelete,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        const fields = [
            { name: '📝 Nom', value: channel.name, inline: true },
            { name: '🔑 ID', value: `\`${channel.id}\``, inline: true },
            { name: '📁 Type', value: channel.type.toString(), inline: true },
            { name: '👤 Supprimé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false }
        ];

        if (channel.parent) {
            fields.push({ name: '📂 Catégorie', value: `${channel.parent.name} (\`${channel.parent.id}\`)`, inline: false });
        }

        await this.sendLog(channel.guild, {
            title: '🗑️ Salon supprimé',
            description: `## Un salon a été supprimé`,
            logType: 'channel',
            fields
        }, 'server');
    }

    async handleChannelUpdate(oldChannel, newChannel) {
        if (!newChannel.guild) return;
        console.log(`Channel update event triggered for channel: ${newChannel.id}`);

        const changes = [];
        const auditLogs = await newChannel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelUpdate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        if (oldChannel.name !== newChannel.name) {
            changes.push({ name: '📝 Nom', value: `\`${oldChannel.name}\` → \`${newChannel.name}\`` });
        }

        if (oldChannel.topic !== newChannel.topic) {
            changes.push({ name: '📋 Description', value: `\`${oldChannel.topic || 'Aucune'}\` → \`${newChannel.topic || 'Aucune'}\`` });
        }

        if (oldChannel.nsfw !== newChannel.nsfw) {
            changes.push({ name: '🔞 NSFW', value: `\`${oldChannel.nsfw}\` → \`${newChannel.nsfw}\`` });
        }

        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            changes.push({ name: '⏱️ Mode lent', value: `\`${oldChannel.rateLimitPerUser}s\` → \`${newChannel.rateLimitPerUser}s\`` });
        }

        if (oldChannel.parent?.id !== newChannel.parent?.id) {
            changes.push({ 
                name: '📂 Catégorie', 
                value: `\`${oldChannel.parent?.name || 'Aucune'}\` → \`${newChannel.parent?.name || 'Aucune'}\`` 
            });
        }

        if (changes.length > 0) {
            await this.sendLog(newChannel.guild, {
                title: '✏️ Salon modifié',
                description: `## Le salon <#${newChannel.id}> a été modifié`,
                logType: 'channel',
                fields: [
                    { name: '🔑 ID', value: `\`${newChannel.id}\``, inline: true },
                    { name: '👤 Modifié par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: true },
                    ...changes
                ]
            }, 'server');
        }

        if (JSON.stringify(oldChannel.permissionOverwrites.cache) !== JSON.stringify(newChannel.permissionOverwrites.cache)) {
            await this.handlePermissionUpdate(newChannel);
        }
    }

    async handlePermissionUpdate(channel) {
        console.log(`Permission update event triggered for channel: ${channel.id}`);
    
    const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelOverwriteUpdate,
        limit: 1
    }).catch(() => null);

    console.log('Audit logs fetched:', auditLogs); // Ajout du log pour vérifier si les logs sont récupérés

    if (!auditLogs) {
        console.error('Impossible de récupérer les logs d’audit.');
        return;
    }
    
    const logEntry = auditLogs.entries.first();
    console.log('Log entry found:', logEntry); // Vérifier l'entrée du log

    if (!logEntry) {
        console.error('Aucune entrée de log trouvée.');
        return;
    }
    
    const executor = logEntry.executor;
    const filteredChanges = logEntry.changes || [];
    console.log(filteredChanges)
    const changes = filteredChanges.filter(change => {
        // Vérifier que la valeur 'old' comporte plus de 6 chiffres
        return String(change.old).length > 5;
    });
    const targetId = logEntry.targetId;
    
    console.log('Changes:', changes); // Vérifier les changements de permission
    const affectedOverwrite = channel.permissionOverwrites.cache.get(targetId);
    let roleOrUser;

    // Si une cible est trouvée dans les overwrites
    if (affectedOverwrite) {
        if (affectedOverwrite.type === OverwriteType.Role) {
            const role = channel.guild.roles.cache.get(affectedOverwrite.id);
            roleOrUser = role ? `${role.name} \`\`\`${affectedOverwrite.id}\`\`\`` : `Rôle introuvable (${affectedOverwrite.id})`;
        } else {
            const user = channel.guild.members.cache.get(affectedOverwrite.id);
            roleOrUser = user ? `${user.user.username} \`\`\`${affectedOverwrite.id}\`\`\`` : `Utilisateur introuvable (${affectedOverwrite.id})`;
        }
    } else if (logEntry.extra) {
        // Si "extra" est renseigné dans les logs d'audit
        const extra = logEntry.extra;
        const role = channel.guild.roles.cache.get(extra.id);
        roleOrUser = role ? `${role.name} \`\`\`${extra.id}\`\`\`` : `Rôle introuvable (${extra.id})`;
    } else {
        // Si aucune information n'est trouvée
        roleOrUser = 'Inconnu';
    }
    // Créer un embed avec les informations des permissions modifiées
    const embedFields = changes.map(change => {
        const oldPermissions = new PermissionsBitField(change.old || 0n);
        const newPermissions = new PermissionsBitField(change.new || 0n);
    
        const addedPermissions = newPermissions.toArray().filter(permission => !oldPermissions.has(permission));
        const removedPermissions = oldPermissions.toArray().filter(permission => !newPermissions.has(permission));
    
        // Éviter les doublons dans les permissions ajoutées et supprimées
        const addedPermissionNames = addedPermissions.map(permission => translatePermission(permission));
        const removedPermissionNames = removedPermissions.map(permission => translatePermission(permission));
    
        // Afficher les logs
        console.log('Added Permissions:', addedPermissionNames);
        console.log('Removed Permissions:', removedPermissionNames);
    
        // Retourner les champs d'embed
        return [
            ...addedPermissionNames.map(permission => ({
                name: `🔒 ${permission} (${roleOrUser})`,
                value: `✅ → ❌`,
                inline: false
            })),
            ...removedPermissionNames.map(permission => ({
                name: `🔒 ${permission} (${roleOrUser})`,
                value: `❌ → ✅`,
                inline: false
            }))
        ];
    }).flat();
    
    // Vérification pour s'assurer qu'il n'y a pas de doublons dans le résultat final
    const uniqueEmbedFields = Array.from(new Set(embedFields.map(field => field.name)))
        .map(name => embedFields.find(field => field.name === name));
    
    console.log('Unique Embed Fields:', uniqueEmbedFields);
    
    await this.sendLog(channel.guild, {
        title: '🔒 Permissions modifiées',
        description: `Les permissions du salon ont été modifiées 🔒`,
        logType: 'channel',
        fields: [
            { name: 'Salon', value: `<#${channel.id}> (\`${channel.id}\`)`, inline: true },
            { name: 'Modifié par', value: `<@${executor.id}> (\`${executor.id}\`)`, inline: true },
            ...embedFields
        ]
    }, 'server');
    }

    // Rôles
    async handleRoleCreate(role) {
        console.log(`Role create event triggered for role: ${role.id}`);
        const auditLogs = await role.guild.fetchAuditLogs({
            type: Event.RoleCreate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        await this.sendLog(role.guild, {
            title: '👑 Nouveau rôle créé',
            description: `### Un nouveau rôle a été créé : <@&${role.id}>`,
            logType: 'role',
            fields: [
                { name: '📝 Nom', value: role.name, inline: true },
                { name: '🔑 ID', value: `\`${role.id}\``, inline: true },
                { name: '🎨 Couleur', value: `\`#${role.color.toString(16).padStart(6, '0')}\``, inline: true },
                { name: '👤 Créé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false },
                { name: '🏷️ Mentionnable', value: role.mentionable ? 'Oui' : 'Non', inline: true },
                { name: '📊 Affiché séparément', value: role.hoist ? 'Oui' : 'Non', inline: true }
            ]
        }, 'server');
    }

    async handleRoleDelete(role) {
        console.log(`Role delete event triggered for role: ${role.id}`);
        const auditLogs = await role.guild.fetchAuditLogs({
            type: AuditLogEvent.RoleDelete,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        await this.sendLog(role.guild, {
            title: '🗑️ Rôle supprimé',
            description: `### Un rôle a été supprimé`,
            logType: 'role',
            fields: [
                { name: '📝 Nom', value: role.name, inline: true },
                { name: '🔑 ID', value: `\`${role.id}\``, inline: true },
                { name: '🎨 Couleur', value: `\`#${role.color.toString(16).padStart(6, '0')}\``, inline: true },
                { name: '👤 Supprimé par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: false }
            ]
        }, 'server');
    }

    async handleRoleUpdate(oldRole, newRole) {
        console.log(`Role update event triggered for role: ${newRole.id}`);
        const changes = [];
        const auditLogs = await newRole.guild.fetchAuditLogs({
            type: AuditLogEvent.RoleUpdate,
            limit: 1
        }).catch(() => null);

        const executor = auditLogs?.entries.first()?.executor;

        if (oldRole.name !== newRole.name) {
            changes.push({ name: '📝 Nom', value: `\`${oldRole.name}\` → \`${newRole.name}\`` });
        }

        if (oldRole.color !== newRole.color) {
            changes.push({ 
                name: '🎨 Couleur', 
                value: `\`#${oldRole.color.toString(16).padStart(6, '0')}\` → \`#${newRole.color.toString(16).padStart(6, '0')}\`` 
            });
        }

        if (oldRole.hoist !== newRole.hoist) {
            changes.push({ name: '📊 Affiché séparément', value: `\`${oldRole.hoist}\` → \`${newRole.hoist}\`` });
        }

        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push({ name: '🏷️ Mentionnable', value: `\`${oldRole.mentionable}\` → \`${newRole.mentionable}\`` });
        }

        const oldPerms = oldRole.permissions.bitfield;
        const newPerms = newRole.permissions.bitfield;
        
        if (oldPerms !== newPerms) {
            const permChanges = [];
            Object.keys(PermissionsBitField.Flags).forEach(perm => {
                const flag = PermissionsBitField.Flags[perm];
                const oldHas = (oldPerms & flag) === flag;
                const newHas = (newPerms & flag) === flag;
                
                if (oldHas !== newHas) {
                    permChanges.push(`${perm}: ${oldHas ? '✅' : '❌'} → ${newHas ? '✅' : '❌'}`);
                }
            });
            
            if (permChanges.length > 0) {
                changes.push({ name: '🔒 Permissions modifiées', value: permChanges.join('\n') });
            }
        }

        if (changes.length > 0) {
            await this.sendLog(newRole.guild, {
                title: '✏️ Rôle modifié',
                description: `### Le rôle <@&${newRole.id}> a été modifié`,
                logType: 'role',
                fields: [
                    { name: '🔑 ID', value: `\`${newRole.id}\``, inline: true },
                    { name: '👤 Modifié par', value: executor ? `<@${executor.id}> (\`${executor.id}\`)` : '*Inconnu*', inline: true },
                    ...changes
                ]
            }, 'server');
        }
    }

    initialize(client) {
        console.log('Initializing LogSystem events');

        // Messages
        client.on(Events.MessageDelete, message => {
            console.log('Message delete event received');
            if (message.guild) this.handleMessageDelete(message);
        });

        client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
            console.log('Message update event received');
            if (newMessage.guild) this.handleMessageUpdate(oldMessage, newMessage);
        });

        // Membres
        client.on(Events.GuildMemberAdd, member => {
            console.log('Member add event received');
            this.handleMemberJoin(member);
        });

        client.on(Events.GuildMemberRemove, member => {
            console.log('Member remove event received');
            this.handleMemberLeave(member);
        });

        // Vocaux
        client.on(Events.VoiceStateUpdate, (oldState, newState) => {
            console.log('Voice state update event received');
            this.handleVoiceStateUpdate(oldState, newState);
        });

        // Threads
        client.on(Events.ThreadCreate, thread => {
            console.log('Thread create event received');
            this.handleThreadCreate(thread);
        });

        client.on(Events.ThreadDelete, thread => {
            console.log('Thread delete event received');
            this.handleThreadDelete(thread);
        });

        client.on(Events.ThreadUpdate, (oldThread, newThread) => {
            console.log('Thread update event received');
            this.handleThreadUpdate(oldThread, newThread);
        });
 
        // Salons
        client.on(Events.ChannelCreate, channel => {
            console.log('Channel create event received');
            this.handleChannelCreate(channel);
        });

        client.on(Events.ChannelDelete, channel => {
            console.log('Channel delete event received');
            this.handleChannelDelete(channel);
        });

        client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
            console.log('Channel update event received');
            this.handleChannelUpdate(oldChannel, newChannel);
        });

        // Rôles
        client.on(Events.RoleCreate, role => {
            console.log('Role create event received');
            this.handleRoleCreate(role);
        });

        client.on(Events.RoleDelete, role => {
            console.log('Role delete event received');
            this.handleRoleDelete(role);
        });

        client.on(Events.RoleUpdate, (oldRole, newRole) => {
            console.log('Role update event received');
            this.handleRoleUpdate(oldRole, newRole);
        });

        console.log('LogSystem events initialized');
    }
}

module.exports = LogSystem;