require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const cliente = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const CATEGORIAS_PADRAO = {
  clips: { label: 'Clips', defaultEmoji: '🎬', defaultDesc: 'Vídeos curtos e clipes', defaultColor: 0xED4245 },
  intros: { label: 'Intros', defaultEmoji: '🎞️', defaultDesc: 'Intros para vídeos/streams', defaultColor: 0xF47FFF },
  songs: { label: 'Songs', defaultEmoji: '🎵', defaultDesc: 'Músicas e trilhas sonoras', defaultColor: 0x43B581 },
  'plugin-ins': { label: 'Plugins', defaultEmoji: '🔌', defaultDesc: 'Plugins para softwares', defaultColor: 0x7289DA },
  'presets-am': { label: 'Presets AM', defaultEmoji: '✨', defaultDesc: 'Presets After Effects (AM)', defaultColor: 0xF0C43F },
  'presets-ae': { label: 'Presets AE', defaultEmoji: '✨', defaultDesc: 'Presets After Effects (AE)', defaultColor: 0xF0C43F }
};

const CANAL_PERMITIDO = '1533540675264708648';
const CARGO_ADMIN = '1490764325156294777';
const ARQUIVO_DB = path.join(__dirname, 'db.json');
const ARQUIVO_MENU = path.join(__dirname, 'menu.json');

const CORES = { bg: 0x2B2D31, glow: 0x00D4FF, accent: 0x5865F2, ok: 0x3BA55C, err: 0xED4245 };

function urlValida(url) {
  if (!url) return false;
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function carregarDB() {
  if (fs.existsSync(ARQUIVO_DB)) try { return JSON.parse(fs.readFileSync(ARQUIVO_DB)); } catch {}
  return { links: {}, cfg: {}, main: {} };
}
function salvarDB(d) { fs.writeFileSync(ARQUIVO_DB, JSON.stringify(d, null, 2)); }
function ehAdmin(m) { return m?.roles?.cache?.has(CARGO_ADMIN) || m?.permissions?.has(PermissionFlagsBits.Administrator); }
function negrito(t) { return `**${t}**`; }

const DB = carregarDB();
const LINKS = DB.links || {};
DB.links = LINKS;
DB.cfg = DB.cfg || {};
DB.main = DB.main || {};

if (!DB.cats || typeof DB.cats !== 'object') {
  DB.cats = {};
  Object.entries(CATEGORIAS_PADRAO).forEach(([k, v]) => { DB.cats[k] = { label: v.label, emoji: v.defaultEmoji, desc: v.defaultDesc, color: v.defaultColor }; });
}
Object.keys(DB.cats).forEach(k => {
  LINKS[k] = Array.isArray(LINKS[k]) ? LINKS[k] : [];
  DB.cfg[k] = DB.cfg[k] || {};
});
salvarDB(DB);

function obterCategorias() { return DB.cats || {}; }

function obterConfigCategoria(chave) {
  const padrao = CATEGORIAS_PADRAO[chave] || {};
  const cat = DB.cats[chave] || {};
  const cfg = DB.cfg[chave] || {};
  return {
    titulo: cfg.titulo || cat.label || padrao.label || chave,
    emoji: cfg.emoji || cat.emoji || padrao.defaultEmoji || '📄',
    desc: cfg.desc || cat.desc || padrao.defaultDesc || '',
    cor: cfg.cor || cat.color || padrao.defaultColor || CORES.accent,
    banner: urlValida(cfg.banner) ? cfg.banner : null,
    icone: urlValida(cfg.icone) ? cfg.icone : null,
    rodape: cfg.rodape || null
  };
}

function slugificar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

function obterConfigPrincipal() {
  const m = DB.main || {};
  return {
    titulo: m.titulo || 'R E C U R S O S',
    desc: m.desc || `**Central de Downloads**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSelecione uma categoria no menu abaixo para acessar os arquivos.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    banner: urlValida(m.banner) ? m.banner : null,
    rodape: m.rodape || null
  };
}

function criarEmbedPrincipal() {
  const cfg = obterConfigPrincipal();
  const campos = Object.entries(obterCategorias()).map(([k, v]) => {
    const cc = obterConfigCategoria(k);
    return {
      name: `${cc.emoji}  ${negrito(cc.titulo)}`,
      value: `> ${cc.desc}\n> \`${(LINKS[k] || []).length} itens\``,
      inline: true
    };
  });

  const e = new EmbedBuilder()
    .setTitle(negrito(cfg.titulo))
    .setDescription(cfg.desc)
    .setColor(CORES.glow)
    .addFields(campos);

  if (cfg.banner) e.setImage(cfg.banner);
  if (cfg.rodape) e.setFooter({ text: cfg.rodape }).setTimestamp();
  else e.setTimestamp();
  return e;
}

