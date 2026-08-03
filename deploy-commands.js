require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const cmds = [
  new SlashCommandBuilder().setName('menu').setDescription('Abre o menu de downloads (privado)')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log('🔄 Registrando...');
    await rest.put(
      process.env.GUILD_ID ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID) : Routes.applicationCommands(process.env.CLIENT_ID),
      { body: cmds }
    );
    console.log('✅ OK');
  } catch (e) { console.error(e); }
})();
