# Publishing Guide for Python Smart Auto-Import

## Prerequisites

1. **Create a Microsoft/Azure DevOps Account**
   - Go to https://dev.azure.com
   - Sign in with your Microsoft account (or create one)

2. **Get a Personal Access Token (PAT)**
   - Go to https://dev.azure.com
   - Click on your profile icon → Security → Personal Access Tokens
   - Click "New Token"
   - Name: "VS Code Marketplace"
   - Organization: All accessible organizations
   - Expiration: Custom (set to 90 days or more)
   - Scopes: **Marketplace → Manage** (check this box)
   - Click "Create" and **SAVE THE TOKEN** (you won't see it again!)

3. **Install vsce (VS Code Extension Manager)**
   ```bash
   npm install -g @vscode/vsce
   ```

4. **Create a Publisher**
   - Go to https://marketplace.visualstudio.com/manage
   - Click "Create publisher"
   - Publisher ID: Choose a unique name (lowercase, no spaces)
   - Display name: Your name or organization name

## Before Publishing

1. **Update package.json**
   - Replace `YOUR-PUBLISHER-NAME` with your actual publisher ID
   - Replace `YOUR-NAME` with your name
   - Replace `YOUR-USERNAME` with your GitHub username (if using GitHub)
   - Update the version number if needed

2. **Optional: Add an Icon**
   - Create a 128x128 PNG image named `icon.png`
   - Add to package.json: `"icon": "icon.png",`
   - (I've included an SVG template - you can convert it or create your own)

3. **Build and Test**
   ```bash
   npm run compile
   ```

4. **Test the Extension Locally**
   - Press F5 in VS Code to launch Extension Development Host
   - Test all features
   - Check for errors in the Debug Console

## Publishing Steps

### First-Time Publishing

1. **Login to vsce**
   ```bash
   vsce login YOUR-PUBLISHER-NAME
   ```
   - Enter your Personal Access Token when prompted

2. **Package the Extension** (optional - to test before publishing)
   ```bash
   vsce package
   ```
   - This creates a `.vsix` file you can install locally
   - Test: `code --install-extension python-smart-autoimport-0.0.1.vsix`

3. **Publish to Marketplace**
   ```bash
   vsce publish
   ```
   - This will package and publish in one step
   - Wait 5-10 minutes for it to appear in the marketplace

### Publishing Updates

1. **Update version** (choose one):
   ```bash
   # Patch version (0.0.1 → 0.0.2)
   vsce publish patch

   # Minor version (0.0.1 → 0.1.0)
   vsce publish minor

   # Major version (0.0.1 → 1.0.0)
   vsce publish major

   # Or specify exact version
   vsce publish 0.0.2
   ```

2. **Update CHANGELOG.md** with new changes

## Common Issues

### "Missing publisher name"
- Make sure `publisher` field is set in package.json

### "PAT token invalid"
- Make sure you selected "Marketplace → Manage" scope when creating the token
- Token might be expired - create a new one

### "Extension takes forever to appear"
- Usually takes 5-10 minutes
- Check https://marketplace.visualstudio.com/items?itemName=YOUR-PUBLISHER-NAME.python-smart-autoimport

### "Icon not showing"
- Icon must be exactly 128x128 pixels PNG
- Reference it correctly in package.json: `"icon": "icon.png"`

## Verification

After publishing, verify:
1. Extension appears at: `https://marketplace.visualstudio.com/items?itemName=YOUR-PUBLISHER-NAME.python-smart-autoimport`
2. README displays correctly
3. Install works: `ext install YOUR-PUBLISHER-NAME.python-smart-autoimport`

## Quick Commands Reference

```bash
# Install vsce
npm install -g @vscode/vsce

# Login
vsce login YOUR-PUBLISHER-NAME

# Package locally
vsce package

# Publish
vsce publish

# Publish with version bump
vsce publish patch   # 0.0.1 → 0.0.2
vsce publish minor   # 0.0.1 → 0.1.0
vsce publish major   # 0.0.1 → 1.0.0
```

## Next Steps After Publishing

1. **Add badges to README** (optional):
   ```markdown
   ![Version](https://img.shields.io/visual-studio-marketplace/v/YOUR-PUBLISHER-NAME.python-smart-autoimport)
   ![Installs](https://img.shields.io/visual-studio-marketplace/i/YOUR-PUBLISHER-NAME.python-smart-autoimport)
   ![Rating](https://img.shields.io/visual-studio-marketplace/r/YOUR-PUBLISHER-NAME.python-smart-autoimport)
   ```

2. **Share your extension**:
   - Post on Reddit r/vscode
   - Share on Twitter/X
   - Add to your GitHub profile

3. **Monitor feedback**:
   - Check marketplace reviews
   - Monitor GitHub issues
   - Respond to user feedback

Good luck with your extension! 🚀