function criarEmbedCategoria(chave) {
  const cc = obterConfigCategoria(chave);
  const itens = (LINKS[chave] || []);
  
  let corpo = `> ${cc.desc}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  if (itens.length) {
    corpo += `📦  ${negrito(`${itens.length} arquivo${itens.length > 1 ? 's' : ''} disponível${itens.length > 1 ? 'eis' : ''}`)}\n\n`;
    corpo += itens.map((l, i) => {
      const num = negrito(`${i + 1}.`);
      return `${num.padStart(6)}  [${l.nome}](${l.url})  \`${l.tamanho}\``;
    }).join('\n');
  } else {
    corpo += `📭  *Nenhum arquivo cadastrado.*\n\n`;
    corpo += `> 💡 Admins: use ${negrito('➕ Adicionar')} para incluir o primeiro.`;
  }

  const e = new EmbedBuilder()
    .setTitle(`${cc.emoji}  ${negrito(cc.titulo.toUpperCase())}`)
    .setDescription(corpo)
    .setColor(cc.cor);

  if (cc.banner) e.setImage(cc.banner);
  if (cc.icone) e.setThumbnail(cc.icone);
  if (cc.rodape) e.setFooter({ text: cc.rodape }).setTimestamp();
  else e.setTimestamp();
  return e;
}

function criarMenuPrincipal() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('pick_cat')
      .setPlaceholder('🔽  Escolha uma categoria...')
      .addOptions(Object.entries(obterCategorias()).map(([k, v]) => {
        const cc = obterConfigCategoria(k);
        return new StringSelectMenuOptionBuilder()
          .setLabel(cc.titulo)
          .setDescription(`${cc.desc} • ${(LINKS[k] || []).length} itens`)
          .setValue(k)
          .setEmoji(cc.emoji);
      }))
  );
}

function criarPainelAdmin() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('novacat').setLabel('Nova Categoria').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId('cfgmain').setLabel('Menu Principal').setStyle(ButtonStyle.Primary).setEmoji('⚙️')
  );
}

function criarEmbedAdmin() {
  return new EmbedBuilder()
    .setTitle(negrito('🛠️ Painel de Administração'))
    .setDescription('Use as opções abaixo para gerenciar o bot.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .setColor(CORES.accent)
    .setTimestamp();
}

function criarBotoesNavegacao(chave, admin) {
  const botoes = [new ButtonBuilder().setCustomId('back').setLabel('← Menu').setStyle(ButtonStyle.Secondary).setEmoji('🏠')];
  if (admin) botoes.push(
    new ButtonBuilder().setCustomId(`add_${chave}`).setLabel('Adicionar').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId(`del_${chave}`).setLabel('Remover').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
    new ButtonBuilder().setCustomId(`cfg_${chave}`).setLabel('Personalizar').setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
    new ButtonBuilder().setCustomId(`delcat_${chave}`).setLabel('Excluir Cat.').setStyle(ButtonStyle.Danger).setEmoji('💀')
  );
  return new ActionRowBuilder().addComponents(botoes);
}

function criarModalNovaCategoria() {
  return new ModalBuilder().setCustomId('novacat').setTitle('➕ Nova Categoria')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome (ex: Games)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(40).setPlaceholder('Ex: Games')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji/Ícone (ex: 🎮)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setPlaceholder('📄')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder('Ex: Jogos e mods')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (ex: #7289DA)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder(CORES.accent.toString(16).padStart(6, '0')))
    );
}

function criarModalAdicionar(chave) {
  const cc = obterConfigCategoria(chave);
  return new ModalBuilder().setCustomId(`add_${chave}`).setTitle(`➕ ${cc.titulo}`)
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder('Ex: Meu Arquivo v2')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('u').setLabel('URL direta').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(500).setPlaceholder('https://...')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('s').setLabel('Tamanho (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder('Ex: 150 MB'))
    );
}

function criarModalConfigurar(chave) {
  const cc = obterConfigCategoria(chave);
  return new ModalBuilder().setCustomId(`cfg_${chave}`).setTitle(`⚙️ ${cc.titulo}`)
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título (ex: Meus Clips)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80).setPlaceholder(cc.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('Emoji/Ícone (ex: 🎬)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(10).setPlaceholder(cc.emoji)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição (markdown livre)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1000).setPlaceholder(cc.desc)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cor').setLabel('Cor HEX (ex: #ED4245 ou 0xED4245)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(20).setPlaceholder(cc.cor.toString(16).padStart(6, '0'))),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner').setLabel('Banner URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(cc.banner || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icone').setLabel('Ícone/Thumb URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(cc.icone || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rodape').setLabel('Rodapé').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder(cc.rodape || ''))
    );
}

