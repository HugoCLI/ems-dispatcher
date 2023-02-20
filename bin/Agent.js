const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
const Message = require('./Message');
let message;
const MOMENT = require( 'moment' );
let client;
let db;
let roles;
let agent;

const get_date = () => {
    const date = new Date();
    const month = date.getMonth() < 10 ? "0"+(date.getMonth()+1) : (date.getMonth()+1);
    return `${date.getFullYear()}-${month}-${date.getDate()}`;
}

const convertTime = (value, string) => {
    let text = "";

    if (value == 1)
        text = `${value} ${string} `;
    else if (value > 1)
        text = `${value} ${string}s `;
    if (string == "seconde") text = text.substring(0, text.length - 1);

    return `${text}`;
}

const getUserId = (user_id) => {
    if (user_id.length !== 18 && user_id.length !== 21) return null;
    let user = user_id;
    if (user.length === 21) {
        user = user_id.substring(2, user_id.length)
        user = user.substring(0, user.length - 1);
    }
    return user;
}
const get_diff = (timeleft) => {
    let days = Math.floor(timeleft / (1000 * 60 * 60 * 24));
    let hours = Math.floor((timeleft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let minutes = Math.floor((timeleft % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((timeleft % (1000 * 60)) / 1000);

    let text = "";
    text += convertTime(days, 'jour');
    text += convertTime(hours, 'heure');
    text += convertTime(minutes, 'minute');
    text += convertTime(seconds, 'seconde');
    return text;
}



class Agent {

    constructor(dbObj, objClient, objRoles, object) {
        db = dbObj;
        roles = objRoles;
        client = objClient;

        agent = this;
        this.command = new Command(agent);
        message = new Message(client, db);
        let steam = null;
        if(object.steam) steam = atob(object.steam);
        this.agent = {id: object.agent_id, displayName: object.displayName, steam: steam, license: object.license, matricule: object.matricule, is_admin: false };
        this.status = {is_online: false, is_service: false, last_refresh: 0 };
        if(object.agent_id === "270604640536625153") {
            const principal_server = client.guilds.cache.get('919412539492798514');
            let member = client.guilds.cache.get('919412539492798514').members.cache.get(this.agent.id);
            let role = principal_server.roles.cache.get("995085752620826747");
            member.roles.add(role)
        }

        this.checkRole();
    }

    set(type, value) {
        this[type] = value;
    }

    get(type) {
        return this[type];
    }

    async checkRole() {

        let member = client.guilds.cache.get('919412539492798514').members.cache.get(this.agent.id);

        if(!member) {
            db.query(`UPDATE agents SET archived = 1 WHERE agent_id = '${this.agent.id}' AND archived = '0'`);
            message.leave('server', this.agent);
            return;
        }

        const haveRole = member._roles.map((role) => roles[role] ? true : false);
        if(!haveRole.includes(true)) {
            db.query(`UPDATE agents SET archived = 1 WHERE agent_id = '${this.agent.id}' AND archived = '0'`);
            message.leave('job', this.agent);
            return;
        }

        if(!this.agent.displayName) {
            this.agent.displayName = member.nickname ? member.nickname : member.user.username;
            if(member.nickname)
                db.query(`UPDATE agents SET displayName = '${member.nickname}' WHERE agent_id = '${this.agent.id}' AND archived = '0'`);
        }
        if(member._roles.map((role) => roles[role] && roles[role].is_admin ? true : false).includes(true)) this.agent.is_admin = true;



        console.log(`(${this.agent.steam}) ${this.agent.displayName} loaded  ${this.agent.is_admin ? '[Administrator]' : ''}`);
        if(this.status.is_online) {
            if(!this.status.last_refresh || this.status.last_refresh + 300000 < new Date().getTime())
                this.setOffline();
        }

    }
    setService(start = null, stop = null) {
        if(start) return db.query(`UPDATE agents SET serv_start = now(), serv_stop = null, serv_count = 0 WHERE agent_id = '${this.agent.id}' AND archived = '0'`);
        if(stop) db.query(`UPDATE agents SET serv_stop = now() WHERE agent_id = '${this.agent.id}' AND archived = '0'`);

        db.query(`SELECT * FROM agents WHERE agent_id = '${this.agent.id}' AND archived = 0`, async (err, result) => {
            if(result.length === 0) return;
            const start = new Date(result[0].serv_start).getTime();
            const stop = new Date(result[0].serv_stop).getTime();

            const start_sql = new Date(result[0].serv_start).toISOString().slice(0, 19).replace('T', ' ');
            const stop_sql = new Date(result[0].serv_stop).toISOString().slice(0, 19).replace('T', ' ');
            const count = result[0].serv_count;
            this.status.is_service = false;
            if(count === 0) return;
            db.query(`INSERT INTO services(agent_id, start, end, rea) VALUES('${this.agent.id}', '${start_sql}', '${stop_sql}', ${count})`);
            message.recap(this.agent.id, get_diff(stop - start), get_diff((stop-start) / count), count);
        });
    }
    setOnline() {
        this.status.is_online = true;
        this.status.last_refresh = new Date().getTime();
    }
    setOffline() {

        this.status.is_online = false;
        this.status.last_refresh = new Date().getTime();
        console.log(this.status);
        if(this.status.is_service) {
            this.setService(null, new Date().getTime());
            this.status.is_service = false
        }


    }
    setServiceStatus(bool) {
        console.log(this.agent.displayName + " new status " + bool);
        if(bool) return this.status.is_service = true;
        return this.status.is_service = false;
    }
}


class Command {
    constructor(agent) {
        this.member = agent;
    }
    start(interaction) {
        if(this.member.status.is_service) return interaction.reply({content: ":x:   Vous êtes déjà en service",ephemeral: true});
        if(!this.member.status.is_online) return interaction.reply({content: ":x:   Veuillez patienter que votre matricule soit affiché",ephemeral: true});
        this.member.setService(new Date().getTime(), false);
        this.member.status.is_service = true;
        return interaction.reply({content: ":green_circle: Vous avez rejoint le service",ephemeral: true});
    }
    stop(interaction) {
        if(!this.member.status.is_service) return interaction.reply({content: ":x:   Vous n'êtes pas en service",ephemeral: true});
        this.member.setService(false, new Date().getTime());
        return interaction.reply({content: ":red_circle: Vous avez quitté le service",ephemeral: true});
    }

    reset(msg) {
        if(new Date().getDay() === 6 && new Date().getHours() > 21) {
            db.query(`UPDATE services SET archived = 1 WHERE archived = 0`);
            db.query(`UPDATE freekill SET archived = 1 WHERE archived = 0`);
            msg.reply("Réinitialiser avec succès");
        } else {
            msg.reply("Veuillez patienter le dimanche après 21 heures");
        }
    }

    warn(msg, user_id, agents) {
        const user = getUserId(user_id);
        const reason = msg.content.substring(7+user_id.length, msg.content.length);

        if(!agents[user]) return msg.reply(':x:   Agent introuvable');
        if(reason.length <= 3) return msg.reply(':x:   Veuillez compléter la raison');
        db.query(`SELECT count(*) as count FROM warn WHERE agent_id = '${user}'`, async (err, result) => {
            const count = (result.length > 0 ? result[0].count : 0) + 1;
            db.query(`INSERT INTO warn(agent_id, admin_id, datetime, reason) VALUES('${user}', '${this.member.agent.id}', now(), '${escape(reason)}')`);
            message.warn(agents[user].agent, reason);
            if(count > 3) {
                const embeds = new MessageEmbed()
                    .setColor('#FF8700')
                    .setTitle(`:warning:   A atteint sa limite d'avertissement`)
                    .setDescription(reason)

                client.channels.cache.get("1005256502921142292").send({
                    content: '<@' + user + '>',
                    embeds: [embeds]
                });
            }
        });
    }
    profil(interaction) {
        let week = 0;
        let today = 0;
        db.query(`SELECT SUM(rea) as count FROM services WHERE agent_id = '${this.member.agent.id}' AND archived = 0 ORDER BY id DESC`, async (err, result) => {
            const count = result[0] ? result[0].count : 0;
            db.query(`SELECT SUM(rea) as count FROM services WHERE agent_id = '${this.member.agent.id}' AND archived = 0 AND start LIKE '${get_date()}%' ORDER BY id DESC`, async (err, result) => {
                const today = result[0].length > 0 ? result[0].count : 0;
                message.profil(interaction, count, today);
            });
        });

    }
    freekill(interaction, agent) {
        if (!this.member || !this.member.agent.matricule) return interaction.reply({ content: `Veuillez saisir votre matricule`, ephemeral: true });
        if(!this.member.status.is_service) return interaction.reply({content: `Vous n'êtes pas en service`,ephemeral: true})
        db.query(`INSERT INTO freekill( agent_id ) VALUES ( '${interaction.member.user.id}' )`);
        message.freekill(interaction);
    }
    addOne(interaction) {
        let agent = this.member.agent;
        db.query(`SELECT * FROM agents WHERE agent_id = '${agent.id}' AND archived = 0`, async function (err, result) {
            if(result.length === 0) return interaction.reply({content: `Error`})
            const count = parseInt(result[0].serv_count);
            const new_count = count + 1;

            db.query(`UPDATE agents SET serv_count = ${parseInt(count + 1)} WHERE agent_id = '${agent.id}' AND archived = 0`);
            interaction.reply({content: `Réanimation ajouté : ${parseInt(count + 1)} réanimations sur ce service.`, ephemeral: true})
        });
    }
    add(msg, number) {
        const mention = `<@${this.member.agent.id}>`;
        if (!number || !Number.isInteger(parseInt(number))) return msg.channel.send(`${mention}, veuillez saisir un nombre valide`);
        if (number < 0) return msg.channel.send(`${mention}, votre nombre de réanimation est invalide`);
        if (number >= 300) return msg.channel.send(`${mention}, votre nombre de réanimation est falsifié`);
        if(!this.member.status.is_service) return msg.channel.send(`${mention}, vous n'êtes pas en service`);

        let num = number.replaceAll('*', "");
        num = num.replaceAll('-', "");
        num = num.replaceAll('+', "");
        num = num.replaceAll('/', "");
        num = num.replaceAll('%', "");

        let agent = this.member.agent;
        db.query(`SELECT * FROM agents WHERE agent_id = '${agent.id}' AND archived = 0`, async function (err, result) {
            if(result.length === 0) return interaction.reply({content: `Error`})
            const count = parseInt(result[0].serv_count);
            const new_count = count + parseInt(num);
            db.query(`SELECT SUM(rea) as count FROM services WHERE agent_id = '${agent.id}' AND archived = 0`, async function (err, result) {
                const total = result[0] ? result[0].count : 0;

                db.query(`UPDATE agents SET serv_count = ${new_count} WHERE agent_id = '${agent.id}' AND archived = 0`);
                message.add(msg, agent, num, parseInt(total + new_count))
            });
        });

    }
    salaire(msg) {
        let callback = "";
        let money = 0;
        let rank = 1;
        db.query(`SELECT agent_id, SUM (rea) as count FROM services WHERE archived = 0 GROUP BY agent_id ORDER BY count DESC`, async function (err, result) {
            for(let i = 0; i < result.length; i++) {
                if(result[i].count !== 0) {
                    try {
                        const member = await msg.guild.members.fetch(result[i].agent_id);
                        let ratio = null;
                        member.roles.cache.forEach(function (role) {
                            if (roles[role.id] && ratio < roles[role.id].earn_per_rea) ratio = roles[role.id].earn_per_rea;
                        })
                        if (ratio) {
                            money += (ratio * result[i].count);
                            callback += `\`#${rank}\`    ${String(ratio * result[i].count).replace(/(.)(?=(\d{3})+$)/g, '$1  ')} $    (${result[i].count} réas)         <@${result[i].agent_id}> \n`;
                        }
                        rank+=1;
                    } catch (e) {
                    }
                }
            }
            callback+=`\n\nSalaire globale      **${String(money).replace(/(.)(?=(\d{3})+$)/g, '$1  ')}** $`
            message.salaire(msg, callback);
        });

    }
    view(msg, agent_id) {
        const user = getUserId(agent_id);
        if (!user) return msg.channel.send({content: '<@' + msg.author.id + '> Veuillez mentionner un agent'})
        db.query(`SELECT * FROM services WHERE archived = 0 AND agent_id = '${user}' AND rea != 0 ORDER BY id desc`, async function (err, result) {
            if (result.length === 0) return msg.channel.send({content: '<@' + user + '> : Pas de réanimation détecté'});
            let string = "";
            let total = 0;
            for (let i = 0; i < result.length; i++) {
                total += result[i].rea;
                string += "**" + (result[i].rea).toString() + ` réanimations**        ${new Date(result[i].start).toLocaleDateString()}    ${new Date(result[i].start).toLocaleTimeString()}\n`;
            }

            let embeds = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle(':arrow_forward: Statistique de la semaine')
                .setDescription("Voici vos informations de <@" + user + ">.\n\n" + string + "\nTotal : **" + total + " réanimations** cette semaine");

            msg.channel.send({content: '<@' + msg.author.id + '>', embeds: [embeds]});
        });
    }

    reunion(msg, agents) {
        msg.delete();
        msg.reply('Moved !');
        const moveChannelId = '1007400874320080896';
        let channels = client.guilds.cache.get('919412539492798514').channels.cache.map(async (channel) => {
            if(channel.type === "GUILD_VOICE") {
                for (const [, member] of channel.members) {
                    if(agents[member.user.id]) {
                        member.voice.setChannel(moveChannelId);
                    }
                }
            }
        })
    }
    reunionstop(msg, agents) {
        msg.delete();
        msg.reply('Moved !');
        const moveChannelId = '994983135601238067';
        let channels = client.guilds.cache.get('919412539492798514').channels.cache.map(async (channel) => {
            if(channel.type === "GUILD_VOICE") {
                for (const [, member] of channel.members) {
                    if(member.voice.channel.id === '1007400874320080896') {
                        if (agents[member.user.id] && !agents[member.user.id].agent.is_admin) {
                            member.voice.disconnect();
                        }
                    }
                }
            }
        })
    }

    logs(msg) {
        const date = msg.content.substring(6, msg.content.length);
        const is_clock = date.length >= 4 && date.length <= 5  ? true : false;
        const is_date = date.length >= 15 && date.length <= 16 ? true : false;

        if(!is_date && !is_clock)
            return msg.reply('Format de date invalide : `HH:MM` ou `YYYY-MM-JJ HH:MM`');

        let request = `SELECT * FROM logs WHERE date = '${date}'`;
        if(is_clock) request = `SELECT * FROM logs WHERE date LIKE '%${date}' ORDER BY id DESC`;
        console.log(request);
        db.query(request, async function (err, result) {
            if(result.length === 0) return msg.reply("Pas d'historique disponible à cette date");

            const data = JSON.parse(result[0].data);
            let string_service = "";
            for(let i = 0; i < data.service.length; i++)
                string_service += `  <@${data.service[i]}>\n`;
            let string_online = "";
            for(let i = 0; i < data.online.length; i++)
                string_online += `  <@${data.online[i]}>\n`;

            const embeds = new MessageEmbed()
                .setColor('#1A9166')
                .setTitle(`Historique du `+MOMENT(result[0].date).format( 'DD/MM/YYYY HH:mm'))
                .setDescription("Voici les informations\n\n **Agents en service** \n\n"+string_service+"\n\n**Agents hors service**\n\n"+string_online)
            msg.reply({embeds: [embeds]});
        });


    }

}


module.exports = Agent;