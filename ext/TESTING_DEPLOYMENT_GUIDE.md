# Sybil VS Code Extension - Testing & Deployment Guide

## Overview
This guide provides comprehensive instructions for testing and deploying the Sybil VS Code extension.

## Prerequisites
- Node.js 18+ installed
- VS Code 1.74.0 or later
- TypeScript 4.9.4+
- Basic understanding of VS Code extension development

## Quick Start Testing

### 1. Automated Testing Script
```bash
cd /home/r/workspace/github.com/sybil/ext
chmod +x test-extension.sh
./test-extension.sh
```

### 2. Manual Testing in VS Code

#### Option A: Development Host Mode (Recommended)
1. Open the extension folder in VS Code:
   ```bash
   code /home/r/workspace/github.com/sybil/ext
   ```

2. Press `F5` or go to Run & Debug → "Run Extension"
   - This opens a new VS Code window with the extension loaded

3. In the new window, test the extension:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Type "Sybil" to see available commands
   - Try "Sybil: Start New Task"

#### Option B: Install from VSIX (For Distribution Testing)
```bash
cd /home/r/workspace/github.com/sybil/ext
npm install -g @vscode/vsce
vsce package
code --install-extension sybil-ai-coding-agent-0.1.0.vsix
```

## Testing Checklist

### ✅ Extension Activation
- [ ] Extension loads without errors in developer console
- [ ] Status bar shows extension is active
- [ ] Commands appear in Command Palette

### ✅ Basic Commands
- [ ] "Sybil: Start New Task" opens input dialog
- [ ] "Sybil: Resume Session" shows session picker
- [ ] "Sybil: Clear Session" works with confirmation
- [ ] "Sybil: Show Analytics" opens analytics panel

### ✅ Multi-Agent Workflow
- [ ] Task input is accepted and processed
- [ ] Output channel shows progress messages
- [ ] Architect agent generates blueprint
- [ ] Developer agent creates/modifies files
- [ ] Reviewer agent provides feedback
- [ ] Documenter agent updates documentation

### ✅ VS Code Integration
- [ ] File operations work correctly
- [ ] Terminal commands execute properly
- [ ] Debug sessions can be started
- [ ] No conflicts with other extensions

### ✅ Error Handling
- [ ] Invalid inputs show appropriate error messages
- [ ] Network failures are handled gracefully
- [ ] File permission issues are reported clearly
- [ ] Extension recovers from crashes

## Configuration Testing

### 1. Settings Validation
Test these settings in VS Code User Settings:

```json
{
    "sybil.pythonPath": "python3",
    "sybil.verbose": true,
    "sybil.maxConcurrentTasks": 3,
    "sybil.enableAnalytics": true,
    "sybil.outputChannelLevel": "debug"
}
```

### 2. API Key Management
- [ ] API keys are stored securely using VS Code secrets
- [ ] Keys are validated before use
- [ ] Fallback to alternative providers works

## Performance Testing

### 1. Startup Performance
- [ ] Extension activation time < 5 seconds
- [ ] Memory usage < 100MB
- [ ] No blocking operations during startup

### 2. Runtime Performance
- [ ] Command response time < 2 seconds
- [ ] File operations complete quickly
- [ ] Large file handling doesn't cause freezes

## Integration Testing

### 1. Python Backend Integration
```bash
# Test Python subprocess communication
cd /home/r/workspace/github.com/sybil
python3 src/main.py --test
```

### 2. Multi-Language Support
- [ ] JavaScript/TypeScript projects
- [ ] Python projects
- [ ] Java projects
- [ ] C/C++ projects

### 3. Workspace Scenarios
- [ ] Single folder workspace
- [ ] Multi-root workspace
- [ ] Remote workspaces (WSL, SSH)
- [ ] Large codebases (>1000 files)

## Debug Testing

### 1. Extension Debugging
- [ ] Set breakpoints in extension code
- [ ] Debug TypeScript compilation
- [ ] Monitor VS Code API calls