function criarModalConfigPrincipal() {
  const m = obterConfigPrincipal();
  return new ModalBuilder().setCustomId('cfg_main').setTitle('⚙️ Menu Principal')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(80).setPlaceholder(m.titulo)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('Descrição completa (markdown livre)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setPlaceholder(m.desc)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('banner').setLabel('Banner/Imagem URL').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500).setPlaceholder(m.banner || '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rodape').setLabel('Rodapé (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder(m.rodape || ''))
    );
}

function criarSelectRemover(chave) {
  const itens = LINKS[chave] || [];
  if (!itens.length) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`delsel_${chave}`).setPlaceholder('🗑️ Selecione para remover...')
      .addOptions(itens.map((l, i) => new StringSelectMenuOptionBuilder().setLabel(`${i+1}. ${l.nome}`).setDescription(`${l.tamanho} • ${l.url.slice(0,90)}`).setValue(String(i)).setEmoji('📄')))
  );
}

function negrito(t) { return `**${t}**`; }
function erro(t, d) { return new EmbedBuilder().setTitle(negrito(`❌ ${t}`)).setDescription(d).setColor(CORES.err).setTimestamp(); }
function sucesso(t, d) { return new EmbedBuilder().setTitle(negrito(`✅ ${t}`)).setDescription(d).setColor(CORES.ok).setTimestamp(); }

async function atualizarSeguro(i, payload) {
  try {
    await i.deferUpdate();
    await i.editReply(payload);
  } catch (e) {
    console.error('atualizarSeguro erro:', e.message);
    try { await i.reply(payload); } catch {}
    try { await i.followUp(payload); } catch {}
  }
}

async function responderSeguro(i, payload) {
  try {
    if (i.replied || i.deferred) await i.followUp(payload);
    else await i.reply(payload);
  } catch {}
}

async function atualizarModalSeguro(i, payload) {
  try {
    await i.update(payload);
  } catch (e) {
    console.error('atualizarModal erro:', e.message);
    try { await i.reply(payload); } catch {}
    try { await i.followUp(payload); } catch {}
  }
}

async function postarMenuFixo() {
  const ch = cliente.channels.cache.get(CANAL_PERMITIDO);
  if (!ch) return console.log('❌ Canal não encontrado');
  
  if (fs.existsSync(ARQUIVO_MENU)) {
    try {
      const old = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
      const oldMsg = await ch.messages.fetch(old.msgId).catch(()=>null);
      if (oldMsg) await oldMsg.delete().catch(()=>{});
    } catch {}
  }

  // Apaga mensagens antigas do próprio bot no canal (ex: menus de versões anteriores)
  try {
    const msgs = await ch.messages.fetch({ limit: 50 });
    for (const [, m] of msgs) {
      if (m.author.id === cliente.user.id) await m.delete().catch(()=>{});
    }
  } catch {}

  const msg = await ch.send({ embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] });
  fs.writeFileSync(ARQUIVO_MENU, JSON.stringify({ msgId: msg.id, chId: ch.id }));
  console.log('✅ Menu fixo postado');
}

