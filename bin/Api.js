const axios = require('axios');
const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
let down = false;
const MOMENT = require( 'moment' );


let client;
let roles;
let db;

class Api {
    constructor(objClient, objDb, objRoles) {
        client = objClient;
        roles = objRoles;
        db = objDb;
    }
    async get(agents) {
        let online = [];
        await axios.get('https://servers-frontend.fivem.net/api/servers/single/8boo93', {
            headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36'}
        }).then(async (res) => {
            down = false;
            const data = res.data.Data.players;
            if(data.length === 0) down = true;
            for (const [key, value] of Object.entries(data)) {
                let discord;
                for (let i = 0; i < value.identifiers.length; i++) {
                    if (value.identifiers[i].split(':')[0] === "discord") {
                        discord = value.identifiers[i].split(':')[1];
                        if(agents[discord]) {
                            agents[discord].setOnline();
                            online.push(discord);
                            agents[discord].set('id', value.id);
                            if(!agents[discord].agent.steam || value.name !== agents[discord].agent.steam)
                                db.query(`UPDATE agents SET steam = '${btoa(value.name)}' WHERE agent_id = '${agents[discord].agent.id}' AND archived = '0'`);
                            agents[discord].agent.steam = value.name;
                        }
                    }

                }
            }

            for (const [key, value] of Object.entries(agents)) {
                if(value.status.is_service && !online.includes(key)) {
                    if (value.status.last_refresh + 300000 < new Date().getTime()) {
                        value.setOffline()
                        console.log(value.agent.displayName + " déconnexion forcé.");
                    }
                }

            }


        }).catch((err) => {
            down = true;
            console.log('api/servers/single/8boo93 | 404 Not Found')
        })

    }

    status() {
        return down;
    }

    async hierarchie(agents) {
        let string = "";
        await client.guilds.cache.get('919412539492798514').members.fetch()
        let cacheMembers = [];

        const rolesOrder = ['919422146101526598', '995085752620826747', '998760823080112319', '993952635919028254', '993951830662987827', '919417870591619082', '919418574303531019', '994976771927724173'];
        for (let i = 0; i < rolesOrder.length; i++) {
            let list = {};
            const role = client.guilds.cache.get('919412539492798514').roles.cache.find(role => role.id === rolesOrder[i])
            string += `**<@&${rolesOrder[i]}>**\n\n`;
            let c = 0;
            role.members.map((m) => {
                if (!cacheMembers.includes(m.user.id)) {
                    cacheMembers.push(m.user.id);
                    c += 1;
                    let matricule = ":warning:";
                    if (agents[m.user.id] && agents[m.user.id].agent.matricule !== undefined) matricule = agents[m.user.id].agent.matricule;
                    if (matricule < 10) matricule = "0" + matricule;
                    if(agents[m.user.id] && agents[m.user.id].agent.matricule)
                        list[agents[m.user.id].agent.matricule] = `${matricule}          <@${m.user.id}>\n`;

                }
            })
            const ordered = Object.keys(list).sort().reduce(
                (obj, key) => {
                    obj[key] = list[key];
                    return obj;
                },
                {}
            );
            for (const [key, value] of Object.entries(ordered)) {
                string += value;
            }
            string += `\n\n`;
        }
        const embeds = new MessageEmbed()
            .setColor('#303434')
            .setTitle(':hospital:   Hiérarchie de Emergency Medical Service')
            .setDescription("Veillez à respecter la hiérarchie et de respecter vos collègues, en cas d'impolitesse, vous pouvez être licencié.\n\n" + string+"Total de **"+cacheMembers.length+" agents**");
        client.guilds.cache.get('919412539492798514').channels.cache.get('998315742644674610').messages.fetch('1005582354577891388').then(message => message.edit({
            embeds: [embeds]
        }));
    }

    async logs(agents) {
        let count = 0;
        const datetime = MOMENT().format( 'YYYY-MM-DD HH:mm' );
        let logs = {online: [], service: []};
        for (const [key, value] of Object.entries(agents)) {
            if(value.status.is_service) {
                logs.service.push(key)
            } else if (value.status.is_online) {
                logs.online.push(key)
                count+=1;
            }
        }
        db.query(`SELECT * FROM logs WHERE date = '${datetime}'`, async function (err, result) {
            if(result.length > 0) return;
                db.query(`INSERT INTO logs( date, data ) VALUES ( '${datetime}', '${JSON.stringify(logs)}')`);
                console.log(datetime + ` saved. Online: ${logs.online.length}       Service: ${logs.service.length}`);
        });

    }
}



module.exports = Api;