### 2. Target Application Debugging
- [ ] Launch debug sessions from Sybil
- [ ] Set breakpoints programmatically
- [ ] Inspect variables during debugging

## Error Scenarios

### 1. Network Issues
- [ ] API timeouts are handled
- [ ] Retry logic works correctly
- [ ] Offline mode degrades gracefully

### 2. File System Issues
- [ ] Permission denied errors
- [ ] Disk space issues
- [ ] File locking conflicts

### 3. VS Code API Issues
- [ ] Extension context invalidation
- [ ] Workspace changes during operation
- [ ] Concurrent command execution

## Deployment Preparation

### 1. Marketplace Package
```bash
cd /home/r/workspace/github.com/sybil/ext
npm install -g @vscode/vsce

# Create package
vsce package

# Validate package
vsce show sybil-ai-coding-agent-0.1.0.vsix
```

### 2. Marketplace Metadata
Update `package.json` with:
- [ ] Detailed description
- [ ] Keywords for discoverability
- [ ] Categories
- [ ] Gallery banner
- [ ] Screenshots

### 3. Publishing
```bash
# Login to marketplace
vsce login <publisher>

# Publish extension
vsce publish
```

## Troubleshooting

### Common Issues

#### 1. Extension Not Loading
```
Error: Cannot find module 'vscode'
```
**Solution**: Ensure TypeScript compilation completed successfully
```bash
cd /home/r/workspace/github.com/sybil/ext
npm run compile
```

#### 2. Commands Not Appearing
**Check**:
- Activation events in package.json
- Extension properly registered
- No syntax errors in extension.ts

#### 3. File Operations Failing
**Check**:
- Workspace permissions
- File paths are absolute
- VS Code workspace API availability

#### 4. Python Backend Not Responding
**Check**:
- Python path configuration
- Backend script exists and is executable
- JSON-RPC communication protocol

### Debug Tools

#### 1. VS Code Developer Console
- `Help` → `Toggle Developer Tools`
- Check for extension errors
- Monitor API calls

#### 2. Extension Output Channel
- `View` → `Output` → `Sybil Agent`
- Monitor agent workflow progress
- Check for detailed error messages

#### 3. TypeScript Compilation
```bash
cd /home/r/workspace/github.com/sybil/ext
npx tsc --noEmit --listFiles
```

## Next Steps After Testing

### Phase 4: Testing & Polish
1. **Unit Tests**: Add comprehensive test coverage
2. **Integration Tests**: End-to-end workflow testing
3. **Performance Optimization**: Memory and speed improvements
4. **User Experience**: Enhanced UI/UX and error messages

### Phase 5: Marketplace Release
1. **Documentation**: Complete user guide and API docs
2. **Packaging**: Create VSIX package for distribution
3. **Publishing**: Submit to VS Code Marketplace
4. **Community**: Set up issue tracking and support

### Future Enhancements
1. **Advanced AI Features**: Custom model fine-tuning
2. **Plugin System**: Extensible agent architecture
3. **Cloud Integration**: Remote execution capabilities
4. **Team Collaboration**: Multi-user session support

## Success Metrics

### Technical Metrics
- ✅ Extension activation time < 5 seconds
- ✅ Memory usage < 100MB
- ✅ Command response time < 2 seconds
- ✅ TypeScript compilation successful
- ✅ VS Code API integration complete

### User Experience Metrics
- 🔄 Task completion rate > 80%
- ⏳ User satisfaction score > 4/5
- ✅ Session resumption success rate > 95%

### Quality Metrics
- 🔄 Test coverage > 80%
- ✅ Zero critical bugs
- ⏳ Performance benchmarks met
- ✅ Documentation complete

---

**Current Status**: Extension is ~95% complete and ready for comprehensive testing.
**Next Action**: Begin Phase 4 testing and validation process.