async function garantirMenuExiste() {
  const ch = cliente.channels.cache.get(CANAL_PERMITIDO);
  if (!ch) return;
  if (!fs.existsSync(ARQUIVO_MENU)) return postarMenuFixo();
  
  try {
    const data = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
    const msg = await ch.messages.fetch(data.msgId).catch(()=>null);
    if (!msg) {
      console.log('🔄 Menu deletado, repostando...');
      return postarMenuFixo();
    }
    await msg.edit({ embeds: [criarEmbedPrincipal()], components: [criarMenuPrincipal()] }).catch(()=>{});
  } catch {
    return postarMenuFixo();
  }
}

cliente.once(Events.ClientReady, async c => {
  console.log(`✅ ${c.user.tag} online`);
  await postarMenuFixo();
  setInterval(garantirMenuExiste, 15000);
});

cliente.on(Events.MessageDelete, async msg => {
  try {
    if (!fs.existsSync(ARQUIVO_MENU)) return;
    const data = JSON.parse(fs.readFileSync(ARQUIVO_MENU));
    if (data.msgId && msg.id === data.msgId) {
      console.log('🔄 Menu fixo apagado, repondo imediatamente...');
      fs.rmSync(ARQUIVO_MENU, { force: true });
      await postarMenuFixo();
    }
  } catch {}
});

