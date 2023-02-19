<h3>About</h3>
Here's a README for a Discord bot that allows managing an EMS server on GTA. The bot was created with the help of HugoCLI. You can clone the bot using the following link: https://github.com/HugoCLI/ems-dispatcher
<br><br>
<h3>Installation</h3>

1. Clone the repository with the following command:
```bash
git clone https://github.com/HugoCLI/ems-dispatcher.git
```
<br>

2. Navigate to the project folder:
```bash
cd ems-dispatcher
```
<br>

3. Install the necessary packages:
```bash
npm install
```
<br>

4. Create a .env file with the following contents:
```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
```
Replace **YOUR_DISCORD_BOT_TOKEN** with the token for your own Discord bot.
<br>

5. Start the bot:
```bash
npm start
```
<br>
<h3>Usage</h3>
The bot is now up and running! You can use the following commands:
<br><br>

- !debut: Start your shift.
- !fin: End your shift.
- !ajouter [n]: Add [n] reanimations to your shift.
- !stats: Display statistics for all EMS personnel. [administrator only]
- !reset: Reset all statistics. [administrator only]

<br>
<h3>Creators</h3>
HugoCLI https://github.com/HugoCLI
