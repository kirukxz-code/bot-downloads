# Bot de Downloads - Discord

Bot com menu de categorias (dropdown) para organizar links de download em um único canal.

## Categorias
- 🗣️ | 🎥 **Clips** - Vídeos curtos e clipes
- 🗣️ | 🎥 **Intros** - Intros para vídeos/streams
- 🗣️ | 🎧 **Songs** - Músicas e trilhas sonoras
- 🗣️ | 🪐 **Plugins** - Plugins para softwares
- 🗣️ | 🎋 **Presets AM** - Presets para After Effects (AM)
- 🗣️ | 🎋 **Presets AE** - Presets para After Effects (AE)

## Como funciona
1. Use `/recursos` no canal
2. Abre embed com menu dropdown 🌐 « 🤪 recursos «
3. Seleciona categoria → mostra links de download
4. Botão "← Voltar ao Menu" para navegar

## Setup

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env
# Edite .env com seu token, client ID e guild ID

# 3. Registrar comandos
node deploy-commands.js

# 4. Iniciar bot
npm start
```

## Adicionar/Editar Links
Edite o objeto `DOWNLOAD_LINKS` em `index.js`:

```javascript
const DOWNLOAD_LINKS = {
  clips: [
    { name: 'Nome do Arquivo', url: 'https://link-direto.com/arquivo.zip', size: '100 MB' },
    // mais links...
  ],
  // outras categorias...
};
```

## Estrutura
```
├── index.js              # Bot principal
├── deploy-commands.js    # Registra slash commands
├── package.json
└── .env                  # Token e IDs (não commitar)
```

## Obter Token e IDs
1. [Discord Developer Portal](https://discord.com/developers/applications)
2. Nova Application → Bot → Copy Token
3. OAuth2 → URL Generator → bot + applications.commands
4. Invite no servidor
5. Ativar "Developer Mode" no Discord → Copy ID do servidor (Guild ID) e da Application (Client ID)