cliente.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {
      if (i.commandName === 'menu') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        return i.reply({ embeds: [criarEmbedAdmin()], components: [criarPainelAdmin()], ephemeral: true });
      }
      if (i.commandName === 'resetmenu') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        await i.deferReply({ ephemeral: true });
        await postarMenuFixo();
        return i.editReply({ embeds: [sucesso('Menu reposto', 'Menu fixo atualizado no canal.')] });
      }
    }
    if (i.isStringSelectMenu()) {
      if (i.customId === 'pick_cat') {
        const chave = i.values[0];
        const admin = ehAdmin(i.member);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, admin);
        try { await i.reply({ embeds: [emb], components: [nav], ephemeral: true }); }
        catch { await atualizarSeguro(i, { embeds: [emb], components: [nav], ephemeral: true }); }
      }
      if (i.customId.startsWith('delsel_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Apenas admins.')], ephemeral: true });
        const chave = i.customId.replace('delsel_', '');
        const idx = parseInt(i.values[0]);
        const removido = (LINKS[chave] || []).splice(idx, 1)[0]; DB.links = LINKS; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        await atualizarSeguro(i, { embeds: [emb], components: [nav] });
        await responderSeguro(i, { embeds: [sucesso('Removido', negrito(`${removido?.nome || 'item'}`))], ephemeral: true });
      }
    }

    if (i.isButton()) {
      if (i.customId === 'back') {
        try { await i.deferUpdate(); } catch {}
        try { await i.message.delete(); }
        catch {
          try { await i.deleteReply(); } catch {}
        }
        return;
      }
      if (i.customId === 'novacat') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        return i.showModal(criarModalNovaCategoria());
      }
      if (i.customId === 'cfgmain') {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        return i.showModal(criarModalConfigPrincipal());
      }
      if (i.customId.startsWith('delcat_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('delcat_', '');
        const cc = obterConfigCategoria(chave);
        const botoes = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confdel_${chave}`).setLabel('Sim, excluir').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
          new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );
        return responderSeguro(i, { embeds: [erro('Excluir categoria', `Excluir ${negrito(cc.titulo)} e todos os itens? Essa ação **não pode ser desfeita**.`)], components: [botoes], ephemeral: true });
      }
      if (i.customId === 'cancel') {
        return responderSeguro(i, { embeds: [sucesso('Cancelado', 'Nada foi alterado.')], ephemeral: true });
      }
      if (i.customId.startsWith('confdel_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('confdel_', '');
        delete DB.cats[chave];
        delete DB.cfg[chave];
        delete LINKS[chave];
        DB.links = LINKS;
        salvarDB(DB);
        await responderSeguro(i, { embeds: [sucesso('Categoria excluída', `${negrito(chave)} removida.`)], ephemeral: true });
        return garantirMenuExiste();
      }
      if (i.customId.startsWith('add_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('add_', '');
        return i.showModal(criarModalAdicionar(chave));
      }
      if (i.customId.startsWith('del_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('del_', '');
        const sel = criarSelectRemover(chave);
        if (!sel) return responderSeguro(i, { embeds: [erro('Vazio', 'Nada para remover.')], ephemeral: true });
        try { await i.deferReply({ ephemeral: true }); } catch {}
        return i.editReply({ components: [sel] });
      }
      if (i.customId.startsWith('cfg_')) {
        if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
        const chave = i.customId.replace('cfg_', '');
        return i.showModal(criarModalConfigurar(chave));
      }
    }

    if (i.isModalSubmit()) {
      if (!ehAdmin(i.member)) return responderSeguro(i, { embeds: [erro('Sem permissão', 'Admins apenas.')], ephemeral: true });
      if (i.customId === 'novacat') {
        const nome = i.fields.getTextInputValue('nome').trim();
        let chave = slugificar(nome);
        if (!chave) return responderSeguro(i, { embeds: [erro('Nome inválido', 'Informe um nome válido.')], ephemeral: true });
        if (chave.length > 30) chave = chave.slice(0, 30);
        if (DB.cats[chave]) return responderSeguro(i, { embeds: [erro('Já existe', `Categoria ${negrito(chave)} já existe. Use outro nome.`)], ephemeral: true });
        let cor = CORES.accent;
        const corInput = i.fields.getTextInputValue('cor');
        if (corInput) {
          const limpo = corInput.replace('#', '').replace('0x', '');
          const parsed = parseInt(limpo, 16);
          if (!isNaN(parsed)) cor = parsed;
        }
        DB.cats[chave] = {
          label: nome,
          emoji: i.fields.getTextInputValue('emoji') || '📄',
          desc: i.fields.getTextInputValue('desc') || '',
          color: cor
        };
        DB.cfg[chave] = {};
        LINKS[chave] = [];
        DB.links = LINKS;
        salvarDB(DB);
        await responderSeguro(i, { embeds: [sucesso('Categoria criada', `${negrito(obterConfigCategoria(chave).titulo)} adicionada ao menu.`)], ephemeral: true });
        return garantirMenuExiste();
      }
      if (i.customId.startsWith('add_')) {
        const chave = i.customId.replace('add_', '');
        const n = i.fields.getTextInputValue('n'), u = i.fields.getTextInputValue('u'), s = i.fields.getTextInputValue('s') || 'Desconhecido';
        if (!LINKS[chave]) LINKS[chave] = [];
        LINKS[chave].push({ nome: n, url: u, tamanho: s }); DB.links = LINKS; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        return atualizarModalSeguro(i, { embeds: [emb], components: [nav] });
      }
      if (i.customId.startsWith('cfg_')) {
        const chave = i.customId.replace('cfg_', '');
        const corInput = i.fields.getTextInputValue('cor');
        let cor = obterConfigCategoria(chave).cor;
        if (corInput) {
          const limpo = corInput.replace('#', '').replace('0x', '');
          const parsed = parseInt(limpo, 16);
          if (!isNaN(parsed)) cor = parsed;
        }
        DB.cfg[chave] = {
          titulo: i.fields.getTextInputValue('titulo') || null,
          emoji: i.fields.getTextInputValue('emoji') || null,
          desc: i.fields.getTextInputValue('desc') || null,
          cor: cor,
          banner: urlValida(i.fields.getTextInputValue('banner')) ? i.fields.getTextInputValue('banner') : null,
          icone: urlValida(i.fields.getTextInputValue('icone')) ? i.fields.getTextInputValue('icone') : null,
          rodape: i.fields.getTextInputValue('rodape') || null
        }; salvarDB(DB);
        const emb = criarEmbedCategoria(chave);
        const nav = criarBotoesNavegacao(chave, true);
        return atualizarModalSeguro(i, { embeds: [emb], components: [nav] });
      }
      if (i.customId === 'cfg_main') {
        DB.main = {
          titulo: i.fields.getTextInputValue('titulo') || null,
          desc: i.fields.getTextInputValue('desc') || null,
          banner: urlValida(i.fields.getTextInputValue('banner')) ? i.fields.getTextInputValue('banner') : null,
          rodape: i.fields.getTextInputValue('rodape') || null
        }; salvarDB(DB);
        garantirMenuExiste();
        return atualizarModalSeguro(i, { embeds: [criarEmbedAdmin()], components: [criarPainelAdmin()] });
      }
    }
  } catch (e) { console.error('Erro interação:', e); }
});

cliente.login(process.env.DISCORD_TOKEN);